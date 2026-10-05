import test from "node:test";
import assert from "node:assert/strict";
import {createTorqueDisplay, createHQDisplay, createLsiDisplay} from "../src/utils/torqueDisplay.js";

test("display uses actual angles and zero movement boundaries without mutating analysis", () => {
  const raw = {setUp: {mov1: -6.5, mov2: -86.7},
    pointCollections: {angle: {points: [-86, -50, -7]}, power: {points: [150, 240, 80]}},
    splitCollections: {movement: {splits: [{color: "red", startIndex: 0, endIndex: 2}]}},
    analysis: {120: 123, 122: 234}, repetitions: {work1: [234]}};
  const original = structuredClone(raw);
  const display = createTorqueDisplay(raw, "Ext");
  assert.equal(display.points.length, 901);
  assert.equal(display.points[65], 0);
  assert.equal(display.points[867], 0);
  assert.equal(display.points[0], 0);
  assert.equal(display.points[900], 0);
  assert.equal(display.points[500], 240);
  assert.equal(display.points[860], 150);
  assert.equal(display.active[0], false);
  assert.equal(display.active[500], true);
  assert.deepEqual(raw, original);
});

test("LSI ignores narrow clusters but keeps a sustained cluster ending at ROM", () => {
  const reference = {points: Array(901).fill(100), active: Array(901).fill(true)};
  const involved = structuredClone(reference);
  involved.points.fill(130, 65, 85); // 1.9 degrees
  involved.points.fill(130, 700, 868); // sustained to the ROM boundary
  involved.active.fill(false, 868);
  const display = createLsiDisplay(involved, reference);
  assert.deepEqual(display.clusters, [{startIndex: 700, endIndex: 867}]);
  assert.ok(Number.isNaN(display.percentages[870]));
});

test("HQ uses real angles, handles eccentric muscle mapping, and gaps values above 2", () => {
  const raw = {setUp: {mov1: -6.5, mov2: -86.7}, programType: "kons/kons 60/60",
    pointCollections: {angle: {points: [-7, -50, -86, -7, -50, -86]},
      power: {points: [200, 200, 200, -100, -100, -100]}},
    splitCollections: {movement: {splits: [
      {color: "red", startIndex: 0, endIndex: 2},
      {color: "blue", startIndex: 3, endIndex: 5}]}}};
  assert.equal(createHQDisplay(raw).points[500], 0.5);
  assert.equal(createHQDisplay(raw).active[30], false);
  raw.programType = "eks/eks 30/30";
  assert.equal(createHQDisplay(raw).points[500], 2);
  raw.pointCollections.power.points[4] = -50;
  const hq = createHQDisplay(raw);
  assert.equal(hq.active[500], false);
  assert.ok(hq.split.splits.length > 1);
});

test("display averages repetitions at matching angles and excludes disabled repetitions", () => {
  const raw = {setUp: {mov1: -6, mov2: -87},
    pointCollections: {angle: {points: [-10, -50, -80, -10, -50, -80]},
      power: {points: [-60, -100, -70, -90, -150, -90]}},
    splitCollections: {movement: {splits: [
      {color: "blue", startIndex: 0, endIndex: 2},
      {color: "blue", startIndex: 3, endIndex: 5, disabled: true}]}}};
  assert.equal(createTorqueDisplay(raw, "Flex").points[500], 100);
  raw.splitCollections.movement.splits[1].disabled = false;
  const display = createTorqueDisplay(raw, "Flex");
  assert.equal(display.points[500], 125);
  assert.deepEqual(display.error.map(p => p[500]), [105, 145]);
});
