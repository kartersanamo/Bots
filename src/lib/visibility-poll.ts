/** Poll interval when tab is visible vs backgrounded. */
export function pollIntervalMs(visibleMs: number, hiddenMs: number): number {
  if (typeof document === "undefined") return visibleMs;
  return document.visibilityState === "visible" ? visibleMs : hiddenMs;
}
