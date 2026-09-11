import test from "node:test";
import assert from "node:assert/strict";
import {mixedRatio, muscleCurveDirections, reportMetricIndices, isEccentricProtocol, hqRatioFromChannels} from "../src/utils/reportMetricDefinitions.js";
import {reportLegOrder, reportRows} from "../src/utils/reportRows.js";
import {referenceValues} from "../src/data/referenceValues.js";
import {setLanguage} from "../src/i18n/index.js";
import {symmetryMarkerPosition, symmetryStatusColor} from "../src/utils/symmetryScale.js";

test("eccentric FLEXION is quadriceps braking; EXTENSION is hamstrings braking", () => {
  assert.deepEqual(muscleCurveDirections("eks/eks 30/30"), {
    quadriceps: "Flex",
    hamstrings: "Ext",
  });
  assert.deepEqual(muscleCurveDirections({configuration: {program: [66, "isokin. ballistinen eks/eks"]}}), {
    quadriceps: "Flex",
    hamstrings: "Ext",
  });
});

test("concentric curves keep extension as quadriceps and flexion as hamstrings", () => {
  assert.deepEqual(muscleCurveDirections("kons/kons 60/60"), {
    quadriceps: "Ext",
    hamstrings: "Flex",
  });
});
import {symmetryPercent} from "../src/utils/numberUtils.js";

test("concentric report compares the same muscle index between right and left", () => {
  const indices = reportMetricIndices("kons60");
  assert.deepEqual(indices.quadriceps, {torque: 110, meanPeak: 112, bw: 203, averageWork: 122, totalWork: 212, workFatigue: 130, peakTorqueCV: 260, at200: 120, peakAngle: 114});
  assert.deepEqual(indices.hamstrings, {torque: 111, meanPeak: 113, bw: 204, averageWork: 123, totalWork: 213, workFatigue: 131, peakTorqueCV: 261, at200: 121, peakAngle: 115});
});

test("ALL eccentric metrics use Flex for quadriceps and Ext for hamstrings", () => {
  const indices = reportMetricIndices("eks30");
  assert.deepEqual(indices.quadriceps, {torque: 111, meanPeak: 113, bw: 204, averageWork: 123, totalWork: 213, workFatigue: 131, peakTorqueCV: 261, at200: 121, peakAngle: 115});
  assert.deepEqual(indices.hamstrings, {torque: 110, meanPeak: 112, bw: 203, averageWork: 122, totalWork: 212, workFatigue: 130, peakTorqueCV: 260, at200: 120, peakAngle: 114});
});

test("mixed ratio uses eccentric hamstrings divided by concentric quadriceps", () => {
  assert.equal(mixedRatio(134, 161).toFixed(1), "83.2");
  assert.ok(Number.isNaN(mixedRatio(134, 0)));
});

test("Rehnberg-like right-leg LSI compares right and left values of the same metric", () => {
  assert.equal(symmetryPercent(250, 269, "oikea"), "92.9");
  assert.equal(symmetryPercent(154, 161, "oikea"), "95.6");
});

test("Finnish and English protocol spellings resolve the same way without UI language", () => {
  for (const program of ['eks30', 'ecc30', 'ecc 30', 'ECC/ECC 30/30', 'Eksentrinen 30°/s', 'Eccentric 30°/s', 'eks/eks 30/30']) {
    assert.equal(isEccentricProtocol(program), true, program);
    for (const side of ['left', 'right']) {
      const raw = {programType: program, configuration: {side: [0, side]}};
      assert.deepEqual(muscleCurveDirections(raw), {quadriceps: 'Flex', hamstrings: 'Ext'});
      assert.equal(reportMetricIndices(raw).quadriceps.torque, 111);
    }
  }
  for (const program of ['kons60', 'kons180', 'kons240', 'con 60', 'con/con 60/60', 'Concentric 60°/s']) {
    assert.equal(isEccentricProtocol(program), false, program);
  }
});

test("eccentric H/Q is Ext/Flex, including when hamstrings happen to be stronger", () => {
  assert.equal(hqRatioFromChannels(80, -200, 'eks30'), 0.4);
  assert.equal(hqRatioFromChannels(80, -200, 'ecc 30'), 0.4);
  assert.equal(hqRatioFromChannels(200, -80, 'eks30'), 2.5);
  assert.equal(hqRatioFromChannels(200, -80, 'kons60'), 0.4);
  assert.ok(Number.isNaN(hqRatioFromChannels(80, 0, 'eks30')));
});

