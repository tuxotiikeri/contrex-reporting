// Presentation only: never feed these curves back into repetition statistics.
export function createTorqueDisplay(rawObject, direction, step = 0.1) {
  const endIndex = Math.round(90 / step);
  const grid = Array.from({length: endIndex + 1}, (_, i) => i * step);
  const color = direction === "Ext" ? "red" : "blue";
  const configured = [rawObject.setUp?.mov1, rawObject.setUp?.mov2].map(Number);
  const repetitions = rawObject.splitCollections.movement.splits
    .filter(split => !split.disabled && split.color === color);
  const curves = repetitions.map(split => {
    const samples = [];
    for (let i = split.startIndex; i <= split.endIndex; i++) {
      samples.push([Math.abs(rawObject.pointCollections.angle.points[i]),
        Math.abs(rawObject.pointCollections.power.points[i])]);
    }
    samples.sort((a, b) => a[0] - b[0]);
    if (!samples.length) return null;
    const bounds = configured.every(Number.isFinite)
      ? configured.map(Math.abs).sort((a, b) => a - b)
      : [samples[0][0], samples.at(-1)[0]];
    // The boundary zeros denote the displayed movement window, not measured
    // zero torque. Preserve all interior samples and interpolate by real angle.
    const nodes = [[bounds[0], 0],
      ...samples.filter(([angle]) => angle > bounds[0] && angle < bounds[1]),
      [bounds[1], 0]];
    let cursor = 0;
    const points = grid.map(angle => {
      if (angle <= bounds[0] || angle >= bounds[1]) return 0;
      while (cursor < nodes.length - 2 && nodes[cursor + 1][0] < angle) cursor++;
      const [x0, y0] = nodes[cursor];
      const [x1, y1] = nodes[cursor + 1];
      return x1 === x0 ? y1 : y0 + (y1 - y0) * (angle - x0) / (x1 - x0);
    });
    return {points, bounds};
  }).filter(Boolean);
  const points = grid.map((_, i) => curves.length
    ? curves.reduce((sum, curve) => sum + curve.points[i], 0) / curves.length : 0);
  const lower = grid.map((_, i) => curves.length
    ? points[i] + (Math.min(...curves.map(c => c.points[i])) - points[i]) * 0.8 : 0);
  const upper = grid.map((_, i) => curves.length
    ? points[i] + (Math.max(...curves.map(c => c.points[i])) - points[i]) * 0.8 : 0);
  const active = grid.map(angle => curves.length > 0 && curves.every(c =>
    angle > c.bounds[0] && angle < c.bounds[1]));
  return {points, error: [lower, upper], active,
    split: {startIndex: 0, endIndex, splits: [{color, startIndex: 0, endIndex}]}};
}
