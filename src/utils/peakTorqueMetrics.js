// Ext/Flex describe movement direction, not torque sign. Eccentric testing
// reverses the usual signs, so Math.max(Ext) / Math.min(Flex) selects the
// weaker repetition. Preserve the sign of the largest-magnitude sample.
export function greatestMagnitudePeak(peaks = []) {
  return peaks.reduce((best, value) => Number.isFinite(value)
    && (best === undefined || Math.abs(value) > Math.abs(best)) ? value : best, undefined);
}

export function peakTorqueMetrics(repetitions, weight) {
  const ext = greatestMagnitudePeak(repetitions.torquePeak1);
  const flex = greatestMagnitudePeak(repetitions.torquePeak2);
  const validWeight = Number.isFinite(weight) && weight > 0;
  return {
    110: ext,
    111: flex,
    // Both normalized metrics must use precisely the same selected peaks.
    203: validWeight && Number.isFinite(ext) ? ext / weight : undefined,
    204: validWeight && Number.isFinite(flex) ? flex / weight : undefined,
  };
}
