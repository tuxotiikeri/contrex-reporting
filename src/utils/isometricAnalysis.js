import {isometricProtocol} from "./measurementMetadata.js";

export const ISOMETRIC_METHOD = Object.freeze({baselineSeconds: 0.5, noiseSDs: 3, minimumThresholdNm: 0.5, sustainSeconds: 0.02, windowSeconds: 5});
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const sd = (values, average) => Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / Math.max(1, values.length - 1));
export const isometricFileKey = file => [file.sessionId, file.name, file.rawObject.measurement?.["date(dd/mm/yyyy)"], file.rawObject.measurement?.["time(hh/mm/ss)"]].join("|");

export function interpolateSample(points, index) {
  if (index < 0 || index > points.length - 1) return null;
  const first = Math.floor(index), last = Math.ceil(index);
  if (!Number.isFinite(points[first]) || !Number.isFinite(points[last])) return null;
  return points[first] + (points[last] - points[first]) * (index - first);
}

// Maffiuletti et al. 2016, DOI 10.1007/s00421-016-3346-6: low-noise
// baseline-relative onset and cumulative RTD windows. The 0.5 Nm floor and
// 20 ms confirmation are this application's documented engineering choices,
// not claimed to be a universally validated onset definition.
export function analyzeIsometric(raw, manualOnsetIndex = null) {
  const protocol = isometricProtocol(raw);
  const fs = Number(Array.isArray(raw.measurement?.samplingrate) ? raw.measurement.samplingrate[0] : raw.measurement?.samplingrate);
  const markers = raw.markersByIndex?.move1;
  const issues = [];
  const result = {protocol, sampleRate: fs, issues, onsetIndex: null, onsetSource: "auto", peak: null, peakPerKg: null, torqueAt: {}, rtd: {}, points: []};
  if (!protocol || !(fs > 0) || !Array.isArray(markers) || markers.length !== 2 || !(markers[1] > markers[0])) {
    issues.push("Isometrisen mittauksen jaksoa ei voitu tunnistaa.");
    return result;
  }
  const start = Math.max(0, Math.round(markers[0]));
  const end = Math.min(raw.data.length, Math.round(markers[1])); // exclusive
  Object.assign(result, {start, end, duration: (end - start) / fs});
  // In static trials the recorded torque, not the selected device program,
  // determines the muscle. Compare excursions from rest before rectification.
  const rawBaseline = mean(raw.data.slice(Math.max(0, start - Math.round(0.5 * fs)), start).map(row => row[0]));
  const rawSegment = raw.data.slice(start, end).map(row => row[0]);
  const positive = Math.max(...rawSegment) - rawBaseline;
  const negative = rawBaseline - Math.min(...rawSegment);
  const direction = positive >= negative ? "extension" : "flexion";
  result.protocol = {...protocol, configuredDirection: protocol.direction, direction};
  const sign = direction === "extension" ? 1 : -1;
  const signed = raw.data.map(row => sign * row[0]);
  const baseStart = start - Math.round(ISOMETRIC_METHOD.baselineSeconds * fs);
  if (baseStart < 0 || end <= start || !signed.slice(Math.max(0, baseStart), end).every(Number.isFinite)) {
    issues.push("Lepotasoa ei voitu määrittää.");
    return result;
  }
  const baselineValues = signed.slice(baseStart, start);
  const baseline = mean(baselineValues);
  const noise = sd(baselineValues, baseline);
  const threshold = Math.max(ISOMETRIC_METHOD.minimumThresholdNm, ISOMETRIC_METHOD.noiseSDs * noise);
  Object.assign(result, {baseline, noise, threshold});
  const segment = signed.slice(start, end);
  const peak = Math.max(...segment);
  const rise = peak - baseline;
  const reverse = baseline - Math.min(...segment);
  const mixedDirections = reverse > 10 && reverse > rise * 0.5;
  if (mixedDirections) issues.push("Mittauksessa on merkittävä vääntö molempiin suuntiin; tarkista yritys.");
  {
    result.peak = peak;
    const weight = Number(raw.session?.subjectWeight);
    result.peakPerKg = weight > 0 ? peak / weight : null;
  }
  const half = Math.floor(baselineValues.length / 2);
  const early = baselineValues.slice(0, half), late = baselineValues.slice(half);
  // Estimate within-half noise: including a baseline shift in its own noise
  // estimate would make the instability test insensitive to that same shift.
  const withinNoise = Math.sqrt((sd(early, mean(early)) ** 2 + sd(late, mean(late)) ** 2) / 2);
  const unstable = Math.abs(mean(early) - mean(late)) > Math.max(3 * withinNoise, 1);
  if (unstable) issues.push("Lepotaso on epävakaa.");
  let autoOnset = null;
  const sustain = Math.max(2, Math.ceil(ISOMETRIC_METHOD.sustainSeconds * fs));
  if (rise >= Math.max(5, threshold * 5)) {
    let count = 0;
    for (let i = start; i < end; i++) {
      count = signed[i] > baseline + threshold ? count + 1 : 0;
      if (count >= sustain) {autoOnset = i - count + 1; break;}
    }
  }
  result.autoOnsetIndex = autoOnset;
  if (manualOnsetIndex != null) {
    result.onsetSource = "manual";
    if (Number.isInteger(manualOnsetIndex) && manualOnsetIndex >= start && manualOnsetIndex < end) result.onsetIndex = manualOnsetIndex;
    else issues.push("Valittu alkukohta on mittausjakson ulkopuolella.");
  } else result.onsetIndex = autoOnset;
  if (result.onsetIndex == null) {
    issues.push("Voimantuoton alkukohtaa ei tunnistettu.");
    return result;
  }
  const onset = result.onsetIndex;
  const before = signed.slice(Math.max(baseStart, onset - Math.round(0.2 * fs)), onset);
  const counterMovement = before.some(value => value < baseline - Math.max(2, threshold));
  if (counterMovement) issues.push("Vääntö laskee lepotason alle ennen nousua; tarkista RTD.");
  // Peak and trace retain the gravity-corrected amplitudes. Baseline is used
  // for detection, not silently subtracted from the whole measurement.
  const last = Math.min(end - 1, onset + Math.floor(ISOMETRIC_METHOD.windowSeconds * fs));
  result.points = Array.from({length: Math.max(0, last - onset + 1)}, (_, i) => ({time: i / fs, torque: signed[onset + i]}));
  result.availableSeconds = (last - onset) / fs;
  const eligible = !mixedDirections && !unstable && !counterMovement;
  for (const ms of [50, 100, 200]) {
    const target = onset + fs * ms / 1000;
    const torque = target <= end - 1 ? interpolateSample(signed, target) : null;
    result.torqueAt[ms] = torque;
    result.rtd[ms] = eligible && torque != null ? (torque - signed[onset]) / (ms / 1000) : null;
  }
  return result;
}

