import test from "node:test";
import assert from "node:assert/strict";
import {peakComparisons, referenceInterval, comparisonScale} from "../src/utils/peakComparisons.js";
import {referenceValues} from "../src/data/referenceValues.js";

const file = (side, protocol = "kons 60") => ({legSide: side, baseColor: side === "left" ? "red" : "green",
  rawObject: {programType: protocol, measurement: {"date(dd/mm/yyyy)": "12.11.2026"},
    analysis: {110: 300, 111: -150, 112: 280, 113: -120, 203: 4, 204: -2}}});

test("peak bars use individual maximum peaks and normalized values, not mean peaks", () => {
  const files = [file("left"), file("right")];
  const before = structuredClone(files);
  const q = peakComparisons(files, referenceValues["Miehet jalkapallo, elite"], "quadriceps");
  assert.deepEqual(q[0].series.map(item => item.value), [300, 300]);
  assert.deepEqual(q[1].series.map(item => item.value), [4, 4]);
  assert.deepEqual(q[0].series.map(item => item.color), ["red", "green"]);
  assert.equal(q[0].reference.mean, 239);
  assert.deepEqual(files, before);
});

test("eccentric bars use flexion for quadriceps and extension for hamstrings at both speeds", () => {
  const refs = referenceValues["Alppihiihto miehet, elite (kaikki lajit)"];
  for (const protocol of ["eks 30", "Ecc/Ecc 60/60"]) {
    const files = [file("left", protocol), file("right", protocol)];
    const q = peakComparisons(files, refs, "quadriceps");
    const h = peakComparisons(files, refs, "hamstrings");
    assert.equal(q[0].series[0].value, 150);
    assert.equal(q[1].series[0].value, 2);
    assert.equal(q[1].reference.mean, 4.27);
    assert.equal(h[0].series[0].value, 300);
    assert.equal(h[1].series[0].value, 4);
    assert.equal(h[1].reference.mean, 2.19);
    assert.equal(q[0].interval, null); // Do not invent absolute norms from BW norms.
  }
});

test("HQ uses mean peaks, or peak H/Q when explicitly comparing to a peak-ratio reference", () => {
  const files = [file("left"), file("right")];
  const hq = peakComparisons(files, null, "hq")[0];
  assert.ok(Math.abs(hq.series[0].value - 100 * 120 / 280) < 1e-10);
  assert.equal(hq.interval, null);
  const eccentric = peakComparisons([file("right", "eks 30")], null, "hq")[0];
  assert.ok(Math.abs(eccentric.series[0].value - 100 * 280 / 120) < 1e-10);
  const endurance = peakComparisons([file("right", "kons 180")], referenceValues["Miehet 20–29 vuotta (Liu et al. 2025)"], "hq")[0];
  assert.equal(endurance.series[0].value, 50);
  assert.equal(endurance.reference.mean, 55.8);
});

test("reference bands reflect mean ± SD, ranges or a minimum without zero substitution", () => {
  assert.deepEqual(referenceInterval({mean: 3, sd: 0.5}), {mean: 3, lower: 2.5, upper: 3.5, hasSpread: true});
  assert.deepEqual(referenceInterval({minimum: 100, maximum: 130}), {mean: 100, lower: 100, upper: 130, hasSpread: true});
  assert.equal(referenceInterval(undefined), null);
  assert.equal(referenceInterval({mean: NaN}), null);
  const chart = {series: [{value: 2}], interval: referenceInterval({mean: 4, sd: 1})};
  assert.ok(comparisonScale(chart).max >= 5);
  assert.equal(comparisonScale(chart).ticks[0], 0);
});

test("missing measurements remain absent, disabled/removed files do not leave extra bars", () => {
  const missing = file("left");
  delete missing.rawObject.analysis[203];
  const chart = peakComparisons([missing], null, "quadriceps");
  assert.equal(chart[0].series.length, 1);
  assert.equal(chart[1].series[0].value, null);
  assert.equal(peakComparisons([], null, "quadriceps")[0].series.length, 0);
});

test("same-leg repeat comparisons preserve all selected series, colours and dates", () => {
  const first = file("right");
  const second = file("right");
  second.baseColor = "blue";
  second.rawObject.measurement["date(dd/mm/yyyy)"] = "01.10.2026";
  const chart = peakComparisons([first, second], null, "quadriceps")[0];
  assert.deepEqual(chart.series.map(item => item.date), ["12.11.2026", "01.10.2026"]);
  assert.deepEqual(chart.series.map(item => item.color), ["green", "blue"]);
});
