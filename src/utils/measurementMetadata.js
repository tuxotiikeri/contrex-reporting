// Source files may be exported by either the Finnish or English CON-TREX UI.
// Canonical analysis keys must never depend on the export or display language.
const MODE = /(?:^|[^a-z])(kons(?:entrinen)?|con(?:centric)?|eks(?:entrinen)?|ecc(?:entric)?|cpm)(?:\s*\/\s*(kons(?:entrinen)?|con(?:centric)?|eks(?:entrinen)?|ecc(?:entric)?|cpm))?(?=$|[^a-z])/i;
const canonicalMode = value => /^(kons|con)/i.test(value) ? "kons" : /^(eks|ecc)/i.test(value) ? "eks" : "cpm";

export function measurementProtocol(input) {
  const raw = input?.rawObject ?? input;
  const config = raw?.configuration ?? (raw?.program ? raw : null);
  const texts = typeof raw === "string" ? [raw] : [
    config?.program?.[1], raw?.programType, input?.measurementType, raw?.measurement?.name,
  ];
  for (const text of texts) {
    const match = MODE.exec(String(text ?? ""));
    if (!match) continue;
    const mode1 = canonicalMode(match[1]);
    const mode2 = canonicalMode(match[2] ?? match[1]);
    const writtenSpeed = String(text).slice(match.index + match[0].length)
      .match(/^\s*(-?\d+(?:[.,]\d+)?)(?:\s*\/\s*(-?\d+(?:[.,]\d+)?))?/);
    const speeds = config?.speed ?? (writtenSpeed ? [writtenSpeed[1], writtenSpeed[2] ?? writtenSpeed[1]] : null);
    if (!speeds) continue;
    const speed1 = Math.abs(Number(String(speeds[0]).replace(",", ".")));
    const speed2 = Math.abs(Number(String(speeds[1] ?? speeds[0]).replace(",", ".")));
    if (!Number.isFinite(speed1) || !Number.isFinite(speed2)) continue;
    return {
      mode1, mode2, speed1, speed2,
      label: `${mode1 === mode2 ? mode1 : `${mode1}/${mode2}`} ${speed1 === speed2 ? speed1 : `${speed1}/${speed2}`}`,
      key: mode1 === mode2 && mode1 !== "cpm" && speed1 === speed2 ? `${mode1}${speed1}` : null,
    };
  }
  return null;
}

export const measurementProtocolKey = input => measurementProtocol(input)?.key ?? null;

export function normalizeSubjectSex(value) {
  const values = Array.isArray(value) ? [...value].reverse() : [value];
  for (const part of values) {
    const text = String(part ?? "").trim().toLowerCase();
    if (["male", "man", "mies", "m", "1"].includes(text)) return "Mies";
    if (["female", "woman", "nainen", "f", "2"].includes(text)) return "Nainen";
    if (["other", "muu"].includes(text)) return "Muu";
  }
  return "";
}

export function groupReportFiles(files, supportedKeys) {
  const groups = {};
  for (const file of files) {
    const key = measurementProtocolKey(file);
    const raw = file.rawObject;
    const side = file.legSide ?? raw?.configuration?.side?.[1];
    if (!supportedKeys.includes(key) || !["left", "right"].includes(side)
      || !Number.isFinite(raw?.analysis?.[110])) continue;
    groups[key] ??= {};
    groups[key][side] = raw.analysis;
  }
  return groups;
}