export function isometricSeries(files, onsets = {}) {
  return files.map(file => ({file, key: isometricFileKey(file), result: analyzeIsometric(file.rawObject, onsets[isometricFileKey(file)] ?? null)}));
}

// LSI is only paired when exactly one valid trial from each leg is selected.
// Multiple trials stay independent, rather than implying an arbitrary pair.
export function isometricLsi(series, involvedSide) {
  if (!["left", "right"].includes(involvedSide)) return [];
  if (series.filter(s => s.file.legSide === "left").length !== 1 || series.filter(s => s.file.legSide === "right").length !== 1) return [];
  const left = series.filter(s => s.file.legSide === "left" && s.result.points.length && !s.result.issues.length);
  const right = series.filter(s => s.file.legSide === "right" && s.result.points.length && !s.result.issues.length);
  if (left.length !== 1 || right.length !== 1) return [];
  const involved = (involvedSide === "left" ? left : right)[0].result;
  const reference = (involvedSide === "left" ? right : left)[0].result;
  const step = 1 / Math.min(involved.sampleRate, reference.sampleRate);
  const lastTime = Math.min(involved.availableSeconds, reference.availableSeconds, 5);
  const clusters = [];
  const involvedPoints = involved.points.map(p => p.torque);
  const referencePoints = reference.points.map(p => p.torque);
  let cluster = null;
  for (let time = 0; time <= lastTime + 1e-9; time += step) {
    const a = interpolateSample(involvedPoints, time * involved.sampleRate);
    const b = interpolateSample(referencePoints, time * reference.sampleRate);
    const different = a != null && b > 5 && a > 5 && Math.abs(100 * a / b - 100) > 10;
    if (different && !cluster) cluster = {start: time, end: time};
    if (different) cluster.end = time;
    if ((!different || time + step > lastTime) && cluster) {
      if (cluster.end - cluster.start >= 0.05) clusters.push(cluster);
      cluster = null;
    }
  }
  return clusters;
}
