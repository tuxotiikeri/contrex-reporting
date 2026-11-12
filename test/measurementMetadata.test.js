import test from "node:test";
import assert from "node:assert/strict";
import {measurementProtocol, measurementProtocolKey, normalizeSubjectSex, groupReportFiles} from "../src/utils/measurementMetadata.js";
import {resolveComparisonSides} from "../src/utils/comparisonSides.js";
import {isEccentricProtocol} from "../src/utils/reportMetricDefinitions.js";
import {reportRows} from "../src/utils/reportRows.js";

test("Finnish and English exports resolve to the same short protocol label and analysis key", () => {
  for (const [mode, aliases] of [["kons", ["kons", "Con", "CON", "concentric"]], ["eks", ["eks", "Ecc", "ECC", "eccentric"]]]) {
    for (const alias of aliases) {
      for (const speed of [30, 60, 180, 240, 300]) {
        const raw = {configuration: {program: [63, `Isokinetic ballistic ${alias}/${alias}`], speed: [speed, speed]}};
        assert.equal(measurementProtocol(raw).label, `${mode} ${speed}`);
        assert.equal(measurementProtocolKey(raw), `${mode}${speed}`);
        assert.equal(measurementProtocolKey(`${alias}/${alias} ${speed}/${speed}`), `${mode}${speed}`);
        assert.equal(measurementProtocolKey(`${mode}${speed}`), `${mode}${speed}`);
      }
    }
  }
  assert.equal(measurementProtocolKey("Left Knee Ext/Flex 500 Nm Isokinetic ballistic Con/Con 60/60 Measurement 3 repet."), "kons60");
  assert.equal(measurementProtocolKey("oj/kouk 500 Nm isokin. ballistinen kons/kons 60/60"), "kons60");
  assert.equal(measurementProtocolKey("CPM/Ecc 30/300"), null);
  assert.equal(measurementProtocolKey("Con/Ecc 60/30"), null);
  assert.equal(measurementProtocolKey("Con/Con 60/180"), null);
  assert.equal(measurementProtocolKey("unknown"), null);
  assert.equal(measurementProtocolKey(null), null);
});

test("a missing leg is a dash rather than NaN in the report's ratio row", () => {
  const rows = reportRows("kons60", {left: {110: 200, 111: -100, 112: 190, 113: -95}}, null, null);
  const ratio = rows.find(row => row.isHq);
  assert.equal(ratio.cells[1], "–");
  assert.equal(Number(ratio.cells[3]), 50);
});

test("sex metadata is normalized from English/Finnish names or CON-TREX numeric codes", () => {
  for (const value of [[1, "Male"], "MALE", "Mies", 1, "1"]) assert.equal(normalizeSubjectSex(value), "Mies");
  for (const value of [[2, "Female"], "female", "Nainen", 2, "2"]) assert.equal(normalizeSubjectSex(value), "Nainen");
  assert.equal(normalizeSubjectSex([2, ""]), "Nainen");
  assert.equal(normalizeSubjectSex("Other"), "Muu");
  assert.equal(normalizeSubjectSex(undefined), "");
  assert.equal(normalizeSubjectSex("Unknown"), "");
});

test("PDF table groups and hidden chart keys agree for English exports without Finnish titles", () => {
  const supported = ["kons60", "kons240", "eks30", "kons180"];
  const files = [["Con", 60], ["Con", 240], ["Ecc", 30], ["Con", 180]].flatMap(([mode, speed]) => ["left", "right"].map(side => ({
    legSide: side, measurementType: `Knee Ext/Flex Isokinetic ballistic ${mode}/${mode} ${speed}/${speed}`,
    rawObject: {configuration: {program: [63, `Isokinetic ballistic ${mode}/${mode}`], speed: [speed, speed], side: [side === "left" ? 1 : 0, side]},
      measurement: {name: "Any custom measurement name"}, analysis: {110: side === "left" ? 250 : 270, 111: -140}},
  })));
  const before = structuredClone(files);
  const groups = groupReportFiles(files, supported);
  assert.deepEqual(Object.keys(groups), supported);
  for (const key of supported) {
    assert.equal(groups[key].left[110], 250);
    assert.equal(groups[key].right[110], 270);
    assert.equal(groups[key].left[111], -140);
  }
  assert.equal(resolveComparisonSides(null, files).referenceSide, "right");
  const eccentric = files.find(file => measurementProtocolKey(file) === "eks30");
  assert.equal(isEccentricProtocol(eccentric.rawObject), true);
  assert.deepEqual(files, before);
});
