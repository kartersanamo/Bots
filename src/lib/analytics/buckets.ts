import type { NamedCount } from "@/lib/analytics/types";

export function fillHourOfDayBuckets(
  rows: { hour: number; count: number }[]
): NamedCount[] {
  const totals = new Map<number, number>();
  for (const row of rows) {
    const h = Number(row.hour);
    if (h < 0 || h > 23) continue;
    totals.set(h, (totals.get(h) ?? 0) + Number(row.count));
  }
  return Array.from({ length: 24 }, (_, hour) => ({
    name: formatHourOfDayLabel(hour),
    count: totals.get(hour) ?? 0,
  }));
}

export function fillDayOfWeekBuckets(
  rows: { dow: number; count: number }[]
): NamedCount[] {
  const totals = new Map<number, number>();
  for (const row of rows) {
    const dow = Number(row.dow);
    if (dow < 1 || dow > 7) continue;
    totals.set(dow, (totals.get(dow) ?? 0) + Number(row.count));
  }
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
  return labels.map((name, i) => ({
    name,
    count: totals.get(i + 1) ?? 0,
  }));
}

function formatHourOfDayLabel(hour: number): string {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}
