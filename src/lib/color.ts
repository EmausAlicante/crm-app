// Neutral fallback for tags nobody has assigned a custom color to yet.
export const DEFAULT_TAG_COLOR = "#64748b"; // slate-500

// Picks a readable text color (near-black or white) for an arbitrary hex
// background, so a colored tag badge stays legible regardless of which color
// the user picks (e.g. yellow needs dark text, dark red needs white text).
export function contrastTextColor(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1e293b" : "#ffffff";
}
