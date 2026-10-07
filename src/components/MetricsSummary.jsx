import { t } from "../i18n/index.js";
import { For, Show, createMemo } from "solid-js";
import { parsedFileData, patientProfile } from "../signals.js";
import { referenceValues } from "../data/referenceValues.js";
import { resolveComparisonSides } from "../utils/comparisonSides.js";
import { reportMetricIndices } from "../utils/reportMetricDefinitions.js";

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
  { label: "Huippuvääntö", unit: "Nm", metric: "torque", refExt: "torqueExt", refFlex: "torqueFlex" },
  { label: "Huippuvääntö / kg", unit: "Nm/kg", metric: "bw", refExt: "bwExt", refFlex: "bwFlex", decimals: 2 },
  { label: "Työ keskimäärin", unit: "J", metric: "averageWork", refExt: "averageWorkExt", refFlex: "averageWorkFlex" },
  { label: "Kulma huippuväännössä", unit: "°", metric: "peakAngle", refExt: "peakAngleExt", refFlex: "peakAngleFlex", noSymmetry: true },
];

const directionGroups = [
  { title: "Etureisi", direction: "quadriceps" },
  { title: "Takareisi", direction: "hamstrings" },
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

    const indices = reportMetricIndices(props.listOfParsedCTM()[0]?.rawObject ?? props.programType);
    const rows = metrics.flatMap((metric) => [
      { ...metric, direction: "quadriceps", right: Math.abs(right?.[indices.quadriceps[metric.metric]]), left: Math.abs(left?.[indices.quadriceps[metric.metric]]), ref: testReferences?.[metric.refExt] },
      { ...metric, direction: "hamstrings", right: Math.abs(right?.[indices.hamstrings[metric.metric]]), left: Math.abs(left?.[indices.hamstrings[metric.metric]]), ref: testReferences?.[metric.refFlex] },
    ]).map((row) => {
      const involved = involvedSide === "left" ? row.left : involvedSide === "right" ? row.right : null;
      const nonInvolved = involvedSide === "left" ? row.right : involvedSide === "right" ? row.left : null;
      const lsi = !row.noSymmetry && involved && nonInvolved ? 100 * involved / nonInvolved : null;
      return { ...row, lsi };
    });
    const quadriceps = Math.abs(right?.[indices.quadriceps.meanPeak]);
    const hamstrings = Math.abs(right?.[indices.hamstrings.meanPeak]);
    const leftQuadriceps = Math.abs(left?.[indices.quadriceps.meanPeak]);
    const leftHamstrings = Math.abs(left?.[indices.hamstrings.meanPeak]);
    const rightHQ = quadriceps ? hamstrings / quadriceps : NaN;
    const leftHQ = leftQuadriceps ? leftHamstrings / leftQuadriceps : NaN;
    rows.push({ label: "HQ-suhde", unit: "", direction: "hq", right: rightHQ, left: leftHQ, lsi: null, ref: testReferences?.hq, decimals: 2 });
    if (testReferences?.hqPeak) {
      const peakRatio = side => {
        const q = Math.abs(side?.[indices.quadriceps.torque]);
        const h = Math.abs(side?.[indices.hamstrings.torque]);
        return q ? h / q : NaN;
      };
      rows.push({label: "Huippuväännön HQ-suhde (%)", direction: "hq",
        right: peakRatio(right), left: peakRatio(left), lsi: null, ref: testReferences.hqPeak});
    }
    return rows;
  });

  return (
    <section class="w-96 max-w-full rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
      <div class="mb-2 flex items-baseline justify-between gap-4">
        <h2 class="text-base font-semibold text-gray-800">{t("Yhteenveto")}</h2>
        <span class="text-xs text-gray-500">{t("LSI = oireinen jalka / verrokkijalka")}</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-y border-gray-200 bg-gray-50 text-left text-xs text-gray-600">
            <tr><th class="px-2 py-2">{t("Mittari")}</th><th class="px-2 py-2 text-right">{t("Oikea")}</th><th class="px-2 py-2 text-right">{t("Vasen")}</th><th class="px-2 py-2 text-right">LSI</th><th class="px-2 py-2 text-right">{t("Viitearvo")}</th></tr>
          </thead>
          <tbody>
            <For each={directionGroups}>
              {(group) => <>
                <tr class="bg-gray-50"><th colspan="5" class="px-2 py-1.5 text-left font-semibold text-gray-700">{t(group.title)}</th></tr>
                <For each={data().filter((row) => row.direction === group.direction)}>
                  {(row) => <tr class="border-b border-gray-100"><td class="px-2 py-1.5">{t(row.label)} ({row.unit})</td><td class="px-2 py-1.5 text-right">{format(row.right, row.decimals)}</td><td class="px-2 py-1.5 text-right">{format(row.left, row.decimals)}</td><td class={`px-2 py-1.5 text-right ${row.lsi != null && Math.abs(row.lsi - 100) > 10 ? "font-semibold text-red-600" : ""}`}>{row.lsi == null ? "–" : `${format(row.lsi, 0)} %`}</td><td class="px-2 py-1.5 text-right text-gray-600">{referenceText(row.ref)}</td></tr>}
                </For>
              </>}
            </For>
            <tr class="bg-gray-50"><th colspan="5" class="px-2 py-1.5 text-left font-semibold text-gray-700">{t("HQ-suhde")}</th></tr>
            <For each={data().filter((row) => row.direction === "hq")}>
              {(row) => <tr class="border-b border-gray-100"><td class="px-2 py-1.5">{t(row.label)}</td><td class="px-2 py-1.5 text-right">{Number.isFinite(row.right) ? `${format(row.right * 100, 0)} %` : "–"}</td><td class="px-2 py-1.5 text-right">{Number.isFinite(row.left) ? `${format(row.left * 100, 0)} %` : "–"}</td><td class="px-2 py-1.5 text-right">–</td><td class="px-2 py-1.5 text-right text-gray-600">{referenceText(row.ref)}</td></tr>}
            </For>
          </tbody>
        </table>
      </div>
      <Show when={patientProfile().referenceValues !== "Ei käytössä" && !referenceValues[patientProfile().referenceValues]?.metrics?.[testKeyForProgram(props.programType)]}>
        <p class="mt-2 text-xs text-amber-700">{t("Valitulle viiteaineistolle ei ole vielä tämän mittausnopeuden arvoja.")}</p>
      </Show>
    </section>
  );
}
