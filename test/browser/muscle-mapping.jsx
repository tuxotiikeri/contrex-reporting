// Browser regression fixture: only synthetic movement channels, no patient data.
// Open /contrex-reporting/test/browser/muscle-mapping.html through Vite.
import {render} from 'solid-js/web';
import {createEffect, createSignal} from 'solid-js';
import {AverageChart} from '../../src/components/AverageChart.jsx';
import {MetricsSummary} from '../../src/components/MetricsSummary.jsx';
import {LanguageSelector} from '../../src/components/LanguageSelector.jsx';
import {setParsedFileData, setPatientProfile} from '../../src/signals.js';
import {language} from '../../src/i18n/index.js';
import '../../src/index.css';

const [program, setProgram] = createSignal('eks/eks 30/30');
const [result, setResult] = createSignal('Checking…');
const files = () => ['right', 'left'].map((side, index) => {
  const scale = index ? 0.95 : 1;
  const eccentric = program().startsWith('eks');
  // In both fixtures the anatomical quadriceps is 200 Nm and hamstrings 80 Nm.
  // Only the movement channel changes between eccentric and concentric tests.
  const channelValues = eccentric ? {Ext: 80, Flex: 200} : {Ext: 200, Flex: 80};
  const pointCollections = {}, splitCollections = {};
  for (const [direction, value] of Object.entries(channelValues)) {
    pointCollections[`averagePower${direction}`] = {points: Array(91).fill(value * scale)};
    pointCollections[`averagePower${direction}Error`] = {points: [Array(91).fill(value * scale * 0.9), Array(91).fill(value * scale * 1.1)]};
    splitCollections[`averagePower${direction}`] = {startIndex: 0, endIndex: 90, splits: [{startIndex: 0, endIndex: 90}]};
  }
  return {legSide: side, baseColor: index ? 'red' : 'green', rawObject: {
    programType: program(), pointCollections, splitCollections,
    analysis: {110: channelValues.Ext*scale, 111: -channelValues.Flex*scale, 112: channelValues.Ext*scale, 113: -channelValues.Flex*scale, 203: channelValues.Ext/80*scale, 204: -channelValues.Flex/80*scale, 122: channelValues.Ext/0.8*scale, 123: channelValues.Flex/0.8*scale},
  }};
});
setPatientProfile({involvedSide:'oikea', referenceValues:'Ei käytössä'});
createEffect(() => setParsedFileData(files()));

function Verification() {
  createEffect(() => {
    const locale = language(), eccentric = program().startsWith('eks');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      try {
        const charts = [...document.querySelectorAll('#curves svg')];
        const assert = (condition, message) => {if (!condition) throw new Error(message);};
        assert(charts.length === 2, 'Both charts must render');
        assert(charts[0].textContent.includes(locale === 'en' ? 'Quadriceps' : 'Etureisi'), 'Quadriceps heading');
        assert(charts[1].textContent.includes(locale === 'en' ? 'Hamstrings' : 'Takareisi'), 'Hamstrings heading');
        const firstY = svg => Number(svg.querySelector('[data-lines] path').getAttribute('d').match(/M\s+[\d.]+\s+([\d.]+)/)[1]);
        // Anatomical quadriceps is always the 200 Nm curve, regardless of
        // whether that raw curve is Flex (eccentric) or Ext (concentric).
        assert(firstY(charts[0]) < firstY(charts[1]), 'Curve channels are swapped');
        assert(charts.every(svg => svg.querySelectorAll('[data-error-bands] path').length === 2), 'Both variability bands');
        const cells = [...document.querySelectorAll('#summary tbody tr')];
        assert(cells[1].children[1].textContent === '200', 'Quadriceps summary value');
        assert(cells[5].children[1].textContent === '80', 'Hamstrings summary value');
        assert(cells[9].children[1].textContent === '40 %', 'H/Q summary value');
        setResult(`PASS: ${locale}, ${eccentric ? 'eccentric' : 'concentric'} — curves, variability, summary and H/Q`);
      } catch(error) {setResult(`FAIL: ${error.message}`);}
    }));
  });
  return <output class="block p-4 font-bold">{result()}</output>;
}
render(() => <>
  <h1>Synthetic muscle-mapping regression</h1><LanguageSelector/>
  <label>Protocol <select aria-label="Regression protocol" value={program()} onChange={e => setProgram(e.currentTarget.value)}>
    <option value="eks/eks 30/30">Eccentric</option><option value="kons/kons 60/60">Concentric</option>
  </select></label>
  <Verification/>
  <div id="curves"><AverageChart listOfParsedCTM={files} errorBands={true} showHQ={false}/></div>
  <div id="summary"><MetricsSummary listOfParsedCTM={files} programType={program()}/></div>
</>, document.getElementById('root'));
