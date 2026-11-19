export const REPORT_CHART_WIDTH_MM = 95;
export const REPORT_CHART_DPI = 300;

export function reportChartSize(width, height) {
  // At its actual 95 mm print width, 300 dpi retains crisp chart labels and
  // lines without embedding a multi-megapixel RGBA image per chart.
  const pixels = Math.round(REPORT_CHART_WIDTH_MM / 25.4 * REPORT_CHART_DPI);
  return {width: pixels, height: Math.round(pixels * height / width)};
}

export function reportFilename(patient, rawDate) {
  const name = [patient.subjectNameFirst, patient.subjectName].filter(Boolean).join(" ").trim();
  const prefix = (name || String(patient.subjectId ?? "").trim() || "contrex-reporting")
    .normalize("NFC").replace(/[\x00-\x1f\x7f\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-").replace(/[. ]+$/g, "");
  const parts = String(rawDate ?? "").trim().split(/[./-]/);
  const [dd, mm, yyyy] = parts[0]?.length === 4 ? [parts[2], parts[1], parts[0]] : parts;
  const date = /^\d{4}$/.test(yyyy ?? "") && /^\d{1,2}$/.test(mm ?? "") && /^\d{1,2}$/.test(dd ?? "")
    ? `${dd.padStart(2, "0")}_${mm.padStart(2, "0")}${yyyy}` : "mittaus";
  return `${prefix || "contrex-reporting"}_isokineettinen_${date}.pdf`;
}

export function reportReferenceSource(referenceSet, translate = value => value, testKeys = Object.keys(referenceSet?.metrics ?? {})) {
  if (!referenceSet?.source || !Object.keys(referenceSet.metrics ?? {}).length) return null;
  const sources = testKeys.filter(key => referenceSet.metrics[key]).map(key => referenceSet.protocolSources?.[key] ?? referenceSet);
  return [...new Set(sources.map(reference => {
    const source = translate(reference.source);
    return reference.doi ? `${source} DOI: ${reference.doi}` : source;
  }))].join(" | ") || null;
}
