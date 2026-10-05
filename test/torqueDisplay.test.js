import test from "node:test";
import assert from "node:assert/strict";
import {createTorqueDisplay} from "../src/utils/torqueDisplay.js";

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
