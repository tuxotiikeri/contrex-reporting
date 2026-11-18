import {For, Index, Show, createMemo, createSignal} from "solid-js";
import {t, sideLabel} from "../i18n/index.js";
import {isometricOnsets, setIsometricOnsets, patientProfile, parsedFileData} from "../signals.js";
import {isometricSeries, isometricLsi} from "../utils/isometricAnalysis.js";
import {resolveComparisonSides} from "../utils/comparisonSides.js";
import {isometricTrialColours} from "../data/seriesColors.js";

export const isoNumber = value => Number.isFinite(value) ? value.toLocaleString(undefined, {maximumFractionDigits: 1}) : "–";
export const isoTrialLabel = item => `${sideLabel(item.file.legSide)} · ${item.file.name}`;
// The first trial retains the familiar leg colour; subsequent files are
// independent series with distinct colours, rather than an average/SD.
export function colouredIsometricSeries(files, onsets) {
  const colours = isometricTrialColours(files);
  return isometricSeries(files, onsets).map((item, index) => ({...item, colour: colours[index]}));
}

export function IsometricChart(props) {
  const [hover, setHover] = createSignal(null);
  const width = 600, height = 330, left = 64, right = 580, bottom = 276;
  const top = () => Math.max(72, 52 + Math.ceil(props.series.length / 3) * 15);
  const xmax = () => props.zoom ? 0.3 : 5;
  const low = createMemo(() => Math.floor(Math.min(0, ...props.series.flatMap(s => s.result.points.map(p => p.torque))) / 10) * 10);
  const high = createMemo(() => Math.max(50, Math.ceil(Math.max(0, ...props.series.map(s => s.result.peak ?? 0)) * 1.15 / 50) * 50));
  const x = value => left + value / xmax() * (right - left);
  const y = value => bottom - (value - low()) / (high() - low()) * (bottom - top());
  const path = item => item.result.points.filter(p => p.time <= xmax()).map((p, i) => `${i ? "L" : "M"}${x(p.time).toFixed(2)},${y(p.torque).toFixed(2)}`).join(" ");
  const ticks = () => Array.from({length: 6}, (_, i) => i * xmax() / 5);
  const yticks = () => Array.from({length: 5}, (_, i) => low() + i * (high() - low()) / 4);
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} width={width} height={height}
    style={{width: "100%", height: "auto", background: "white", "font-family": "Arial, Helvetica, sans-serif", color: "#2a3940"}}
    onMouseLeave={() => setHover(null)} onMouseMove={event => {
      const bounds = event.currentTarget.getBoundingClientRect();
      setHover(Math.max(0, Math.min(xmax(), ((event.clientX - bounds.left) * width / bounds.width - left) / (right - left) * xmax())));
    }}>
    <text x="300" y="21" text-anchor="middle" font-size="17" font-weight="600" fill="#2a3940">{props.title}</text>
    <For each={props.series}>{(item, i) => <g transform={`translate(${left + (i() % 3) * 174},${39 + Math.floor(i() / 3) * 15})`}>
      <line x1="0" x2="16" y1="0" y2="0" stroke={item.colour} stroke-width="2" />
      <text x="21" y="4" fill="#2a3940" font-size="10">{isoTrialLabel(item)}</text>
    </g>}</For>
    <line x1={left} x2={left} y1={top()} y2={bottom} stroke="#2a3940" />
    <line x1={left} x2={right} y1={y(0)} y2={y(0)} stroke="#2a3940" />
    <For each={yticks()}>{v => <g><line x1={left - 4} x2={left} y1={y(v)} y2={y(v)} stroke="#2a3940" /><text x={left - 8} y={y(v) + 4} text-anchor="end" fill="#2a3940" font-size="12">{Math.round(v)}</text></g>}</For>
    <For each={ticks()}>{v => <g><line x1={x(v)} x2={x(v)} y1={bottom} y2={bottom + 4} stroke="#2a3940" /><text x={x(v)} y={bottom + 20} text-anchor="middle" fill="#2a3940" font-size="12">{props.zoom ? Math.round(v * 1000) : v}</text></g>}</For>
    <text x="18" y="174" transform="rotate(-90 18 174)" text-anchor="middle" fill="#2a3940" font-size="13">{t("Vääntö (Nm)")}</text>
    <text x="320" y="321" text-anchor="middle" fill="#2a3940" font-size="13">{t(props.zoom ? "Aika alkukohdasta (ms)" : "Aika alkukohdasta (s)")}</text>
    <For each={props.series}>{item => <path d={path(item)} fill="none" stroke={item.colour} stroke-width="1.8"><title>{isoTrialLabel(item)}</title></path>}</For>
    <For each={props.clusters ?? []}>{c => c.start < xmax() && <rect x={x(c.start)} y={bottom + 3} width={Math.max(0, x(Math.min(c.end, xmax())) - x(c.start))} height="3" fill="#222" />}</For>
    <Show when={props.zoom}><For each={[0.05, 0.1, 0.2]}>{v => <line x1={x(v)} x2={x(v)} y1={top()} y2={bottom} stroke="#aaa" stroke-dasharray="2 4" />}</For></Show>
    <Show when={hover() != null}>{() => <For each={props.series}>{(item, i) => {
      const point = () => item.result.points[Math.round(hover() * item.result.sampleRate)];
      return <Show when={point()}>{p => <g><circle cx={x(p().time)} cy={y(p().torque)} r="3" fill={item.colour} /><text x={Math.min(right - 45, x(p().time) + 7)} y={y(p().torque) - 7 - (i() % 2) * 13} fill="#222" font-size="11">{Math.round(p().torque)} Nm</text></g>}</Show>;
    }}</For>}</Show>
  </svg>;
}

