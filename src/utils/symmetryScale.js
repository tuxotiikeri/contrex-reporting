export const SYMMETRY_SCALE = Object.freeze({min: 75, max: 125, greenMin: 90, greenMax: 110, redMin: 80, redMax: 120});

export function symmetryMarkerPosition(percentage) {
  const value = Number(percentage);
  const {min, max} = SYMMETRY_SCALE;
  const clamped = Number.isFinite(value) ? Math.min(Math.max(value, min), max) : 100;
  return (clamped - min) / (max - min);
}

// The scale is deliberately simple: a broad clinically acceptable green band,
// orange on either side, and red only at the clearly asymmetric extremes.
export function symmetryScaleSegments() {
  return [
    [75, 80, [250, 202, 198]],
    [80, 90, [251, 224, 198]],
    [90, 110, [211, 233, 204]],
    [110, 120, [251, 224, 198]],
    [120, 125, [250, 202, 198]],
  ];
}

export function symmetryStatusColor(percentage) {
  const value = Number(percentage);
  if (!Number.isFinite(value)) return null;
  if (value < SYMMETRY_SCALE.redMin || value > SYMMETRY_SCALE.redMax) return "red";
  if (value < SYMMETRY_SCALE.greenMin || value > SYMMETRY_SCALE.greenMax) return "orange";
  return "green";
}
