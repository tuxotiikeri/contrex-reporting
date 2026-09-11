import baseAutoTable from "jspdf-autotable";
import {language} from "./index.js";
import {translate, translateTableRows} from "./catalog.js";

const reportLanguages = new WeakMap();
export function setReportLanguage(pdf) { reportLanguages.set(pdf, language()); }
// The report uses the built-in Helvetica font (WinAnsi), not a Unicode font.
// Keep mathematical comparisons legible instead of emitting missing glyphs.
export function pdfSafeText(value) {
  if (Array.isArray(value)) return value.map(pdfSafeText);
  return typeof value === "string"
    ? value.replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/−/g, "-")
    : value;
}
export const reportText = (pdf, value) => pdfSafeText(translate(value, reportLanguages.get(pdf) ?? language()));

function reportRows(rows, locale) {
  return translateTableRows(rows, locale)?.map(row => Array.isArray(row) ? row.map(cell =>
    typeof cell === "object" && cell !== null
      ? {...cell, content: pdfSafeText(cell.content)} : pdfSafeText(cell),
  ) : row);
}

export function localizedAutoTable(pdf, options) {
  const locale = reportLanguages.get(pdf) ?? language();
  return baseAutoTable(pdf, {
    ...options,
    head: reportRows(options.head, locale),
    body: reportRows(options.body, locale),
    foot: reportRows(options.foot, locale),
  });
}