function OnsetReview(props) {
  const result = () => props.item.result;
  const fs = () => result().sampleRate;
  const origin = () => result().onsetIndex ?? result().start;
  const samples = createMemo(() => {
    const r = result(), data = props.item.file.rawObject.data;
    if (!Number.isFinite(r.start) || !Number.isFinite(origin())) return [];
    const first = Math.max(0, origin() - Math.round(fs() * 0.25));
    const last = Math.min(data.length - 1, origin() + Math.round(fs() * 0.3));
    const sign = r.protocol.direction === "extension" ? 1 : -1;
    return data.slice(first, last + 1).map((row, i) => ({index: first + i, value: row[0] * sign}));
  });
  const low = createMemo(() => Math.min(result().baseline ?? 0, ...samples().map(s => s.value)) - 2);
  const high = createMemo(() => Math.max(low() + 10, ...samples().map(s => s.value)) + 2);
  const x = index => 45 + (index - origin() + fs() * 0.25) / (fs() * 0.55) * 500;
  const y = value => 125 - (value - low()) / (high() - low()) * 100;
  const setOnset = value => setIsometricOnsets(old => ({...old, [props.item.key]: value}));
  return <details class="rounded border border-slate-200 p-3 my-3">
    <summary class="cursor-pointer font-medium">{isoTrialLabel(props.item)} · {t("Tarkista alkukohta")}</summary>
    <Show when={samples().length}><svg viewBox="0 0 600 155" style={{width: "100%", "max-width": "650px", "font-family": "Arial, sans-serif"}}>
      <path d={samples().map((s, i) => `${i ? "L" : "M"}${x(s.index)},${y(s.value)}`).join(" ")} fill="none" stroke={props.item.colour} stroke-width="1.5" />
      <line x1={x(origin())} x2={x(origin())} y1="20" y2="125" stroke="#222" />
      <line x1="45" x2="545" y1={y(result().baseline + result().threshold)} y2={y(result().baseline + result().threshold)} stroke="#888" stroke-dasharray="3 3" />
      <text x="45" y="147" font-size="11">-250 ms</text><text x={x(origin())} y="147" font-size="11">0</text><text x="515" y="147" font-size="11">300 ms</text>
    </svg></Show>
    <p class="text-sm text-slate-600">{t("Katkoviiva: lepotaso + tunnistuskynnys. Pystyviiva: valittu alkukohta.")}</p>
    <div class="flex flex-wrap items-center gap-3 mt-2 text-sm">
      <label>{t("Alkukohta mittausjakson alusta (s)")} <input aria-label={`${t("Alkukohta")} ${props.item.file.name}`} class="border rounded px-2 py-1 w-28" type="number" min="0" max={result().duration} step={1 / fs()} value={result().onsetIndex == null ? "" : ((origin() - result().start) / fs()).toFixed(6)} onChange={e => {if (e.target.value !== "") setOnset(result().start + Math.round(Number(e.target.value) * fs()));}} /></label>
      <button class="border rounded px-2 py-1" onClick={() => setOnset(Math.max(result().start, origin() - 1))}>−1 {t("näyte")}</button>
      <button class="border rounded px-2 py-1" onClick={() => setOnset(Math.min(result().end - 1, origin() + 1))}>+1 {t("näyte")}</button>
      <button class="border rounded px-2 py-1" onClick={() => setIsometricOnsets(old => {const next = {...old}; delete next[props.item.key]; return next;})}>{t("Automaattinen alkukohta")}</button>
      <span>{t(result().onsetSource === "manual" ? "Käsin valittu" : "Automaattinen")}</span>
    </div>
    <For each={result().issues}>{issue => <p class="text-sm text-amber-800 mt-2">{t(issue)}</p>}</For>
  </details>;
}

