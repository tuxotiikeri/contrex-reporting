import { Show } from "solid-js";
import { t } from "../i18n/index.js";

// Shared legend for the interactive view and the SVGs captured into the PDF.
// The colours intentionally stay constant: green is right, red is left.
export function ChartLegend(props) {
  const x = props.x ?? 0;
  const y = props.y ?? 0;
  return (
    <g font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#2A3940" aria-label="Chart legend">
      <circle cx={x} cy={y} r="3" fill="#159447" />
      <text x={x + 7} y={y + 3.2}>{t("Oikea")}</text>
      <circle cx={x + 54} cy={y} r="3" fill="#d33434" />
      <text x={x + 61} y={y + 3.2}>{t("Vasen")}</text>
      <Show when={props.includeLSI}>
        <rect x={x + 101} y={y - 2.5} width="9" height="5" fill="black" />
        <text x={x + 116} y={y + 3.2}>{t("LSI yli 10 %")}</text>
      </Show>
    </g>
  );
}
