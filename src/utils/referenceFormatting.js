// Display rounding must not alter the values used for reference comparisons.
export function referenceNumberText(value, reference) {
  if (!Number.isFinite(value) || reference?.displayDecimals == null) return String(value);
  return String(Number(value.toFixed(reference.displayDecimals)));
}
