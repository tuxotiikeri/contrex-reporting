import test from "node:test";
import assert from "node:assert/strict";
import {reportBarComparisons} from "../src/utils/reportBarComparisons.js";
import {reportRows} from "../src/utils/reportRows.js";
import {referenceValues} from "../src/data/referenceValues.js";

const left = {110: 260, 111: -140, 112: 240, 113: -120, 122: 200, 123: 90, 203: 3.25, 204: -1.75};
const right = {110: 220, 111: -130, 112: 200, 113: -110, 122: 180, 123: 100, 203: 2.75, 204: -1.625};

test("five report bars share the table's strongest peaks, normalized values and leg order", () => {
  const charts = reportBarComparisons("kons60", {left, right}, null, "right");
  assert.equal(charts.length, 5);
  assert.deepEqual(charts.map(c => c.unit), ["Nm", "Nm/kg", "Nm", "Nm/kg", "%"]);
  assert.deepEqual(charts[0].series.map(e => e.value), [260, 220]);
  assert.deepEqual(charts[1].series.map(e => e.value), [3.25, 2.75]);
  assert.deepEqual(charts[2].series.map(e => e.value), [140, 130]);
  assert.deepEqual(charts[0].series.map(e => e.side), ["left", "right"]);
  assert.deepEqual(reportBarComparisons("kons60", {left, right}, null, "left")[0].series.map(e=>e.side), ["right", "left"]);
});

test("kons60 and kons240 H/Q use average repetition peaks, not work or best peaks", () => {
  for (const key of ["kons60", "kons240"]) {
    const charts = reportBarComparisons(key, {left, right}, null, "right");
    assert.equal(charts[4].title, "HQ-suhde");
    assert.deepEqual(charts[4].series.map(e=>e.value), [50,55]);
  }
});

test("endurance H/Q stays work-based and matches the table even with a separate peak H/Q norm", () => {
  const ref = referenceValues["Miehet 20–29 vuotta (Liu et al. 2025)"];
  const charts = reportBarComparisons("kons180", {left, right}, ref, "right");
  const row = reportRows("kons180", {left, right}, ref, "right").find(r=>r.isHq);
  assert.equal(charts[4].series[0].value, Number(row.cells[1]));
  assert.equal(charts[4].series[0].value, 45);
  assert.equal(charts[4].series[1].value, Number(row.cells[3]));
  assert.equal(charts[4].interval, null);
});

test("eccentric report bars use the right muscles and mixed ratio against kons240", () => {
  const eccLeft = {...left, 110:-140, 111:260, 203:-1.75, 204:3.25};
  const eccRight = {...right, 110:-130, 111:220, 203:-1.625, 204:2.75};
  for (const key of ["eks30", "eks60"]) {
    const charts = reportBarComparisons(key, {left:eccLeft,right:eccRight}, null, "right", {kons240:{left,right}});
    assert.equal(charts[0].series[0].value, 260);
    assert.equal(charts[2].series[0].value, 140);
    assert.equal(charts[4].title, "Mixed ratio");
    assert.ok(Math.abs(charts[4].series[0].value - 100*140/260) < 0.1);
    assert.ok(Math.abs(charts[4].series[1].value - 100*130/220) < 0.1);
    assert.deepEqual(reportBarComparisons(key, {left:eccLeft,right:eccRight},null,"right")[4].series.map(e=>e.value),[null,null]);
  }
});

test("missing sides are never plotted as zero; applicable reference bands are retained", () => {
  const ref = referenceValues["Miehet jalkapallo, elite"];
  const charts = reportBarComparisons("kons60", {left}, ref, "right");
  assert.equal(charts[0].series[1].value, null);
  assert.equal(charts[4].series[1].value, null);
  assert.equal(charts[0].interval.mean, 239);
});
