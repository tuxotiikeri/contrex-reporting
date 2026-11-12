import {For, Show, createMemo, createSignal, onMount, onCleanup} from "solid-js";
import {language, sideLabel, t} from "../i18n/index.js";
import {patientProfile} from "../signals.js";
import {referenceValues} from "../data/referenceValues.js";
import {peakComparisons, comparisonScale} from "../utils/peakComparisons.js";

const number = (value, decimals = 0) => Number.isFinite(value)
  ? new Intl.NumberFormat(language() === "en" ? "en-GB" : "fi-FI", {maximumFractionDigits: decimals, minimumFractionDigits: decimals}).format(value) : "–";

export function PeakComparisonCharts(props) {
  let panel;
  const [geometry, setGeometry] = createSignal({height: 360, scale: 1, top: 93, baseline: 285});
  onMount(() => {
    // Measure the neighbouring SVG, not the whole row including captions.
    // Its responsive scale controls both the baseline and rendered font size.
    const curve = panel.closest(".torque-comparison-row")?.querySelector(":scope > div > svg");
    if (!curve) return;
    const update = () => {
      const height = curve.getBoundingClientRect().height;
      const sourceHeight = curve.viewBox.baseVal.height || 360;
      if (!height) return;
      const scale = height / sourceHeight;
      setGeometry({height, scale, top: 93 * scale, baseline: (sourceHeight - 75) * scale});
    };
    const observer = new ResizeObserver(update);
    observer.observe(curve);
    update();
    onCleanup(() => observer.disconnect());
  });
  const charts = createMemo(() => peakComparisons(props.listOfParsedCTM(), referenceValues[patientProfile().referenceValues], props.muscle));
  return <aside ref={panel} class={`peak-comparisons ${props.muscle === "hq" ? "peak-comparisons-hq" : ""}`} aria-label={t("Palkkivertailu")}>
    <For each={charts()}>{chart => <ComparisonBarChart chart={chart} geometry={geometry} />}</For>
  </aside>;
}

function ComparisonBarChart(props) {
  let card;
  const [cardWidth, setCardWidth] = createSignal(154);
  onMount(() => {
    const observer = new ResizeObserver(() => setCardWidth(card.clientWidth));
    observer.observe(card);
    setCardWidth(card.clientWidth);
    onCleanup(() => observer.disconnect());
  });
  const chart = () => props.chart;
  const geometry = () => props.geometry();
  const scale = createMemo(() => comparisonScale(chart()));
  const width = () => Math.max(cardWidth(), chart().series.length * 53 + 42);
  const plotWidth = () => width() - 46;
  const baseline = () => geometry().baseline;
  const y = value => baseline() - value / scale().max * (baseline() - geometry().top);
  const center = index => 34 + (index + 0.5) * plotWidth() / Math.max(1, chart().series.length);
  const barWidth = () => Math.min(30, plotWidth() / Math.max(1, chart().series.length) * 0.55);
  return <section ref={card} class="peak-comparison-card">
    <svg viewBox={`0 0 ${width()} ${geometry().height}`} style={{"min-width": `${width()}px`, height: `${geometry().height}px`, "font-family": "Helvetica, Arial, sans-serif", "font-size": `${12 * geometry().scale}px`}} role="img" aria-label={`${t(chart().label)} (${chart().unit})`}>
      <title>{`${t(chart().label)} (${chart().unit})`}</title>
      <text x={width() / 2} y={27 * geometry().scale} text-anchor="middle" font-size="12" font-weight="600">{t(chart().label)}</text>
      <text x="34" y={78 * geometry().scale} font-size={13 * geometry().scale}>{chart().unit}</text>
      <Show when={chart().interval}>{interval => <>
        <Show when={interval().hasSpread}>
          <rect data-reference-band x="34" y={y(interval().upper)} width={plotWidth()} height={y(interval().lower) - y(interval().upper)} fill="#e5e7eb">
            <title>{`${t("Viitearvo")}: ${number(interval().lower, chart().decimals)}–${number(interval().upper, chart().decimals)} ${chart().unit}`}</title>
          </rect>
        </Show>
      </>}</Show>
      <For each={scale().ticks}>{tick => <g>
        <line x1="30" x2="34" y1={y(tick)} y2={y(tick)} stroke="#9ca3af" />
        <text data-comparison-y-tick x="27" y={y(tick) + 3.5 * geometry().scale} text-anchor="end" fill="black">{number(tick, tick % 1 ? 1 : 0)}</text>
      </g>}</For>
      <line x1="34" x2="34" y1={geometry().top} y2={baseline()} stroke="#9ca3af" />
      <line data-comparison-baseline x1="34" x2={34 + plotWidth()} y1={baseline()} y2={baseline()} stroke="#9ca3af" />
      <For each={chart().series}>{(entry, index) => <g>
        <Show when={entry.value != null}>
          <rect data-comparison-bar x={center(index()) - barWidth() / 2} y={y(entry.value)} width={barWidth()} height={baseline() - y(entry.value)} rx="2" fill={entry.color}>
            <title>{`${sideLabel(entry.side)} ${entry.date}: ${number(entry.value, chart().decimals)} ${chart().unit}`}</title>
          </rect>
        </Show>
        <text x={center(index())} y={entry.value != null ? y(entry.value) - 9 * geometry().scale : baseline() - 10} text-anchor="middle" font-weight="600">{number(entry.value, chart().decimals)}</text>
        <text data-comparison-x-tick x={center(index())} y={baseline() + 28 * geometry().scale} text-anchor="middle" fill="black">{sideLabel(entry.side)}</text>
        <Show when={entry.date}><text x={center(index())} y={baseline() + 43 * geometry().scale} text-anchor="middle" font-size={8.5 * geometry().scale}>{entry.date}</text></Show>
      </g>}</For>
      <Show when={chart().interval}>{interval => <line data-reference-mean x1="34" x2={34 + plotWidth()} y1={y(interval().mean)} y2={y(interval().mean)} stroke="#6b7280" stroke-width="1.3" stroke-dasharray="4 3" />}</Show>
    </svg>
    <p class="comparison-reference-caption">
      <Show when={chart().interval} fallback={t("Ei viitearvoa")}>
        <span class="comparison-reference-swatch" />
        {chart().interval?.hasSpread && Number.isFinite(chart().reference?.mean) ? t("Viite: keskiarvo ± SD") : t("Viitearvo")}
      </Show>
    </p>
  </section>;
}
