import test from "node:test";
import assert from "node:assert/strict";
import {
  anatomicalToAbsoluteDegrees,
  applyGravityCorrection,
  createGravityTableNm,
  interpolateGravityNm,
} from "../src/utils/gravityCorrection.js";

const createSystemStrings = (values = Array(360).fill(0)) =>
  Object.fromEntries(
    Array.from({ length: 18 }, (_, rowIndex) => [
      `gravity${rowIndex}`,
      values.slice(rowIndex * 20, rowIndex * 20 + 20),
    ]),
  );

test("gravity table contains 360 values and converts 0.1 Nm units to Nm", () => {
  const values = Array.from({ length: 360 }, (_, index) => index);
  const table = createGravityTableNm(createSystemStrings(values));

  assert.equal(table.length, 360);
  assert.equal(table[0], 0);
  assert.equal(table[123], 12.3);
  assert.equal(table[359], 35.9);
});

test("gravity lookup interpolates between degrees and wraps at 360 degrees", () => {
  const table = Array(360).fill(0);
  table[10] = 2;
  table[11] = 4;
  table[359] = 6;

  assert.equal(interpolateGravityNm(table, 10.5), 3);
  assert.equal(interpolateGravityNm(table, -0.5), 3);
});

test("anatomical angle mapping uses opposite directions for right and left", () => {
  assert.equal(anatomicalToAbsoluteDegrees(-20, 100, "right"), 80);
  assert.equal(anatomicalToAbsoluteDegrees(-20, 100, "left"), 120);
});

test("right-side correction adds the system-oriented gravity lookup", () => {
  const values = Array(360).fill(0);
  values[80] = 20;

  const result = applyGravityCorrection({
    data: [[10, 60, -20]],
    configuration: { side: [0, "right"] },
    setUp: { anatomicalZero: 100 },
    systemStrings: createSystemStrings(values),
    compensation: {},
  });

  assert.equal(result.data[0][0], 12);
  assert.deepEqual(result.data[0].slice(1), [60, -20]);
  assert.equal(result.details.applied, true);
  assert.equal(result.details.torqueCorrectionMultiplier, 1);
});

test("correction uses left-side angle mapping", () => {
  const values = Array(360).fill(0);
  values[120] = -30;

  const result = applyGravityCorrection({
    data: [[10, 60, -20]],
    configuration: { side: [1, "left"] },
    setUp: { anatomicalZero: 100 },
    systemStrings: createSystemStrings(values),
    compensation: {},
  });

  assert.equal(result.data[0][0], 13);
  assert.equal(result.details.torqueCorrectionMultiplier, -1);
});

test("each measurement uses its own gravity table", () => {
  const firstTable = Array(360).fill(0);
  const secondTable = Array(360).fill(0);
  firstTable[80] = 10;
  secondTable[80] = 40;
  const baseMeasurement = {
    data: [[10, 60, -20]],
    configuration: { side: [0, "right"] },
    setUp: { anatomicalZero: 100 },
    compensation: {},
  };

  const first = applyGravityCorrection({
    ...baseMeasurement,
    systemStrings: createSystemStrings(firstTable),
  });
  const second = applyGravityCorrection({
    ...baseMeasurement,
    systemStrings: createSystemStrings(secondTable),
  });

  assert.equal(first.data[0][0], 11);
  assert.equal(second.data[0][0], 14);
});

test("an already corrected CXP file is not corrected a second time", () => {
  const data = [[10, 60, -20]];
  const result = applyGravityCorrection({
    data,
    configuration: {},
    setUp: {},
    systemStrings: {},
    compensation: { gravityCorrection: 1 },
  });

  assert.equal(result.data, data);
  assert.equal(result.details.alreadyApplied, true);
});
