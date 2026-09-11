/**
 * Single movement-channel -> anatomical-muscle boundary for knee ext/flex.
 * Raw Ext/Flex channels and analysis indices describe movement, NOT a muscle.
 * Never swap the raw data: apply this mapping at every presentation boundary.
 * Concentric: Ext -> quadriceps, Flex -> hamstrings.
 * Eccentric: Flex -> quadriceps (braking flexion), Ext -> hamstrings.
 * This rule is independent of leg side, measured strength and UI language.
 */
export function isEccentricProtocol(programOrRawObject) {
  const program = typeof programOrRawObject === "object"
    ? programOrRawObject?.programType || programOrRawObject?.configuration?.program?.[1]
      || programOrRawObject?.measurement?.name || ""
    : String(programOrRawObject ?? "");
  return /(?:^|[^a-z])(?:eks(?:entrinen)?|ecc(?:entric)?)(?=$|[^a-z])/i.test(program);
}

const CONCENTRIC = Object.freeze({quadriceps: "Ext", hamstrings: "Flex"});
const ECCENTRIC = Object.freeze({quadriceps: "Flex", hamstrings: "Ext"});
export function muscleCurveDirections(programOrRawObject) {
  return isEccentricProtocol(programOrRawObject) ? ECCENTRIC : CONCENTRIC;
}

const CHANNEL_METRICS = Object.freeze({
  Ext: Object.freeze({torque: 110, meanPeak: 112, bw: 203, averageWork: 122, totalWork: 212, workFatigue: 130, peakTorqueCV: 260, at200: 120, peakAngle: 114}),
  Flex: Object.freeze({torque: 111, meanPeak: 113, bw: 204, averageWork: 123, totalWork: 213, workFatigue: 131, peakTorqueCV: 261, at200: 121, peakAngle: 115}),
});
export function reportMetricIndices(programOrRawObject) {
  const directions = muscleCurveDirections(programOrRawObject);
  return {quadriceps: CHANNEL_METRICS[directions.quadriceps], hamstrings: CHANNEL_METRICS[directions.hamstrings]};
}

export function movementChannelMetricIndices(metric) {
  return {Ext: CHANNEL_METRICS.Ext[metric], Flex: CHANNEL_METRICS.Flex[metric]};
}

// Dimensionless H/Q; the caller supplies mean peak torques, work, or curve points.
export function hqRatioFromChannels(ext, flex, programOrRawObject) {
  const values = {Ext: ext, Flex: flex};
  const directions = muscleCurveDirections(programOrRawObject);
  const q = Math.abs(values[directions.quadriceps]);
  const h = Math.abs(values[directions.hamstrings]);
  return Number.isFinite(q) && Number.isFinite(h) && q > 0 ? h / q : NaN;
}

export function mixedRatio(eccentricHamstrings, concentricQuadriceps) {
  const numerator = Math.abs(Number(eccentricHamstrings));
  const denominator = Math.abs(Number(concentricQuadriceps));
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
    ? (numerator / denominator) * 100
    : NaN;
}
