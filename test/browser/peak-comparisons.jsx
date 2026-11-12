import {render} from "solid-js/web";
import {createMemo} from "solid-js";
import "./pdf-symmetry-qa.jsx";
import {AverageChart} from "../../src/components/AverageChart.jsx";
import {PeakComparisonCharts} from "../../src/components/PeakComparisonCharts.jsx";
import {MetricsSummary} from "../../src/components/MetricsSummary.jsx";
import {parsedFileData, patientProfile, setPatientProfile} from "../../src/signals.js";
import {referenceValues} from "../../src/data/referenceValues.js";
import {language, setLanguage} from "../../src/i18n/index.js";
import "../../src/App.css";
import "../../src/index.css";

// Reuse the synthetic measurements, never private lab files, for visual QA.
const qaRoot = document.createElement("main");
qaRoot.id = "peak-qa";
qaRoot.style.cssText = "max-width:1260px;margin:0 auto;background:white;padding:24px";
document.body.append(qaRoot);
document.getElementById("root").style.display = "none";
const active = createMemo(() => parsedFileData().filter(file => file.measurementType.includes("60/60")));
setPatientProfile({...patientProfile(), referenceValues: "Miehet jalkapallo, elite"});
render(() => <>
  <label>Reference <select aria-label="Reference" value={patientProfile().referenceValues} onChange={e => setPatientProfile({...patientProfile(), referenceValues: e.currentTarget.value})}>
    <option value="Ei käytössä">None</option>
    {Object.keys(referenceValues).map(key => <option value={key}>{key}</option>)}
  </select></label>
  <label>Language <select aria-label="Language" value={language()} onChange={e => setLanguage(e.currentTarget.value)}><option value="fi">FI</option><option value="en">EN</option></select></label>
  <AverageChart listOfParsedCTM={active} errorBands={true} comparisonFor={muscle => <PeakComparisonCharts listOfParsedCTM={active} muscle={muscle} />} />
  <MetricsSummary listOfParsedCTM={active} programType="kons 60" />
</>, qaRoot);
