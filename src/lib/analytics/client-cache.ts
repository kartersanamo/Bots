"use client";

const PREFIX = "analytics:v2:";

export function readAnalyticsCache<T>(key: string): T | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw) as { at: number; data: T };
    if (Date.now() - at > 5 * 60_000) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeAnalyticsCache<T>(key: string, data: T): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      PREFIX + key,
      JSON.stringify({ at: Date.now(), data })
    );
  } catch {
    /* quota */
  }
}
