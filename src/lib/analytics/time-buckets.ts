import type { AnalyticsRange } from "@/lib/analytics/types";
import type { DailyCount } from "@/lib/analytics/types";

export type BucketGranularity = "day" | "week" | "month";

export interface TimeBucketSpec {
  granularity: BucketGranularity;
  /** Max points sent to charts (hard cap). */
  maxPoints: number;
}

const MAX_CHART_POINTS = 60;

export function getTimeBucketSpec(range: AnalyticsRange): TimeBucketSpec {
  switch (range) {
    case "7d":
      return { granularity: "day", maxPoints: 7 };
    case "30d":
      return { granularity: "day", maxPoints: 31 };
    case "90d":
      return { granularity: "week", maxPoints: 14 };
    case "365d":
      return { granularity: "week", maxPoints: 52 };
    case "all":
      return { granularity: "month", maxPoints: MAX_CHART_POINTS };
    default:
      return { granularity: "day", maxPoints: 31 };
  }
}

/** Bucket key from a unix timestamp column (opened_at, closed_at, timestamp, …). */
export function bucketKeySqlFromUnix(column: string, spec: TimeBucketSpec): string {
  const col = `CAST(${column} AS UNSIGNED)`;
  switch (spec.granularity) {
    case "day":
      return `DATE(FROM_UNIXTIME(${col}))`;
    case "week":
      return `DATE_FORMAT(FROM_UNIXTIME(${col}), '%x-W%v')`;
    case "month":
      return `DATE_FORMAT(FROM_UNIXTIME(${col}), '%Y-%m')`;
  }
}

/** Bucket key from a DATE/DATETIME column. */
export function bucketKeySqlFromDate(column: string, spec: TimeBucketSpec): string {
  switch (spec.granularity) {
    case "day":
      return `DATE(${column})`;
    case "week":
      return `DATE_FORMAT(${column}, '%x-W%v')`;
    case "month":
      return `DATE_FORMAT(${column}, '%Y-%m')`;
  }
}

/** Bucket an ISO date string (audit JSONL) in application code. */
export function bucketIsoDay(isoDay: string, spec: TimeBucketSpec): string {
  if (spec.granularity === "day") return isoDay.slice(0, 10);
  const d = new Date(isoDay + "T12:00:00Z");
  if (spec.granularity === "month") {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - jan1.getTime()) / 86400000 + jan1.getUTCDay() + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function formatBucketLabel(key: string, spec: TimeBucketSpec): string {
  if (spec.granularity === "day") return key.slice(5);
  if (spec.granularity === "month") return key;
  return key.replace(/^\d{4}-W/, "W");
}

/** Merge daily rows into larger buckets (server or client). */
export function aggregateDailyCounts(
  rows: DailyCount[],
  spec: TimeBucketSpec
): DailyCount[] {
  if (!rows.length) return rows;

  const map = new Map<string, number>();
  for (const row of rows) {
    const key = bucketIsoDay(row.date, spec);
    map.set(key, (map.get(key) ?? 0) + row.count);
  }

  return [...map.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Final safety cap — merge adjacent buckets if still too many points. */
export function capTimeSeries(points: DailyCount[], maxPoints: number): DailyCount[] {
  if (points.length <= maxPoints) return points;

  const size = Math.ceil(points.length / maxPoints);
  const out: DailyCount[] = [];
  for (let i = 0; i < points.length; i += size) {
    const chunk = points.slice(i, i + size);
    const count = chunk.reduce((s, p) => s + p.count, 0);
    out.push({
      date: chunk.length === 1 ? chunk[0].date : `${chunk[0].date}–${chunk[chunk.length - 1].date}`,
      count,
    });
  }
  return out;
}

export function normalizeTimeSeries(
  rows: DailyCount[],
  range: AnalyticsRange
): DailyCount[] {
  const spec = getTimeBucketSpec(range);
  if (!rows.length) return rows;

  const looksDaily = /^\d{4}-\d{2}-\d{2}$/.test(rows[0]!.date);
  const series =
    looksDaily && spec.granularity !== "day"
      ? aggregateDailyCounts(rows, spec)
      : rows;
  return capTimeSeries(series, spec.maxPoints);
}

/** Approximate percentile from duration histogram (minutes buckets). */
export function percentileFromHistogram(
  buckets: { bucket: number; cnt: number }[],
  p: number
): number | null {
  const sorted = [...buckets].sort((a, b) => a.bucket - b.bucket);
  const total = sorted.reduce((s, b) => s + b.cnt, 0);
  if (total === 0) return null;
  const target = total * p;
  let cum = 0;
  for (const b of sorted) {
    cum += b.cnt;
    if (cum >= target) return b.bucket * 60;
  }
  return sorted[sorted.length - 1]!.bucket * 60;
}
