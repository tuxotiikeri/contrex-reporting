import { For, createMemo } from "solid-js";
import { t } from "../i18n/index.js";

// Shared legend for the interactive view and the SVGs captured into the PDF.
// Use the plotted series colours, including repeated same-side measurements.
export function ChartLegend(props) {
  const y = props.y ?? 0;
  const entries = createMemo(() => {
    const series = (props.series ?? [{side: "right", color: "#159447"}, {side: "left", color: "#d33434"}])
      .map(entry => ({label: entry.label ?? t(entry.side === "right" ? "Oikea" : "Vasen"), color: entry.color}));
    if (props.includeLSI) series.push({label: t("LSI yli 10 %"), lsi: true, color: "black"});
    let offset = 0;
    return series.map(entry => {
      const item = {...entry, offset, width: 30 + entry.label.length * 7};
      offset += item.width;
      return item;
    });
  });
  const width = () => entries().reduce((sum, item) => sum + item.width, 0) - 10;
  const x = () => props.centerX != null ? props.centerX - width() / 2 : props.x ?? 0;
  return (
    <g font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#2A3940" aria-label="Chart legend">
      <For each={entries()}>{entry => <g>
        {entry.lsi
          ? <rect x={x() + entry.offset} y={y - 2.5} width="14" height="5" fill="black" />
          : <line x1={x() + entry.offset} x2={x() + entry.offset + 14} y1={y} y2={y} stroke={entry.color} stroke-width="2" />}
        <text x={x() + entry.offset + 20} y={y + 3.2}>{entry.label}</text>
      </g>}</For>
    </g>
  );
}
