import { For, createMemo } from "solid-js";
import { patientProfile, parsedFileData } from "../signals.js";
import { resolveComparisonSides } from "../utils/comparisonSides.js";

const SIDE_COLORS = { right: "#159447", left: "#d33434" };

const niceCeiling = (value) => Math.max(100, Math.ceil((value * 1.2) / 100) * 100);

export function EnduranceWorkCharts(props) {
  const files = createMemo(() => props.listOfParsedCTM?.() ?? []);
  const sharedMax = createMemo(() => niceCeiling(Math.max(...files().flatMap((file) => {
    const ext = file.rawObject.repetitions?.work1 ?? [];
    const flex = file.rawObject.repetitions?.work2 ?? [];
    return Array.from({length: Math.min(ext.length, flex.length)}, (_, index) =>
      Math.abs(Number(ext[index]) || 0) + Math.abs(Number(flex[index]) || 0),
    );
  }), 0)));
  return (
    <div class="flex flex-col gap-5">
      <WorkChart title="Etureisi – työ / toisto" direction="Ext" files={files} maxValue={sharedMax} />
      <WorkChart title="Takareisi – työ / toisto" direction="Flex" files={files} maxValue={sharedMax} />
    </div>
  );
}

function WorkChart(props) {
  const width = 450;
  const height = 250;
  const plot = { x: 54, y: 34, width: 370, height: 166 };
  const series = createMemo(() => props.files().map((file) => ({
    side: file.legSide,
    color: file.baseColor ?? SIDE_COLORS[file.legSide],
    values: (props.direction === "Ext" ? file.rawObject.repetitions?.work1 : file.rawObject.repetitions?.work2)
      ?.map((value) => Math.abs(Number(value)))
      .filter(Number.isFinite) ?? [],
  })).filter((entry) => entry.values.length));
  const maxValue = createMemo(() => props.maxValue?.() ?? niceCeiling(Math.max(...series().flatMap((entry) => entry.values), 0)));
  const maximumRepetitions = createMemo(() => Math.max(...series().map((entry) => entry.values.length), 1));
  const comparison = createMemo(() => resolveComparisonSides(patientProfile().involvedSide, parsedFileData()));
  const xAt = (index) => plot.x + (maximumRepetitions() <= 1 ? plot.width / 2 : (index / (maximumRepetitions() - 1)) * plot.width);
  const yAt = (value) => plot.y + plot.height - (value / maxValue()) * plot.height;
  const path = (values) => values.map((value, index) => `${index ? "L" : "M"} ${xAt(index)} ${yAt(value)}`).join(" ");
  const lsiClusters = createMemo(() => {
    const bySide = Object.fromEntries(series().map((entry) => [entry.side, entry]));
    const reference = bySide[comparison().referenceSide];
    const involved = bySide[comparison().involvedSide];
    if (!reference || !involved) return [];
    return Array.from({ length: Math.min(reference.values.length, involved.values.length) }, (_, index) => {
      const lsi = reference.values[index] ? (involved.values[index] / reference.values[index]) * 100 : 100;
      return Math.abs(lsi - 100) > 10 ? index : null;
    }).filter((index) => index !== null);
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{"font-family": "Helvetica, Arial, sans-serif"}}>
      <text x={plot.x} y="18" font-size="18" font-weight="700" fill="#2A3940">{props.title}</text>
      <text x={plot.x} y="31" font-size="10" fill="#5F696E">Työ [J]</text>
      <For each={Array.from({ length: maxValue() / 100 + 1 }, (_, index) => index * 100)}>
        {(tick) => <>
          <text x={plot.x - 8} y={yAt(tick) + 3} text-anchor="end" font-size="10">{tick}</text>
        </>}
      </For>
      <line x1={plot.x} y1={plot.y} x2={plot.x} y2={plot.y + plot.height} stroke="#2A3940" />
      <line x1={plot.x} y1={plot.y + plot.height} x2={plot.x + plot.width} y2={plot.y + plot.height} stroke="#2A3940" />
      <For each={series()}>
        {(entry) => <>
          <path d={path(entry.values)} fill="none" stroke={entry.color} stroke-width="2" />
          <For each={entry.values}>
            {(value, index) => <circle cx={xAt(index())} cy={yAt(value)} r="3.2" fill={entry.color} stroke="white" stroke-width="1" />}
          </For>
        </>}
      </For>
      <For each={lsiClusters()}>
        {(index) => <rect x={xAt(index) - 4} y={plot.y + plot.height + 6} width="8" height="6" fill="black" />}
      </For>
      <For each={[0, 4, 9, 14, 19].filter((index) => index < maximumRepetitions())}>
        {(index) => <text x={xAt(index)} y={plot.y + plot.height + 24} text-anchor="middle" font-size="10">{index + 1}</text>}
      </For>
      <text x={plot.x + plot.width / 2} y={height - 5} text-anchor="middle" font-size="11">Toisto</text>
    </svg>
  );
}
