import test from "node:test";
import assert from "node:assert/strict";
import {liuReferenceValues} from "../src/data/liuReferenceValues.js";
import {referenceValues, referenceValueOptions} from "../src/data/referenceValues.js";
import {reportRows, reportLegLabels} from "../src/utils/reportRows.js";
import {resolveComparisonSides} from "../src/utils/comparisonSides.js";
import {translate} from "../src/i18n/catalog.js";

const male = liuReferenceValues["Miehet 20–29 vuotta (Liu et al. 2025)"];
const data = {110: 200, 111: -100, 112: 190, 113: -90, 114: 57, 115: 41,
  122: 180, 123: 80, 203: 2.5, 204: -1.25, 212: 3600, 213: 1600};

test("Liu categories append to the existing selector with both protocols and translations", () => {
  const entries = Object.entries(liuReferenceValues);
  assert.equal(entries.length, 10);
  assert.deepEqual(referenceValueOptions.slice(-10), entries.map(([key]) => key));
  assert.equal(entries.reduce((n, [, ref]) => n + ref.sampleSize, 0), 2208);
  for (const [key, ref] of entries) {
    assert.equal(referenceValues[key], ref);
    assert.notEqual(translate(key, "en"), key);
    assert.notEqual(translate(ref.source, "en"), ref.source);
    assert.deepEqual(Object.keys(ref.metrics), ["kons60", "kons180"]);
    for (const metrics of Object.values(ref.metrics)) {
      for (const pair of Object.values(metrics)) {
        assert.ok(Number.isFinite(pair.mean));
        assert.ok(Number.isFinite(pair.sd) && pair.sd >= 0);
      }
      assert.equal(metrics.workExt, undefined);
      assert.equal(metrics.workFlex, undefined);
    }
  }
});

test("BW mean and SD are converted from the source's percentage scale exactly once", () => {
  assert.deepEqual(male.metrics.kons60.bwExt, {mean: 2.5061, sd: 0.5064});
  assert.deepEqual(male.metrics.kons60.bwFlex, {mean: 1.24, sd: 0.3486});
  assert.deepEqual(male.metrics.kons180.bwExt, {mean: 1.5883, sd: 0.4577});
  assert.deepEqual(male.metrics.kons60.averageWorkExt, {mean: 187.95, sd: 41.1});
  assert.deepEqual(male.metrics.kons180.averageWorkFlex, {mean: 53.4, sd: 22.91});
});

test("angle norms are displayed without a symmetry bar, LSI or status", () => {
  for (const protocol of ["kons60", "kons180"]) {
    const rows = reportRows(protocol, {right: data, left: {...data, 114: 30}}, male, "right", {}, {includeDetails: true});
    const angles = rows.filter(row => row.cells[0] === "Kulma huippuväännössä (°)");
    assert.equal(angles.length, 2);
    for (const row of angles) {
      assert.notEqual(row.cells[5], "–");
      assert.equal(row.cells[4], "–");
      assert.ok(Number.isNaN(row.symmetry));
      assert.equal(row.noStatus, true);
      assert.equal(row.noBar, true);
      assert.equal(row.referenceStatus, "none");
      assert.equal(row.involvedStatus, "none");
    }
  }
});

test("180 peak H/Q reference is not applied to endurance work H/Q or total work", () => {
  const rows = reportRows("kons180", {right: data, left: data}, male, "right", {}, {includeDetails: true});
  const peak = rows.find(row => row.cells[0] === "Huippuväännön HQ-suhde (%)");
  assert.equal(Number(peak.cells[1]), 50);
  assert.equal(peak.cells[5], "55.8 ± 13.99");
  const work = rows.find(row => row.cells[0] === "HQ-ratio (%)");
  assert.equal(work.cells[5], "–");
  assert.ok(Math.abs(Number(work.cells[1]) - 100 * 80 / 180) < 0.1);
  assert.ok(rows.filter(row => row.cells[0] === "Kokonaistyö (J)").every(row => row.cells[5] === "–"));
});

test("report names follow the same reference-first order as their values in both languages", () => {
  for (const involved of ["right", "left"]) {
    const labels = reportLegLabels(involved);
    const rows = reportRows("kons60", {right: data, left: {...data, 110: 270}}, null, involved);
    const peak = rows.find(row => row.cells[0] === "Huippuvääntö (Nm)");
    assert.deepEqual(labels, involved === "right" ? {reference: "Vasen", involved: "Oikea"} : {reference: "Oikea", involved: "Vasen"});
    assert.equal(Number(peak.cells[1]), involved === "right" ? 270 : 200);
    assert.equal(Number(peak.cells[3]), involved === "right" ? 200 : 270);
    assert.equal(translate(labels.involved, "en"), involved === "right" ? "Right" : "Left");
  }
  for (const stronger of ["right", "left"]) {
    const files = ["right", "left"].map(side => ({legSide: side, rawObject: {
      programType: "kons/kons 60/60", analysis: {110: side === stronger ? 300 : 270},
    }}));
    const comparison = resolveComparisonSides(null, files);
    assert.equal(comparison.referenceSide, stronger);
    assert.equal(reportLegLabels(comparison.involvedSide).reference, stronger === "left" ? "Vasen" : "Oikea");
  }
});
