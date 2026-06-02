import { groupByLabel, type AnalyticsGroupBy } from "@/lib/analytics/group-by";
import {
  dataSpanFromDaily,
  dataSpanFromDailies,
  dataSpanFromUnixTimestamps,
  formatBucketDate,
  type DataSpan,
} from "@/lib/analytics/data-span";
import { rangeLabel } from "@/lib/analytics/range";
import type { AnalyticsRange, DailyCount } from "@/lib/analytics/types";

export interface AnalyticsDataMeta {
  /** What this number or chart measures. */
  description: string;
  /** Fixed period text when data has no dates (snapshots, staff period, etc.). */
  rangeLabel?: string;
  /** Defaults to context.rangeApplies when omitted. */
  rangeApplies?: boolean;
  /** Oldest/newest bucket dates present in the loaded dataset. */
  dataSpan?: DataSpan | null;
  /** Builds dataSpan from daily series (non-zero points only). */
  hintSeries?: DailyCount[] | DailyCount[][];
  /** Builds dataSpan from unix timestamps on underlying rows. */
  hintTimestamps?: number[];
}

export interface AnalyticsHintContext {
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
  fetchedAt: number;
  rangeApplies: boolean;
}

export const ALL_TIME_DATA_CAVEAT =
  "“All time” only includes rows stored in the database. If tracking or the bot started recently, totals may be much lower than the server’s real history.";

export function formatRefreshedAgo(fetchedAt: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - fetchedAt) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

export function resolveDataSpan(meta?: AnalyticsDataMeta): DataSpan | null {
  if (!meta) return null;
  if (meta.dataSpan !== undefined) return meta.dataSpan;
  if (meta.hintTimestamps?.length) {
    return dataSpanFromUnixTimestamps(meta.hintTimestamps);
  }
  if (meta.hintSeries) {
    const series = meta.hintSeries;
    if (Array.isArray(series) && Array.isArray(series[0])) {
      return dataSpanFromDailies(...(series as DailyCount[][]));
    }
    if (Array.isArray(series)) {
      return dataSpanFromDaily(series as DailyCount[]);
    }
  }
  return null;
}

export function formatHintRangeLine(
  ctx: AnalyticsHintContext,
  meta?: AnalyticsDataMeta
): string {
  const span = resolveDataSpan(meta);
  if (meta?.rangeLabel && !span) {
    return meta.rangeLabel;
  }

  const applies = meta?.rangeApplies ?? ctx.rangeApplies;
  const filterNote = applies
    ? `Dashboard filter: ${rangeLabel(ctx.range)}.`
    : "";

  if (!applies && meta?.rangeLabel) {
    return meta.rangeLabel;
  }

  if (!span) {
    if (ctx.range === "all" && applies) {
      return `No dated points in the loaded chart. ${ALL_TIME_DATA_CAVEAT} ${filterNote}`.trim();
    }
    if (filterNote) {
      return `No data in the loaded result. ${filterNote}`.trim();
    }
    return "No data in the loaded result.";
  }

  const oldest = formatBucketDate(span.oldest);
  const newest = formatBucketDate(span.newest);
  const same =
    span.oldest === span.newest ||
    oldest === newest;

  if (same) {
    return `Oldest data shown: ${oldest}. ${filterNote}`.trim();
  }

  return `Data from ${oldest} through ${newest}. ${filterNote}`.trim();
}

export function buildHintTooltip(
  ctx: AnalyticsHintContext,
  meta: AnalyticsDataMeta,
  now = Date.now()
): string {
  return [
    meta.description,
    "",
    `Range: ${formatHintRangeLine(ctx, meta)}`,
    "",
    `Last refreshed: ${formatRefreshedAgo(ctx.fetchedAt, now)}`,
  ].join("\n");
}

export function enrichHint(
  meta: AnalyticsDataMeta,
  hintSeries?: DailyCount[] | DailyCount[][]
): AnalyticsDataMeta {
  if (!hintSeries) return meta;
  return { ...meta, hintSeries };
}
