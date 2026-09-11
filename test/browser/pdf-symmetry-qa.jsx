// Manual visual QA fixture for the PDF one-pager. It intentionally uses a
// right involved leg that is stronger than the left reference leg: the marker
// must therefore sit to the right of the 100% midpoint on the summary tables.
import {render} from "solid-js/web";
import {createEffect, createSignal} from "solid-js";
import {HiddenCharts} from "../../src/components/HiddenCharts.jsx";
import {LanguageSelector} from "../../src/components/LanguageSelector.jsx";
import {setParsedFileData, setPatientProfile} from "../../src/signals.js";
import {generatePDF} from "../../src/utils/pdfUtils.js";
import "../../src/index.css";

const protocols = [
  ["kons60", "kons/kons 60/60", "oj/kouk 500 Nm isokin. ballistinen kons/kons 60/60"],
  ["kons240", "kons/kons 240/240", "oj/kouk 500 Nm isokin. ballistinen kons/kons 240/240"],
  ["eks30", "eks/eks 30/30", "oj/kouk 500 Nm isokin. ballistinen eks/eks 30/30"],
  ["kons180", "kons/kons 180/180", "oj/kouk 500 Nm isokin. ballistinen kons/kons 180/180"],
];

function makeFile(key, programType, name, side) {
  const right = side === "right";
  const factor = right ? 1.12 : 1;
  const isEccentric = key === "eks30";
  const ext = (isEccentric ? 105 : 230) * factor;
  const flex = (isEccentric ? -230 : -120) * factor;
  const points = (value) => Array.from({length: 91}, (_, i) => value * (0.8 + i / 500));
  const pointCollections = {
    averagePowerExt: {points: points(ext)},
    averagePowerFlex: {points: points(flex)},
    averagePowerExtError: {points: [points(ext * 0.94), points(ext * 1.06)]},
    averagePowerFlexError: {points: [points(flex * 0.94), points(flex * 1.06)]},
  };
  const splitCollections = {
    averagePowerExt: {startIndex: 0, endIndex: 90, splits: [{startIndex: 0, endIndex: 90}]},
    averagePowerFlex: {startIndex: 0, endIndex: 90, splits: [{startIndex: 0, endIndex: 90}]},
  };
  return {
    legSide: side,
    measurementType: programType,
    baseColor: side === "right" ? "#159447" : "#d33434",
    rawObject: {
      programType, pointCollections, splitCollections,
      analysis: {
        110: ext, 111: flex, 112: ext * 0.95, 113: flex * 0.95,
        114: 65, 115: 42, 120: ext * 0.85, 121: flex * 0.85,
        122: ext * 1.1, 123: Math.abs(flex) * 0.85,
        203: ext / 75, 204: flex / 75, 212: ext * 4, 213: Math.abs(flex) * 3,
      },
      repetitions: {work1: Array.from({length: 20}, (_, i) => ext * (1 - i / 90)), work2: Array.from({length: 20}, (_, i) => Math.abs(flex) * (1 - i / 95))},
      configuration: {side: [0, side]},
      measurement: {name, "date(dd/mm/yyyy)": "16.06.2026"},
      session: {"subject-name-first": "Ada", "subject-name": "Example", "subject-id": "QA-002", subjectWeight: 75},
    },
  };
}

const files = protocols.flatMap(([key, programType, name]) => [
  makeFile(key, programType, name, "left"),
  makeFile(key, programType, name, "right"),
]);
setPatientProfile({involvedSide: "oikea", weight: 75, referenceValues: "Ei käytössä"});
createEffect(() => setParsedFileData(files));
const [status, setStatus] = createSignal("");

render(() => <main class="p-6">
  <h1>PDF symmetry QA</h1>
  <LanguageSelector />
  <button class="mt-4 rounded bg-slate-800 px-4 py-2 text-white" onClick={async () => {
    setStatus("Generating…");
    try { await generatePDF(); setStatus("Done"); } catch (error) { setStatus(`Error: ${error.message}`); }
  }}>Generate PDF</button>
  <output class="ml-3">{status()}</output>
  <p>Expected first-page order: left reference, symmetry bar, right involved. The black marker is right of centre.</p>
  <HiddenCharts />
</main>, document.getElementById("root"));
