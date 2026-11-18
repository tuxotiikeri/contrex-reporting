// Shared by interactive curves, report curves and report comparison bars.
export const colors = {
  right: ["oklch(0.792 0.209 151.711)", "oklch(84.1% 0.238 128.85)", "oklch(90.5% 0.182 98.111)"],
  left: ["oklch(70.4% 0.191 22.216)", "oklch(71.8% 0.202 349.761)", "oklch(71.4% 0.203 305.504)"],
  fallback: ["oklch(62.3% 0.214 259.815)", "oklch(68.5% 0.169 237.323)", "oklch(71.5% 0.143 215.221)"],
};

export function isometricTrialColours(files) {
  const counts = {left: 0, right: 0};
  return files.map(file => {
    const side = file.legSide;
    const index = counts[side] ?? 0;
    counts[side] = index + 1;
    return index === 0 ? side === "right" ? "#00ce73" : "#ff5964"
      : `hsl(${(index * 137.508 + (side === "right" ? 140 : 5)) % 360} 65% 43%)`;
  });
}
