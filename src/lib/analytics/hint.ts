import { groupByLabel, type AnalyticsGroupBy } from "@/lib/analytics/group-by";
import { rangeLabel, rangeSinceUnix } from "@/lib/analytics/range";
import type { AnalyticsRange } from "@/lib/analytics/types";

export interface AnalyticsDataMeta {
  /** What this number or chart measures. */
  description: string;
  /** Replaces the auto-generated period line when set. */
  rangeLabel?: string;
  /** Defaults to context.rangeApplies when omitted. */
  rangeApplies?: boolean;
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

export function formatRangeSinceDate(range: AnalyticsRange): string | null {
  const since = rangeSinceUnix(range);
  if (since == null) return null;
  return new Date(since * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatHintRangeLine(
  ctx: AnalyticsHintContext,
  meta?: AnalyticsDataMeta
): string {
  if (meta?.rangeLabel) return meta.rangeLabel;

  const applies = meta?.rangeApplies ?? ctx.rangeApplies;
  if (!applies) {
    return "Period: Current bi-weekly statistics period since the last MinecadiaStaff /wipe. Not controlled by the dashboard range selector.";
  }

  const label = rangeLabel(ctx.range);
  const since = formatRangeSinceDate(ctx.range);

  if (ctx.range === "all") {
    return `Period: ${label}. ${ALL_TIME_DATA_CAVEAT} Time-series charts are grouped by ${groupByLabel(ctx.groupBy)}.`;
  }

  const start = since ? ` From ${since} UTC.` : "";
  return `Period: ${label}.${start} Time-series charts use ${groupByLabel(ctx.groupBy)} buckets.`;
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