export function IsometricView(props) {
  const [zoom, setZoom] = createSignal(false);
  const series = createMemo(() => colouredIsometricSeries(props.listOfParsedCTM(), isometricOnsets()));
  const involved = () => resolveComparisonSides(patientProfile().involvedSide, parsedFileData()).involvedSide;
  return <div class="w-full min-w-0 text-slate-700">
    <h2 class="text-2xl font-bold mb-3">{t("Isometrinen voima")} · {series()[0]?.result.protocol.angle}°</h2>
    <p class="text-sm mb-3">{t("Käyrät kohdistetaan voimantuoton alkukohtaan. Jokainen tiedosto on oma yritys; keskiarvoa tai hajonta-aluetta ei lasketa.")}</p>
    <label class="text-sm"><input type="checkbox" checked={zoom()} onChange={e => setZoom(e.target.checked)} /> {t("Tarkastele ensimmäisiä 300 ms")}</label>
    <For each={["extension", "flexion"]}>{direction => {
      const items = () => series().filter(s => s.result.protocol.direction === direction);
      return <section class="mt-6"><IsometricChart series={items()} title={t(direction === "extension" ? "Etureisi – isometrinen vääntö" : "Takareisi – isometrinen vääntö")} zoom={zoom()} clusters={isometricLsi(items(), involved())} />
        <Show when={items().length === 0}><p>{t("Ei valittuja mittauksia.")}</p></Show>
      </section>;
    }}</For>
    <p class="text-sm my-3">{t("Musta palkki: LSI poikkeaa yli 10 %. Vertailu tehdään, kun kummastakin jalasta on valittu yksi kelvollinen yritys ja vertailujalka on määritettävissä.")}</p>
    <div class="overflow-x-auto"><table class="w-full text-sm text-right border-collapse"><thead class="bg-slate-100"><tr>
      <th class="p-2 text-left">{t("Yritys")}</th><th>{t("Lihas")}</th><th>{t("Huippuvääntö (Nm)")}</th><th>Nm / kg</th>
      <For each={[50, 100, 200]}>{ms => <th>T{ms} (Nm)</th>}</For><For each={[50, 100, 200]}>{ms => <th>RTD 0–{ms} ms (Nm/s)</th>}</For>
    </tr></thead><tbody><For each={series()}>{item => <tr class="border-b border-slate-100">
      <td class="p-2 text-left"><span style={{color: item.colour}}>━ </span>{isoTrialLabel(item)}</td><td>{t(item.result.protocol.direction === "extension" ? "Etureisi" : "Takareisi")}</td><td>{isoNumber(item.result.peak)}</td><td>{item.result.peakPerKg?.toFixed(2) ?? "–"}</td>
      <For each={[50, 100, 200]}>{ms => <td>{isoNumber(item.result.torqueAt[ms])}</td>}</For><For each={[50, 100, 200]}>{ms => <td>{isoNumber(item.result.rtd[ms])}</td>}</For>
    </tr>}</For></tbody></table></div>
    <p class="text-sm mt-4">{t("RTD = väännön muutos alkukohdasta / aika (Nm/s). Isometrinen analyysi käyttää alipäästösuodattamatonta dataa ja valittua painovoimakorjausta. Suodatus-valinta ei vaikuta isometrisiin tuloksiin.")}</p>
    <p class="text-sm mt-2">{t("256 Hz:n aineistossa näyteväli on noin 3,9 ms. Etenkin 50 ms:n RTD on herkkä alkukohdalle; tarkista nousu ennen tulkintaa. Epävakaa lepotaso tai vastaliike jättää RTD:n tyhjäksi.")}</p>
    <p class="text-sm mt-2">{t("Akseli on 0–5 s. Käyrä päättyy tallennetun mittausjakson loppuun; puuttuvaa loppuosaa ei täydennetä.")}</p>
    <Index each={series()}>{item => <OnsetReview item={item()} />}</Index>
    <p class="text-sm mt-3">{t("Menetelmä")}: <a class="underline" href="https://doi.org/10.1007/s00421-016-3346-6" target="_blank" rel="noreferrer">Maffiuletti et al. (2016)</a>. {t("Alkukohdan kynnys: lepotaso + max(0,5 Nm, 3 × SD), ylitys vähintään 20 ms.")}</p>
  </div>;
}
