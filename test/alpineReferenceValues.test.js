import test from "node:test";
import assert from "node:assert/strict";
import {referenceValues} from "../src/data/referenceValues.js";
import {reportRows} from "../src/utils/reportRows.js";
import {measurementProtocolKey} from "../src/utils/measurementMetadata.js";

test("alpine 30 and 60 eccentric tests use the same approved muscle-specific references", () => {
  for (const [name, mean, sd, hMean, hSd] of [["naiset", 3.56, 0.54, 1.82, 0.22], ["miehet", 4.27, 0.65, 2.19, 0.33]]) {
    const ref = referenceValues[`Alppihiihto ${name}, elite (kaikki lajit)`];
    assert.equal(ref.metrics.eks30, ref.metrics.eks60);
    assert.deepEqual(ref.metrics.eks30.bwExt, {mean, sd, sourceSpeed: 60});
    assert.deepEqual(ref.metrics.eks30.bwFlex, {mean: hMean, sd: hSd, sourceSpeed: 90});
    for (const protocol of ["eks30", "eks60"]) {
      const analysis = {110: 100, 111: -300, 112: 90, 113: -290, 203: 1.5, 204: -4.5};
      const rows = reportRows(protocol, {right: analysis, left: analysis}, ref, "right");
      const bw = rows.filter(row => row.cells[0] === "Huippuvääntö (Nm / kg)");
      assert.equal(Number(bw[0].cells[1]), 4.5); // Flex channel = quadriceps in eccentric testing.
      assert.equal(Number(bw[1].cells[1]), 1.5);
      assert.equal(bw[0].cells[5], `${mean} ± ${sd}`);
      assert.equal(bw[1].cells[5], `${hMean} ± ${hSd}`);
      assert.equal(bw[0].hasReference, true);
      assert.equal(bw[1].hasReference, true);
      assert.equal(rows.at(-1).cells[0], "Mixed-ratio (%)");
    }
  }
  assert.equal(measurementProtocolKey("Ecc/Ecc 60/60"), "eks60");
});
