import test from "node:test";
import assert from "node:assert/strict";
import {resolveComparisonSides} from "../src/utils/comparisonSides.js";

test("an explicit symptomatic side determines the reference side", () => {
  assert.deepEqual(resolveComparisonSides("oikea", []), {
    involvedSide: "right",
    referenceSide: "left",
    inferred: false,
  });
});

test("the stronger 60-degree quadriceps result becomes the reference when side is unspecified", () => {
  const files = [
    {legSide: "right", rawObject: {programType: "kons/kons 60/60", analysis: {110: 250}}},
    {legSide: "left", rawObject: {programType: "kons/kons 60/60", analysis: {110: 269}}},
  ];
  assert.deepEqual(resolveComparisonSides("", files), {
    involvedSide: "right",
    referenceSide: "left",
    inferred: true,
  });
});
