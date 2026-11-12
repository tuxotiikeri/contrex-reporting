import {reportMetricIndices, hqRatioFromChannels, movementChannelMetricIndices} from "./reportMetricDefinitions.js";
import {measurementProtocolKey} from "./measurementMetadata.js";

export function referenceInterval(reference) {
  if (!reference) return null;
  if (Number.isFinite(reference.mean)) {
    const sd = Number.isFinite(reference.sd) ? Math.abs(reference.sd) : 0;
    return {mean: reference.mean, lower: Math.max(0, reference.mean - sd), upper: reference.mean + sd, hasSpread: sd > 0};
  }
  if (Number.isFinite(reference.minimum)) {
    const upper = Number.isFinite(reference.maximum) ? reference.maximum : reference.minimum;
    return {mean: reference.minimum, lower: reference.minimum, upper, hasSpread: upper > reference.minimum};
  }
  return null;
}

// Read the same selected measurement series and muscle indices as the curves.
// Keep repeated same-leg measurements separate; never silently pick one of them.
export function peakComparisons(files, referenceSet, muscle) {
  const refs = referenceSet?.metrics?.[measurementProtocolKey(files[0])];
  const sideCounts = files.reduce((counts, file) => ({...counts, [file.legSide]: (counts[file.legSide] ?? 0) + 1}), {});
  const definitions = muscle === "hq"
    ? [{label: refs?.hqPeak ? "Huippuväännön HQ-suhde" : "HQ-suhde", unit: "%", decimals: 1,
      reference: refs?.hqPeak ?? refs?.hq, ratioMetric: refs?.hqPeak ? "torque" : "meanPeak"}]
    : [{label: "Huippuvääntö", unit: "Nm", metric: "torque", decimals: 0, reference: refs?.[muscle === "quadriceps" ? "torqueExt" : "torqueFlex"]},
      {label: "Huippuvääntö / kg", unit: "Nm/kg", metric: "bw", decimals: 2, reference: refs?.[muscle === "quadriceps" ? "bwExt" : "bwFlex"]}];
  return definitions.map(definition => ({...definition, interval: referenceInterval(definition.reference),
    series: files.map(file => {
      const raw = file.rawObject;
      let value;
      if (muscle === "hq") {
        const channels = movementChannelMetricIndices(definition.ratioMetric);
        value = 100 * hqRatioFromChannels(raw.analysis?.[channels.Ext], raw.analysis?.[channels.Flex], raw);
      } else {
        value = raw.analysis?.[reportMetricIndices(raw)[muscle][definition.metric]];
      }
      return {side: file.legSide, color: file.baseColor ?? (file.legSide === "left" ? "#ef6470" : "#00c850"),
        value: Number.isFinite(value) ? Math.abs(value) : null,
        date: sideCounts[file.legSide] > 1 ? String(raw.measurement?.["date(dd/mm/yyyy)"] ?? "") : ""};
    }),
  }));
}

export function comparisonScale(chart) {
  const highest = Math.max(0, chart.interval?.upper ?? 0, ...chart.series.map(item => item.value ?? 0));
  const target = (highest || 1) * 1.2;
  const magnitude = 10 ** Math.floor(Math.log10(target / 3));
  const step = [1, 2, 5, 10].map(value => value * magnitude).find(value => target / value <= 4);
  const max = Math.ceil(target / step) * step;
  return {max, ticks: Array.from({length: Math.round(max / step) + 1}, (_, index) => index * step)};
}
