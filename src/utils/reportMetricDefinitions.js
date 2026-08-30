export function reportMetricIndices(testKey) {
  const isEccentric = testKey === "eks30";
  return {
    quadriceps: isEccentric
      ? {torque: 111, bw: 204, averageWork: 123, totalWork: 213}
      : {torque: 110, bw: 203, averageWork: 122, totalWork: 212},
    hamstrings: isEccentric
      ? {torque: 110, bw: 203, averageWork: 122, totalWork: 212}
      : {torque: 111, bw: 204, averageWork: 123, totalWork: 213},
  };
}

export function mixedRatio(eccentricHamstrings, concentricQuadriceps) {
  const numerator = Math.abs(Number(eccentricHamstrings));
  const denominator = Math.abs(Number(concentricQuadriceps));
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
    ? (numerator / denominator) * 100
    : NaN;
}
