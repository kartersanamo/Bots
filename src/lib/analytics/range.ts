import type { AnalyticsRange } from "@/lib/analytics/types";

const RANGE_SECONDS: Record<Exclude<AnalyticsRange, "all" | "today">, number> =
  {
    "7d": 7 * 86400,
    "30d": 30 * 86400,
    "90d": 90 * 86400,
    "365d": 365 * 86400,
  };

export function parseAnalyticsRange(input: string | null): AnalyticsRange {
  if (
    input === "today" ||
    input === "7d" ||
    input === "30d" ||
    input === "90d" ||
    input === "365d" ||
    input === "all"
  ) {
    return input;
  }
  return "30d";
}

export function rangeSinceUnix(range: AnalyticsRange): number | null {
  if (range === "all") return null;
  if (range === "today") {
    const now = new Date();
    const startUtc = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    );
    return Math.floor(startUtc / 1000);
  }
  return Math.floor(Date.now() / 1000) - RANGE_SECONDS[range];
}

/** Filter on ticket `opened_at` unix column */
export function openedAtRangeClause(range: AnalyticsRange): {
  sql: string;
  params: number[];
} {
  const since = rangeSinceUnix(range);
  if (since === null) return { sql: "", params: [] };
  return {
    sql: " AND CAST(opened_at AS UNSIGNED) > 0 AND CAST(opened_at AS UNSIGNED) >= ?",
    params: [since],
  };
}

/** Filter on ticket `closed_at` when valid */
export function closedAtRangeClause(range: AnalyticsRange): {
  sql: string;
  params: number[];
} {
  const since = rangeSinceUnix(range);
  const base =
    " AND TRIM(closed_at) != '' AND closed_at IS NOT NULL AND closed_at NOT IN ('0', '00000000')";
  if (since === null) return { sql: base, params: [] };
  return {
    sql: `${base} AND CAST(closed_at AS UNSIGNED) >= ?`,
    params: [since],
  };
}

export function xpTimestampRangeClause(
  range: AnalyticsRange,
  column = "timestamp"
): { sql: string; params: number[] } {
  const since = rangeSinceUnix(range);
  if (since === null) return { sql: "", params: [] };
  return {
    sql: ` AND CAST(${column} AS UNSIGNED) >= ?`,
    params: [since],
  };
}

export function rangeLabel(range: AnalyticsRange): string {
  const labels: Record<AnalyticsRange, string> = {
    today: "Today",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    "365d": "Last year",
    all: "All time",
  };
  return labels[range];
}