test("screenshot regression: actual PDF rows, reference matching, LSI and mixed ratio", () => {
  // Deliberately distinct sides and channels. Values transcribed from the
  // reported failure: the old report incorrectly called 84.8 Nm quadriceps.
  const group = {
    right: {110: 84.8, 111: -191, 112: 80, 113: -180, 203: 1.18, 204: -2.81, 122: 103, 123: 188},
    left: {110: 111, 111: -168, 112: 100, 113: -160, 203: 1.54, 204: -2.46, 122: 135, 123: 195},
  };
  const before = structuredClone(group);
  const refs = {metrics: {eks30: {torqueExt: {mean: 180, sd: 10}, torqueFlex: {mean: 80, sd: 10}}}};
  for (const locale of ['fi', 'en']) {
    setLanguage(locale);
    for (const side of ['oikea', 'vasen']) {
      const rows = reportRows('eks30', group, refs, side, {kons240: {right: {110: 120}, left: {110: 130}}});
      const rightIsInvolved = side === 'oikea';
      assert.deepEqual(rows[1].cells.slice(1, 4), rightIsInvolved ? ['168', '', '191'] : ['191', '', '168']);
      assert.deepEqual(rows[2].cells.slice(1, 4), rightIsInvolved ? ['2.46', '', '2.81'] : ['2.81', '', '2.46']);
      assert.deepEqual(rows[3].cells.slice(1, 4), rightIsInvolved ? ['195', '', '188'] : ['188', '', '195']);
      assert.deepEqual(rows[5].cells.slice(1, 4), rightIsInvolved ? ['111', '', '84.8'] : ['84.8', '', '111']);
      assert.deepEqual(rows[6].cells.slice(1, 4), rightIsInvolved ? ['1.54', '', '1.18'] : ['1.18', '', '1.54']);
      assert.deepEqual(rows[7].cells.slice(1, 4), rightIsInvolved ? ['135', '', '103'] : ['103', '', '135']);
      assert.equal(rows[1].cells[4], symmetryPercent(-191, -168, side));
      assert.equal(rows[5].cells[4], symmetryPercent(84.8, 111, side));
      assert.equal(rows[1].cells[5], '180 ± 10');
      assert.equal(rows[5].cells[5], '80 ± 10');
      assert.deepEqual(rows[8].cells.slice(1, 4), rightIsInvolved ? ['85.4', '', '70.7'] : ['70.7', '', '85.4']);
    }
  }
  setLanguage('fi');
  assert.deepEqual(group, before, 'do not mutate or double-swap raw measurement data');
});

test("report mapping never sorts muscles by strength and keeps absent sides absent", () => {
  const rows = reportRows('eks30', {right: {110: 200, 111: -80}}, null, 'oikea');
  assert.equal(rows[1].cells[1], '–');
  assert.equal(rows[5].cells[1], '–');
  assert.equal(rows[1].cells[3], '80.0');
  assert.equal(rows[5].cells[3], '200');
  assert.equal(rows[1].cells[4], '–');
});

test("report puts the non-involved leg before the involved leg without changing LSI", () => {
  assert.deepEqual(reportLegOrder('oikea'), {referenceSide: 'left', involvedSide: 'right'});
  assert.deepEqual(reportLegOrder('vasen'), {referenceSide: 'right', involvedSide: 'left'});
  const group = {right: {110: 300, 111: 120, 203: 4, 204: 1.6, 122: 200, 123: 80}, left: {110: 270, 111: 110, 203: 3.6, 204: 1.5, 122: 190, 123: 75}};
  const rightInvolved = reportRows('kons60', group, null, 'oikea');
  assert.deepEqual(rightInvolved[1].cells.slice(1, 4), ['270', '', '300']);
  assert.equal(rightInvolved[1].cells[4], '111');
  const leftInvolved = reportRows('kons60', group, null, 'vasen');
  assert.deepEqual(leftInvolved[1].cells.slice(1, 4), ['300', '', '270']);
  assert.equal(leftInvolved[1].cells[4], '90.0');
});

