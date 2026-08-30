import test from "node:test";
import assert from "node:assert/strict";
import {mixedRatio, reportMetricIndices} from "../src/utils/reportMetricDefinitions.js";
import {symmetryPercent} from "../src/utils/numberUtils.js";

test("concentric report compares the same muscle index between right and left", () => {
  const indices = reportMetricIndices("kons60");
  assert.deepEqual(indices.quadriceps, {torque: 110, bw: 203, averageWork: 122, totalWork: 212});
  assert.deepEqual(indices.hamstrings, {torque: 111, bw: 204, averageWork: 123, totalWork: 213});
});

test("eccentric report maps flexion to quadriceps and extension to hamstrings", () => {
  const indices = reportMetricIndices("eks30");
  assert.deepEqual(indices.quadriceps, {torque: 111, bw: 204, averageWork: 123, totalWork: 213});
  assert.deepEqual(indices.hamstrings, {torque: 110, bw: 203, averageWork: 122, totalWork: 212});
});

test("mixed ratio uses eccentric hamstrings divided by concentric quadriceps", () => {
  assert.equal(mixedRatio(134, 161).toFixed(1), "83.2");
  assert.ok(Number.isNaN(mixedRatio(134, 0)));
});

test("Rehnberg-like right-leg LSI compares right and left values of the same metric", () => {
  assert.equal(symmetryPercent(250, 269, "oikea"), "92.9");
  assert.equal(symmetryPercent(154, 161, "oikea"), "95.6");
});
