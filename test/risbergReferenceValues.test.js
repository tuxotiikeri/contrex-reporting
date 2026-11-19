import test from "node:test";
import assert from "node:assert/strict";
import {referenceValues} from "../src/data/referenceValues.js";
import {reportRows} from "../src/utils/reportRows.js";
import {reportReferenceSource} from "../src/utils/reportExport.js";
import {peakComparisons} from "../src/utils/peakComparisons.js";
import {reportBarComparisons} from "../src/utils/reportBarComparisons.js";
import {translate} from "../src/i18n/catalog.js";

const refs = referenceValues["Naiset jalkapallo, elite"];
const group = {
  right: {110: 149, 111: -83.8, 112: 149, 113: -83.8, 203: 149 / 64, 204: -83.8 / 64},
  left: {110: 145, 111: -92.5, 112: 145, 113: -92.5, 203: 145 / 64, 204: -92.5 / 64},
};

test("female elite football con60 uses Risberg Table 2 dominant-leg means and participant SDs", () => {
  assert.deepEqual(refs.metrics.kons60, {
    torqueExt: {mean: 147.7, sd: 23.5}, bwExt: {mean: 2.33, sd: 0.35},
    torqueFlex: {mean: 87.4, sd: 13.6}, bwFlex: {mean: 1.38, sd: 0.21}, hq: {mean: 59.6, sd: 7.5},
  });
  assert.deepEqual(refs.metrics.kons300.torqueExt, {mean: 83, sd: 12});
  assert.deepEqual(refs.metrics.eks30.mixedRatio, {minimum: 100, maximum: 130});
});

test("reported example no longer fails absolute torque reference, with identical norms for both legs", () => {
  const rows = reportRows("kons60", group, refs, "oikea");
  const peaks = rows.filter(row => row.cells?.[0] === "Huippuvääntö (Nm)");
  assert.equal(peaks[0].cells[5], "147.7 ± 23.5");
  assert.equal(peaks[1].cells[5], "87.4 ± 13.6");
  assert.equal(peaks[0].referenceStatus, "warning"); // 145: below mean, within one SD
  assert.equal(peaks[0].involvedStatus, "none");
  assert.equal(peaks[1].referenceStatus, "none");
  assert.equal(peaks[1].involvedStatus, "warning");
  const bars = reportBarComparisons("kons60", group, refs, "oikea");
  assert.ok(Math.abs(bars[0].interval.lower - 124.2) < 1e-9);
  assert.equal(bars[2].reference.sd, 13.6);
  const files = Object.entries(group).map(([legSide, analysis]) => ({legSide, rawObject: {programType: "kons 60", analysis}}));
  const screenBars = peakComparisons(files, refs, "quadriceps");
  assert.deepEqual(screenBars[0].reference, bars[0].reference);
  assert.deepEqual(screenBars[1].reference, bars[1].reference);
});

test("report citations select Risberg only for con60 and retain van Melick for other protocols", () => {
  const con60 = reportReferenceSource(refs, undefined, ["kons60"]);
  assert.match(con60, /Risberg.*n=196.*10\.1519\/JSC\.0000000000002579/);
  assert.doesNotMatch(con60, /van Melick/);
  const con300 = reportReferenceSource(refs, undefined, ["kons300"]);
  assert.match(con300, /van Melick.*10\.2519\/jospt\.2022\.10693/);
  assert.doesNotMatch(con300, /Risberg/);
  const mixed = reportReferenceSource(refs, undefined, ["kons60", "kons300", "kons60"]);
  assert.equal(mixed.match(/Risberg/g).length, 1);
  assert.equal(mixed.match(/van Melick/g).length, 1);
  assert.match(reportReferenceSource(refs, text => translate(text, "en"), ["kons60"]), /dominant-leg reference/);
});
