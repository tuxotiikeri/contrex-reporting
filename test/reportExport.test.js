import test from "node:test";
import assert from "node:assert/strict";
import {decodeMeasurementBuffer, readMeasurementFile} from "../src/utils/measurementText.js";
import {reportFilename, reportChartSize, reportReferenceSource} from "../src/utils/reportExport.js";
import {referenceValues} from "../src/data/referenceValues.js";
import {translate} from "../src/i18n/catalog.js";

test("CTM/CXP names retain Nordic letters in legacy Windows and modern UTF-8 exports", async () => {
  const text = "[Session]\r\nsubject-name-first\tÅsa\r\nsubject-name\tÄäkkönen\r\n";
  const legacy = Uint8Array.from([...text].map(c => c.charCodeAt(0)));
  assert.equal(decodeMeasurementBuffer(legacy.buffer), text);
  assert.equal(decodeMeasurementBuffer(new TextEncoder().encode(text).buffer), text);
  assert.equal(decodeMeasurementBuffer(new TextEncoder().encode("\ufeff" + text).buffer), text);
  assert.equal(await readMeasurementFile(new Blob([legacy])), text);
  assert.equal(await readMeasurementFile(new Blob([text])), text);
  assert.equal(decodeMeasurementBuffer(Uint8Array.from([0xc4, 0xe4, 0xd6, 0xf6, 0xc5, 0xe5]).buffer), "ÄäÖöÅå");
});

test("UTF-16 exports with a BOM are decoded without changing angle/torque columns", () => {
  const text = "Ääkkönen\t-6.5\t123.4";
  const le = new Uint8Array(2 + text.length * 2);
  le.set([0xff, 0xfe]);
  [...text].forEach((c, i) => {le[i * 2 + 2] = c.charCodeAt(0) & 255; le[i * 2 + 3] = c.charCodeAt(0) >> 8;});
  assert.equal(decodeMeasurementBuffer(le.buffer), text);
});

test("report names use name or ID, preserve accents, and follow pp_kkvvvv", () => {
  assert.equal(reportFilename({subjectNameFirst: "Åsa", subjectName: "Ääkkönen", subjectId: "ID1"}, "16.6.2026"),
    "Åsa-Ääkkönen_isokineettinen_16_062026.pdf");
  assert.equal(reportFilename({subjectId: "XXX016"}, "2026-06-16"), "XXX016_isokineettinen_16_062026.pdf");
  assert.equal(reportFilename({subjectName: "O\u0308ster / Test"}, "16/06/2026"), "Öster---Test_isokineettinen_16_062026.pdf");
  assert.equal(reportFilename({}, ""), "contrex-reporting_isokineettinen_mittaus.pdf");
});

test("chart pixels are bounded by the actual 95 mm print size at 300 dpi", () => {
  assert.deepEqual(reportChartSize(1200, 800), {width: 1122, height: 748});
  assert.deepEqual(reportChartSize(3600, 2400), {width: 1122, height: 748});
});

test("reference footer uses actual selected source, sample size, DOI and language", () => {
  const liu = referenceValues["Miehet 20–29 vuotta (Liu et al. 2025)"];
  assert.equal(reportReferenceSource(liu), "Liu et al. (2025), n=323, 20–29 vuotta. DOI: 10.3389/fbioe.2025.1573267");
  assert.match(reportReferenceSource(liu, text => translate(text, "en")), /aged 20–29 years/);
  assert.match(reportReferenceSource(referenceValues["Miehet jalkapallo, elite"]), /DOI: 10.2519\/jospt.2022.10693/);
  assert.match(reportReferenceSource(referenceValues["Alppihiihto miehet, elite (kaikki lajit)"]), /DOI: 10.1055\/a-0850-0016/);
  assert.match(reportReferenceSource(referenceValues["Miehet maantiepyöräily, kilpailutaso (tutkimusviite)"]), /DOI: 10.4100\/jhse.2012.8.Proc2.03/);
  assert.equal(reportReferenceSource(null), null);
  assert.equal(reportReferenceSource({source: "Not available", metrics: {}}), null);
});
