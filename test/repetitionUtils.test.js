import test from "node:test";
import assert from "node:assert/strict";
import {
  createMarkerBasedRepetitionSplits,
  createMovementBasedRepetitionSplits,
} from "../src/utils/repetitionUtils.js";

test("move 1 and move 2 markers define every extension and flexion repetition", () => {
  const collection = createMarkerBasedRepetitionSplits(
    { move1: [10, 30, 50], move2: [20, 40] },
    [false, true, false, false],
  );

  assert.equal(collection.startIndex, 10);
  assert.equal(collection.endIndex, 50);
  assert.deepEqual(collection.splits, [
    { startIndex: 10, endIndex: 20, color: "red", disabled: false },
    { startIndex: 20, endIndex: 30, color: "blue", disabled: true },
    { startIndex: 30, endIndex: 40, color: "red", disabled: false },
    { startIndex: 40, endIndex: 50, color: "blue", disabled: false },
  ]);
});

test("incomplete CTM move markers are rejected", () => {
  assert.throws(
    () =>
      createMarkerBasedRepetitionSplits({ move1: [10, 30], move2: [20, 40] }),
    /do not form complete repetitions/,
  );
});

test("move markers bound repetitions and speed excludes stationary reversals", () => {
  const speedPoints = [
    0, 10, 50, 120, 240, 240, 100, 40, 0, -10, -60, -240, -240, -80, -20,
    0,
  ];

  const collection = createMovementBasedRepetitionSplits(
    { move1: [0, 15], move2: [8] },
    speedPoints,
    [240, 240],
  );

  assert.deepEqual(collection.splits, [
    { startIndex: 2, endIndex: 6, color: "red", disabled: false },
    { startIndex: 10, endIndex: 13, color: "blue", disabled: false },
  ]);
});

test("the longest moving section is selected inside each move interval", () => {
  const collection = createMovementBasedRepetitionSplits(
    { move1: [0, 9], move2: [4] },
    [60, 0, 60, 60, 0, -60, -60, -60, 0, 0],
    [60, 60],
  );

  assert.equal(collection.splits[0].startIndex, 2);
  assert.equal(collection.splits[0].endIndex, 3);
  assert.equal(collection.splits[1].startIndex, 5);
  assert.equal(collection.splits[1].endIndex, 7);
});
