import test from "node:test";
import assert from "node:assert/strict";
import {analyzeIsometric, isometricSeries, isometricLsi} from "../src/utils/isometricAnalysis.js";
import {isometricProtocol} from "../src/utils/measurementMetadata.js";

function trial({fs = 256, onset = 1, sign = 1, program = 8, slope = 500} = {}) {
  const start = fs, end = fs * 6;
  const data = Array.from({length: fs * 7}, (_, i) => [sign * (4 + Math.max(0, Math.min(1, (i - start) / fs - onset)) * slope), 0, -60]);
  return {configuration: {program: [program, program === 8 ? "isometrinen oj" : "isometrinen kouk"], position: -60},
    measurement: {samplingrate: [fs, "Hz"]}, markersByIndex: {move1: [start, end]}, session: {subjectWeight: 80}, data};
}

test("isometric metadata uses static position, not generic pattern or inherited speed", () => {
  const info = isometricProtocol("vasen polven oj/kouk 500 Nm isometrinen oj -60,0 Mittaus aika 5s tauko 120s");
  assert.equal(info.direction, "extension"); assert.equal(info.angle, 60);
  assert.equal(isometricProtocol(trial()).key, "isom60");
  assert.equal(isometricProtocol("kons/kons 60/60"), null);
});

test("measured torque determines the muscle, independently of selected device program", () => {
  for (const sign of [1, -1]) for (const program of [7, 8]) {
    const r = analyzeIsometric(trial({sign, program}));
    assert.equal(r.protocol.direction, sign === 1 ? "extension" : "flexion");
    assert.equal(r.peak, 504); assert.equal(r.peakPerKg, 504 / 80);
    for (const ms of [50, 100, 200]) assert.ok(Math.abs(r.rtd[ms] - 500) < 1e-8);
  }
});

test("onset alignment and interpolation preserve slopes at native sampling rate", () => {
  const a = analyzeIsometric(trial({onset: 1}));
  const b = analyzeIsometric(trial({onset: 1.5}));
  assert.equal((b.onsetIndex - a.onsetIndex) / a.sampleRate, 0.5);
  assert.deepEqual(a.points.slice(0, 200), b.points.slice(0, 200));
  assert.equal(a.points[0].time, 0);
  assert.equal(a.availableSeconds, (a.end - 1 - a.onsetIndex) / a.sampleRate);
  assert.ok(a.availableSeconds < 5); // no invented post-recording samples
});

test("raw amplitudes remain intact; manual onset changes RTD windows, not peak", () => {
  const raw = trial(), copy = structuredClone(raw);
  const auto = analyzeIsometric(raw), manual = analyzeIsometric(raw, auto.onsetIndex + 2);
  assert.deepEqual(raw, copy); assert.equal(manual.peak, auto.peak);
  assert.equal(manual.onsetSource, "manual"); assert.notEqual(manual.torqueAt[50], auto.torqueAt[50]);
  const invalid = analyzeIsometric(raw, raw.data.length);
  assert.equal(invalid.onsetIndex, null); assert.ok(invalid.issues.length);
});

test("move 1 bounds peak and onset analysis; later relaxation and stale max-power markers are ignored", () => {
  const raw = trial();
  const [start, end] = raw.markersByIndex.move1;
  raw.data[start - 200][0] = 5000;
  raw.data[end][0] = 7000;
  raw.markersByIndex.maxpowerstart = [end];
  raw.markersByIndex.maxpowerend = [start + 100];
  const r = analyzeIsometric(raw);
  assert.equal(r.peak, 504);
  assert.ok(r.onsetIndex >= start && r.onsetIndex < end);
  assert.equal(r.points.at(-1).time, (end - 1 - r.onsetIndex) / r.sampleRate);
});

test("isolated noise is not an onset and insufficient post-onset data is not padded", () => {
  const raw = trial(); raw.data[raw.markersByIndex.move1[0] + 5][0] = 6;
  const result = analyzeIsometric(raw);
  assert.ok(result.onsetIndex > raw.markersByIndex.move1[0] + 200);
  const late = analyzeIsometric(raw, raw.markersByIndex.move1[1] - 10);
  assert.equal(late.torqueAt[50], null); assert.equal(late.rtd[50], null);
  const missing = trial(); delete missing.markersByIndex.move1;
  assert.equal(analyzeIsometric(missing).points.length, 0);
});

test("countermovement and unstable baseline suppress RTD without losing peaks", () => {
  const raw = trial();
  raw.data[raw.markersByIndex.move1[0] + 240][0] = -2;
  const r = analyzeIsometric(raw);
  assert.equal(r.peak, 504); assert.equal(r.rtd[50], null); assert.ok(r.issues.some(i => i.includes("lepotason alle")));
  const drifting = trial();
  for (let i = 128; i < 192; i++) drifting.data[i][0] = -4;
  assert.ok(analyzeIsometric(drifting).issues.some(i => i.includes("epävakaa")));
});

test("individual files remain separate; LSI refuses arbitrary pairing of repeated trials", () => {
  const files = ["left", "right"].map((legSide, i) => ({name: `trial${i}`, sessionId: 1, legSide, rawObject: trial({slope: 500 + i * 150})}));
  const series = isometricSeries(files);
  assert.equal(series.length, 2); assert.ok(isometricLsi(series, "right").length > 0);
  assert.deepEqual(isometricLsi([...series, series[0]], "right"), []);
  assert.deepEqual(isometricLsi([...series, {...series[0], result: {...series[0].result, issues: ["invalid"]}}], "right"), []);
  assert.deepEqual(isometricLsi(series, null), []);
});
