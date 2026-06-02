import type { DailyCount } from "@/lib/analytics/types";

export interface DataSpan {
  oldest: string;
  newest: string;
}

/** Dates with non-zero counts (actual records), not empty chart buckets. */
export function dataSpanFromDaily(rows: DailyCount[]): DataSpan | null {
  const withData = rows.filter((r) => r.count > 0);
  if (!withData.length) return null;

  const sorted = [...withData].sort((a, b) => a.date.localeCompare(b.date));
  return {
    oldest: sorted[0]!.date,
    newest: sorted[sorted.length - 1]!.date,
  };
}

export function dataSpanFromDailies(
  ...series: DailyCount[][]
): DataSpan | null {
  return dataSpanFromDaily(series.flat());
}

/** Span from ISO date keys on rows (e.g. ticket spike dates). */
export function dataSpanFromDateStrings(dates: string[]): DataSpan | null {
  const valid = dates.filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d));
  if (!valid.length) return null;

  const sorted = [...valid].sort((a, b) => a.localeCompare(b));
  return {
    oldest: sorted[0]!,
    newest: sorted[sorted.length - 1]!,
  };
}

/** Span from unix timestamps (seconds) on individual records. */
export function dataSpanFromUnixTimestamps(
  timestamps: number[]
): DataSpan | null {
  const valid = timestamps.filter((t) => t > 0);
  if (!valid.length) return null;

  const sorted = [...valid].sort((a, b) => a - b);
  const oldest = new Date(sorted[0]! * 1000).toISOString().slice(0, 10);
  const newest = new Date(sorted[sorted.length - 1]! * 1000)
    .toISOString()
    .slice(0, 10);
  return { oldest, newest };
}

/** Human-readable bucket label (day, week, or month keys from charts). */
export function formatBucketDate(dateKey: string): string {
  if (dateKey.includes("–")) {
    const [start, end] = dateKey.split("–");
    return `${formatBucketDate(start!)} – ${formatBucketDate(end!)}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
      dateStyle: "long",
    });
  }

  if (/^\d{4}-\d{2}$/.test(dateKey)) {
    const [y, m] = dateKey.split("-").map(Number);
    return new Date(y!, m! - 1, 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }

  if (/^\d{4}-W\d{2}$/.test(dateKey)) {
    return dateKey.replace(/-W/, " week ");
  }

  return dateKey;
}
