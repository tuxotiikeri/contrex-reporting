const normalizeSide = (side) => {
  const value = String(side ?? "").toLowerCase();
  if (value === "left" || value.includes("vasen")) return "left";
  if (value === "right" || value.includes("oikea")) return "right";
  return null;
};

/**
 * Resolves the comparison direction without changing the displayed leg names.
 * If no symptomatic side is defined, the weaker quadriceps result in the
 * 60°/s concentric test is treated as the involved side.
 */
export function resolveComparisonSides(involvedSide, files = []) {
  const explicitInvolved = normalizeSide(involvedSide);
  if (explicitInvolved) {
    return {
      involvedSide: explicitInvolved,
      referenceSide: explicitInvolved === "left" ? "right" : "left",
      inferred: false,
    };
  }

  const kons60 = files.filter((file) =>
    String(file?.rawObject?.programType ?? file?.measurementType ?? "").includes("kons/kons 60/60"),
  );
  const right = kons60.find((file) => file.legSide === "right" || file?.rawObject?.configuration?.side?.[1] === "right");
  const left = kons60.find((file) => file.legSide === "left" || file?.rawObject?.configuration?.side?.[1] === "left");
  const rightPeak = Math.abs(Number(right?.rawObject?.analysis?.[110]));
  const leftPeak = Math.abs(Number(left?.rawObject?.analysis?.[110]));

  if (Number.isFinite(rightPeak) && Number.isFinite(leftPeak) && rightPeak > 0 && leftPeak > 0) {
    const referenceSide = rightPeak >= leftPeak ? "right" : "left";
    return {
      referenceSide,
      involvedSide: referenceSide === "left" ? "right" : "left",
      inferred: true,
    };
  }

  return { involvedSide: null, referenceSide: null, inferred: false };
}
