import { For, Show, createMemo } from "solid-js";
import { parsedFileData, patientProfile } from "../signals.js";
import { referenceValues } from "../data/referenceValues.js";
import { resolveComparisonSides } from "../utils/comparisonSides.js";

const testKeyForProgram = (programType) => {
  const program = String(programType ?? "").toLowerCase();
  if (program.includes("300")) return "kons300";
  if (program.includes("240")) return "kons240";
  if (program.includes("180")) return "kons180";
  if (program.includes("30")) return "eks30";
  if (program.includes("60")) return "kons60";
  return null;
};

const metrics = [
  { label: "Huippuvääntö keskimäärin", unit: "Nm", ext: 112, flex: 113, refExt: "torqueExt", refFlex: "torqueFlex" },
  { label: "Huippuvääntö / kg", unit: "Nm/kg", ext: 203, flex: 204, refExt: "bwExt", refFlex: "bwFlex", decimals: 2 },
  { label: "Työ keskimäärin", unit: "J", ext: 122, flex: 123, refExt: "workExt", refFlex: "workFlex" },
];

const directionGroups = [
  { title: "Ojennus", direction: "ojennus" },
  { title: "Koukistus", direction: "koukistus" },
];

const format = (value, decimals = 0) =>
  Number.isFinite(value) ? value.toFixed(decimals) : "–";

const referenceText = (reference) => {
  if (!reference) return "–";
  if (reference.minimum != null) return `≥ ${reference.minimum}`;
  return `${reference.mean} ± ${reference.sd}`;
};

export function MetricsSummary(props) {
  const data = createMemo(() => {
    const sides = Object.fromEntries(props.listOfParsedCTM().map((file) => [file.legSide, file.rawObject.analysis]));
    const right = sides.right;
    const left = sides.left;
    const referenceSet = referenceValues[patientProfile().referenceValues];
    const testKey = testKeyForProgram(props.programType);
    const testReferences = referenceSet?.metrics?.[testKey];
    const involvedSide = resolveComparisonSides(patientProfile().involvedSide, parsedFileData()).involvedSide;

    const rows = metrics.flatMap((metric) => [
      { ...metric, direction: "ojennus", right: Math.abs(right?.[metric.ext]), left: Math.abs(left?.[metric.ext]), ref: testReferences?.[metric.refExt] },
      { ...metric, direction: "koukistus", right: Math.abs(right?.[metric.flex]), left: Math.abs(left?.[metric.flex]), ref: testReferences?.[metric.refFlex] },
    ]).map((row) => {
      const involved = involvedSide === "left" ? row.left : involvedSide === "right" ? row.right : null;
      const nonInvolved = involvedSide === "left" ? row.right : involvedSide === "right" ? row.left : null;
      const lsi = involved && nonInvolved ? 100 * involved / nonInvolved : null;
      return { ...row, lsi };
    });
    const isEccentric = props.programType?.includes("eks/eks");
    const quadriceps = Math.abs(isEccentric ? right?.[113] : right?.[112]);
    const hamstrings = Math.abs(isEccentric ? right?.[112] : right?.[113]);
    const leftQuadriceps = Math.abs(isEccentric ? left?.[113] : left?.[112]);
    const leftHamstrings = Math.abs(isEccentric ? left?.[112] : left?.[113]);
    const rightHQ = quadriceps ? hamstrings / quadriceps : NaN;
    const leftHQ = leftQuadriceps ? leftHamstrings / leftQuadriceps : NaN;
    rows.push({ label: "HQ-suhde", unit: "", direction: "hq", right: rightHQ, left: leftHQ, lsi: null, ref: testReferences?.hq, decimals: 2 });
    return rows;
  });

  return (
    <section class="w-96 max-w-full rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
      <div class="mb-2 flex items-baseline justify-between gap-4">
        <h2 class="text-base font-semibold text-gray-800">Yhteenveto</h2>
        <span class="text-xs text-gray-500">LSI = involved / non-involved</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-y border-gray-200 bg-gray-50 text-left text-xs text-gray-600">
            <tr><th class="px-2 py-2">Mittari</th><th class="px-2 py-2 text-right">Oikea</th><th class="px-2 py-2 text-right">Vasen</th><th class="px-2 py-2 text-right">LSI</th><th class="px-2 py-2 text-right">Viitearvo</th></tr>
          </thead>
          <tbody>
            <For each={directionGroups}>
              {(group) => <>
                <tr class="bg-gray-50"><th colspan="5" class="px-2 py-1.5 text-left font-semibold text-gray-700">{group.title}</th></tr>
                <For each={data().filter((row) => row.direction === group.direction)}>
                  {(row) => <tr class="border-b border-gray-100"><td class="px-2 py-1.5">{row.label} ({row.unit})</td><td class="px-2 py-1.5 text-right">{format(row.right, row.decimals)}</td><td class="px-2 py-1.5 text-right">{format(row.left, row.decimals)}</td><td class={`px-2 py-1.5 text-right ${row.lsi != null && Math.abs(row.lsi - 100) > 10 ? "font-semibold text-red-600" : ""}`}>{row.lsi == null ? "–" : `${format(row.lsi, 0)} %`}</td><td class="px-2 py-1.5 text-right text-gray-600">{referenceText(row.ref)}</td></tr>}
                </For>
              </>}
            </For>
            <tr class="bg-gray-50"><th colspan="5" class="px-2 py-1.5 text-left font-semibold text-gray-700">HQ-suhde</th></tr>
            <For each={data().filter((row) => row.direction === "hq")}>
              {(row) => <tr class="border-b border-gray-100"><td class="px-2 py-1.5">HQ-suhde</td><td class="px-2 py-1.5 text-right">{Number.isFinite(row.right) ? `${format(row.right * 100, 0)} %` : "–"}</td><td class="px-2 py-1.5 text-right">{Number.isFinite(row.left) ? `${format(row.left * 100, 0)} %` : "–"}</td><td class="px-2 py-1.5 text-right">–</td><td class="px-2 py-1.5 text-right text-gray-600">{referenceText(row.ref)}</td></tr>}
            </For>
          </tbody>
        </table>
      </div>
      <Show when={patientProfile().referenceValues !== "Ei käytössä" && !referenceValues[patientProfile().referenceValues]?.metrics?.[testKeyForProgram(props.programType)]}>
        <p class="mt-2 text-xs text-amber-700">Valitulle viiteaineistolle ei ole vielä tämän mittausnopeuden arvoja.</p>
      </Show>
    </section>
  );
}
