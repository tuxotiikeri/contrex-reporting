import {reportMetricIndices} from "./reportMetricDefinitions.js";
import {reportLegOrder, reportRows} from "./reportRows.js";
import {referenceInterval} from "./peakComparisons.js";
import {colors} from "../data/seriesColors.js";

export function reportBarComparisons(testKey, group, referenceSet, involvedSide, allGroups = {}) {
  const order = reportLegOrder(involvedSide);
  const sides = [order.referenceSide, order.involvedSide];
  const indices = reportMetricIndices(testKey);
  const refs = referenceSet?.metrics?.[testKey];
  const metricCharts = ["quadriceps", "hamstrings"].flatMap(muscle => [
    {title: muscle === "quadriceps" ? "Etureisi" : "Takareisi", unit: "Nm", metric: "torque", decimals: 0,
      reference: refs?.[muscle === "quadriceps" ? "torqueExt" : "torqueFlex"], muscle},
    {title: muscle === "quadriceps" ? "Etureisi" : "Takareisi", unit: "Nm/kg", metric: "bw", decimals: 2,
      reference: refs?.[muscle === "quadriceps" ? "bwExt" : "bwFlex"], muscle},
  ]).map(chart => ({...chart, interval: referenceInterval(chart.reference), series: sides.map(side => {
    const value = group?.[side]?.[indices[chart.muscle][chart.metric]];
    return {side, color: colors[side][0], value: Number.isFinite(value) ? Math.abs(value) : null};
  })}));

  // Use the table's own ratio row, preserving its existing mean-peak H/Q,
  // endurance work H/Q and eccentric mixed-ratio definitions and missing data.
  const ratio = reportRows(testKey, group, referenceSet, involvedSide, allGroups)
    .find(row => row.isHq || row.cells?.[0] === "Mixed-ratio (%)");
  const reference = refs?.[ratio?.cells[0] === "Mixed-ratio (%)" ? "mixedRatio" : "hq"];
  return [...metricCharts, {title: ratio?.cells[0] === "Mixed-ratio (%)" ? "Mixed ratio" : "HQ-suhde", unit: "%", decimals: 1,
    reference, interval: referenceInterval(reference), series: sides.map((side, index) => {
      const cell = ratio?.cells[index === 0 ? 1 : 3];
      const value = cell != null && cell !== "–" ? Number(cell) : NaN;
      return {side, color: colors[side][0], value: Number.isFinite(value) ? value : null};
    })}];
}
