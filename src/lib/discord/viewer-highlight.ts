import type { CSSProperties } from "react";

/** Role color → rgba for very subtle self-highlight backgrounds. */
export function roleColorRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return `rgba(165, 180, 252, ${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Barely-there tint + hairline underline using the viewer's top role color. */
export function subtleViewerHighlightStyle(
  roleHex: string | undefined
): CSSProperties | undefined {
  const base = roleHex ?? "#94a3b8";
  return {
    backgroundColor: roleColorRgba(base, 0.06),
    boxShadow: `inset 0 -1px 0 ${roleColorRgba(base, 0.2)}`,
    borderRadius: 2,
  };
}
