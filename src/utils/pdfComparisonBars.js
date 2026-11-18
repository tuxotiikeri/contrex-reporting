import {reportText} from "../i18n/pdf.js";
import {comparisonScale} from "./peakComparisons.js";

const label = (value, decimals = 0) => Number.isFinite(value)
  ? value.toFixed(decimals) : "–";

export function drawPdfComparisonBars(pdf, charts, top = 132) {
  // All five cards occupy the same 10–200 mm span as the curves and header.
  const width = 36;
  const gap = 2;
  const axisTop = top + 13;
  const baseline = top + 44;
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = colorCanvas.height = 1;
  const ctx = colorCanvas.getContext("2d", {willReadFrequently: true});
  charts.forEach((chart, index) => {
    const x = 10 + index * (width + gap);
    const left = x + 7;
    const right = x + width - 1;
    const scale = comparisonScale(chart);
    const y = value => baseline - (value / scale.max) * (baseline - axisTop);
    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(42, 57, 64);
    pdf.text(reportText(pdf, chart.title), x + width / 2, top + 2, {align: "center"});
    pdf.setFont("Helvetica", "normal");
    pdf.setFontSize(6.3);
    const subtitle = chart.unit === "%" ? "%" : reportText(pdf,
      chart.unit === "Nm" ? "Huippuvääntö (Nm)" : "Huippuvääntö (Nm / kg)");
    pdf.text(subtitle, x + width / 2, top + 6, {align: "center"});
    if (chart.interval?.hasSpread) {
      pdf.setFillColor(229, 231, 235);
      pdf.rect(left, y(chart.interval.upper), right - left, y(chart.interval.lower) - y(chart.interval.upper), "F");
    }
    pdf.setDrawColor(160, 167, 173);
    pdf.setLineWidth(0.15);
    pdf.line(left, axisTop, left, baseline);
    pdf.line(left, baseline, right, baseline);
    pdf.setFontSize(5.5);
    pdf.setTextColor(95, 105, 110);
    for (const tick of scale.ticks) {
      pdf.line(left - 0.6, y(tick), left, y(tick));
      pdf.text(label(tick, tick % 1 ? 1 : 0), left - 1, y(tick) + 0.6, {align: "right"});
    }
    chart.series.forEach((entry, seriesIndex) => {
      const center = left + (seriesIndex + 0.5) * (right - left) / 2;
      if (entry.value != null) {
        // Resolve the exact CSS series colour used by the SVG curves to sRGB.
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = entry.color;
        ctx.fillRect(0, 0, 1, 1);
        const rgb = ctx.getImageData(0, 0, 1, 1).data;
        pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
        pdf.rect(center - 3, y(entry.value), 6, baseline - y(entry.value), "F");
      }
      pdf.setTextColor(42, 57, 64);
      pdf.setFontSize(6.3);
      pdf.text(label(entry.value, chart.decimals), center, entry.value != null ? y(entry.value) - 1.1 : baseline - 2, {align: "center"});
      pdf.setFontSize(5.8);
      pdf.text(reportText(pdf, entry.side === "left" ? "Vasen" : "Oikea"), center, baseline + 3.2, {align: "center"});
    });
    if (chart.interval) {
      pdf.setDrawColor(107, 114, 128);
      pdf.setLineDashPattern([0.7, 0.5], 0);
      pdf.line(left, y(chart.interval.mean), right, y(chart.interval.mean));
      pdf.setLineDashPattern([], 0);
    }
  });
  if (charts.some(chart => chart.interval)) {
    pdf.setFontSize(5.8);
    pdf.setTextColor(107, 114, 128);
    pdf.text(reportText(pdf, "Harmaa alue: viitearvon vaihteluväli; katkoviiva: viitetaso."), 10, baseline + 9);
  }
  return baseline + 10;
}
