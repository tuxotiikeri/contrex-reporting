// Manual browser QA accepts local bytes; no participant data is stored here.
import {render} from "solid-js/web";
import {createMemo} from "solid-js";
import {parseTextToObject} from "../../src/utils/CTMUtils.js";
import {decodeMeasurementBuffer} from "../../src/utils/measurementText.js";
import * as signals from "../../src/signals.js";
import {IsometricView} from "../../src/components/IsometricView.jsx";
import {HiddenCharts} from "../../src/components/HiddenCharts.jsx";
import {LanguageSelector} from "../../src/components/LanguageSelector.jsx";
import {generatePDF} from "../../src/utils/pdfUtils.js";
import {isometricProtocol} from "../../src/utils/measurementMetadata.js";
import "../../src/index.css";
import App from "../../src/App.jsx";

globalThis.isometricQA = {
  signals,
  load(files) {
    const parsed = files.map((f, index) => {
      const rawObject = parseTextToObject(decodeMeasurementBuffer(Uint8Array.from(f.bytes).buffer), true, {}, true, {});
      rawObject.session.subjectName = "Example";
      rawObject.session.subjectNameFirst = "Demo";
      rawObject.session.subjectId = "QA";
      return {name: f.name, sessionId: "QA", index, legSide: rawObject.configuration.side[1], rawObject};
    });
    signals.setPatientProfile({involvedSide: "oikea", weight: "", referenceValues: "Ei käytössä"});
    signals.setParsedFileData(parsed);
    return parsed.map(f => ({name: f.name, protocol: f.rawObject.programType, direction: f.rawObject.isometric?.protocol.direction}));
  },
};
render(() => {
  if (new URLSearchParams(location.search).has("app")) return <App />;
  const files = createMemo(() => signals.parsedFileData().filter(f => isometricProtocol(f)));
  return <main class="p-6 max-w-6xl mx-auto"><LanguageSelector /><button class="border px-3 py-2 my-3" onClick={generatePDF}>PDF</button>
    <IsometricView listOfParsedCTM={files} /><HiddenCharts /></main>;
}, document.getElementById("root"));
