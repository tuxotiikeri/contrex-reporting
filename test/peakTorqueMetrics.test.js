import test from "node:test";
import assert from "node:assert/strict";
import {greatestMagnitudePeak, peakTorqueMetrics} from "../src/utils/peakTorqueMetrics.js";
import {reportRows} from "../src/utils/reportRows.js";
import {peakComparisons} from "../src/utils/peakComparisons.js";

test("largest single peak is independent of channel, sign, repetition order or protocol", () => {
  for (const peaks of [[120, 140], [140, 120], [-120, -140], [-140, -120], [120, -140]]) {
    assert.equal(Math.abs(greatestMagnitudePeak(peaks)), 140);
  }
  assert.equal(greatestMagnitudePeak([-120, -140]), -140);
  assert.equal(greatestMagnitudePeak([]), undefined);
  assert.equal(greatestMagnitudePeak([undefined, NaN, Infinity]), undefined);
  assert.equal(greatestMagnitudePeak([0]), 0);
});

test("Nm/kg derives from the exact same strongest peak in both channels", () => {
  const eccentric = peakTorqueMetrics({torquePeak1: [-120, -140], torquePeak2: [240, 260]}, 80);
  assert.deepEqual(eccentric, {110: -140, 111: 260, 203: -1.75, 204: 3.25});
  const concentric = peakTorqueMetrics({torquePeak1: [240, 260], torquePeak2: [-120, -140]}, 80);
  assert.deepEqual(concentric, {110: 260, 111: -140, 203: 3.25, 204: -1.75});
  assert.equal(peakTorqueMetrics({torquePeak1: [100], torquePeak2: [-50]}, 0)[203], undefined);
});

test("report, bars and torque/BW symmetry consume the same corrected eccentric peaks", () => {
  const left = peakTorqueMetrics({torquePeak1: [-120, -140], torquePeak2: [240, 260]}, 80);
  const right = peakTorqueMetrics({torquePeak1: [-110, -130], torquePeak2: [200, 220]}, 80);
  for (const protocol of ["eks30", "eks60"]) {
    const rows = reportRows(protocol, {left, right}, null, "right");
    const torque = rows.filter(row => row.cells[0] === "Huippuvääntö (Nm)");
    const bw = rows.filter(row => row.cells[0] === "Huippuvääntö (Nm / kg)");
    assert.equal(Number(torque[0].cells[1]), 260);
    assert.equal(Number(torque[0].cells[3]), 220);
    assert.equal(Number(torque[1].cells[1]), 140);
    assert.equal(Number(torque[1].cells[3]), 130);
    assert.ok(Math.abs(Number(torque[0].cells[4]) - 100 * 220 / 260) < 0.1);
    assert.ok(Math.abs(Number(torque[1].cells[4]) - 100 * 130 / 140) < 0.1);
    assert.equal(torque[0].cells[4], bw[0].cells[4]);
    assert.equal(torque[1].cells[4], bw[1].cells[4]);
    const files = [{legSide:"left",rawObject:{programType:protocol,analysis:left}}, {legSide:"right",rawObject:{programType:protocol,analysis:right}}];
    const qBars = peakComparisons(files, null, "quadriceps");
    const hBars = peakComparisons(files, null, "hamstrings");
    assert.deepEqual(qBars[0].series.map(item => item.value), [260, 220]);
    assert.deepEqual(qBars[1].series.map(item => item.value), [260 / 80, 220 / 80]);
    assert.deepEqual(hBars[0].series.map(item => item.value), [140, 130]);
  }
});

test("excluded repetitions cannot contribute a peak and absent channels do not become zero", () => {
  const remaining = peakTorqueMetrics({torquePeak1: [-120], torquePeak2: [240]}, 80);
  assert.equal(remaining[110], -120);
  assert.equal(remaining[111], 240);
  const empty = peakTorqueMetrics({torquePeak1: [], torquePeak2: []}, 80);
  assert.equal(empty[110], undefined);
  assert.equal(empty[203], undefined);
});