test("detailed endurance report merges all statistics under the muscle headings", () => {
  const group = {
    right: {110: 220, 111: -120, 203: 2.9, 204: -1.6, 122: 240, 123: 130, 212: 4800, 213: 2600, 120: 195, 121: -105, 114: 64, 115: 38, 130: -2.4, 131: -1.1},
    left: {110: 200, 111: -110, 203: 2.7, 204: -1.5, 122: 220, 123: 120, 212: 4400, 213: 2400, 120: 180, 121: -100, 114: 62, 115: 36, 130: -2.2, 131: -1.0},
  };
  const rows = reportRows('kons180', group, null, 'oikea', {}, {includeDetails: true});
  const labels = rows.map((row) => {
    const first = row.cells?.[0];
    return typeof first === 'object' ? first.content : first;
  }).filter(Boolean);
  assert.deepEqual(labels, [
    'ETUREISI', 'Huippuvääntö (Nm)', 'Huippuvääntö (Nm / kg)', 'Työ keskimäärin (J)', 'Kokonaistyö (J)',
    'Vääntö 0,2 s kohdalla (Nm)', 'Kulma huippuväännössä (°)', 'Työväsymisindeksi (J/s)',
    'TAKAREISI', 'Huippuvääntö (Nm)', 'Huippuvääntö (Nm / kg)', 'Työ keskimäärin (J)', 'Kokonaistyö (J)',
    'Vääntö 0,2 s kohdalla (Nm)', 'Kulma huippuväännössä (°)', 'Työväsymisindeksi (J/s)',
    'Kokonaistyö: ojennus + koukistus (J)', 'HQ-ratio (%)',
  ]);
  // Reference (left) comes first, then involved (right); work fatigue is a
  // J/s slope and is displayed as its magnitude, like the rest of the report.
  assert.deepEqual(rows[1].cells.slice(1, 4), ['200', '', '220']);
  assert.deepEqual(rows[7].cells.slice(1, 4), ['2.20', '', '2.40']);
  assert.deepEqual(rows[16].cells.slice(1, 4), ['6800', '', '7400']);
  assert.equal(rows.at(-1).cells[0], 'HQ-ratio (%)');
});

test("detailed ballistic reports include repetition peak-torque CV without a status", () => {
  const group = {
    right: {110: 250, 111: -130, 203: 3.3, 204: -1.7, 122: 260, 123: 130, 120: 220, 121: -110, 114: 62, 115: 37, 260: 4.6, 261: 6.2},
    left: {110: 240, 111: -125, 203: 3.2, 204: -1.6, 122: 250, 123: 125, 120: 210, 121: -105, 114: 61, 115: 38, 260: 5.1, 261: 6.8},
  };
  const rows = reportRows('kons60', group, null, 'oikea', {}, {includeDetails: true});
  const cvRows = rows.filter((row) => row.cells?.[0] === 'Huippuväännön vaihtelu (%)');
  assert.equal(cvRows.length, 2);
  assert.deepEqual(cvRows[0].cells.slice(1, 5), ['5.10', '', '4.60', '–']);
  assert.equal(cvRows[0].noStatus, true);
  assert.equal(cvRows[0].noBar, true);
  assert.equal(rows.find((row) => row.cells?.[0] === 'Kulma huippuväännössä (°)').noStatus, true);
});

test("football reference sets provide a 100-130% mixed-ratio range", () => {
  for (const key of ['Miehet jalkapallo, elite', 'Pojat jalkapallo, elite', 'Naiset jalkapallo, elite', 'Miehet jalkapallo, non-elite']) {
    assert.deepEqual(referenceValues[key].metrics.eks30.mixedRatio, {minimum: 100, maximum: 130});
  }
  const rows = reportRows('eks30', {right: {110: 150}, left: {110: 140}}, referenceValues['Miehet jalkapallo, elite'], 'oikea', {kons240: {right: {110: 100}, left: {110: 100}}});
  assert.equal(rows.at(-1).cells[5], '100-130');
  assert.equal(rows.at(-1).hasReference, true);
});

test("symmetry marker points toward the stronger leg in fixed reference-to-involved order", () => {
  // Involved 300 Nm / non-involved 270 Nm = 111%; the marker is right of 100%,
  // i.e. toward the involved column. The reverse case moves it toward reference.
  assert.ok(symmetryMarkerPosition(111.1) > 0.5);
  assert.ok(symmetryMarkerPosition(90) < 0.5);
  assert.equal(symmetryMarkerPosition(100), 0.5);
  assert.equal(symmetryMarkerPosition(500), 1);
  assert.equal(symmetryMarkerPosition(-10), 0);
});

test("symmetry scale has a broad green 90–110% band and only red outside 80–120%", () => {
  assert.equal(symmetryStatusColor(79.9), 'red');
  assert.equal(symmetryStatusColor(80), 'orange');
  assert.equal(symmetryStatusColor(89.9), 'orange');
  assert.equal(symmetryStatusColor(90), 'green');
  assert.equal(symmetryStatusColor(110), 'green');
  assert.equal(symmetryStatusColor(110.1), 'orange');
  assert.equal(symmetryStatusColor(120), 'orange');
  assert.equal(symmetryStatusColor(120.1), 'red');
});
