import { stat } from "fs/promises";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import path from "path";
import { fillHourOfDayBuckets } from "@/lib/analytics/buckets";
import type { AuditEntry } from "@/lib/audit";
import { rangeSinceUnix } from "@/lib/analytics/range";
import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import {
  bucketIsoDay,
  buildTimeBucketSpec,
  normalizeTimeSeries,
} from "@/lib/analytics/time-buckets";
import { enrichAuditTargets } from "@/lib/analytics/audit-target-enrichment";
import type { AnalyticsRange, AuditAnalytics, DailyCount, NamedCount } from "@/lib/analytics/types";

const AUDIT_FILE = path.join(process.cwd(), "data", "audit", "audit.jsonl");
const TAIL_BYTES = 4 * 1024 * 1024;
const AUDIT_AGG_TTL_MS = 5 * 60_000;

type AuditAggregate = Awaited<ReturnType<typeof aggregateAuditTail>>;
const auditAggregateCache = new Map<
  string,
  { expires: number; data: AuditAggregate }
>();

async function getAuditAggregate(
  sinceMs: number | null
): Promise<AuditAggregate> {
  const key = sinceMs == null ? "all" : String(sinceMs);
  const hit = auditAggregateCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;
  const data = await aggregateAuditTail(sinceMs);
  auditAggregateCache.set(key, {
    expires: Date.now() + AUDIT_AGG_TTL_MS,
    data,
  });
  return data;
}

export async function getAuditSummaryInRange(
  range: AnalyticsRange
): Promise<{ total: number; fleetRestarts: number }> {
  const sinceMs = rangeSinceUnix(range);
  const agg = await getAuditAggregate(sinceMs != null ? sinceMs * 1000 : null);
  return { total: agg.total, fleetRestarts: agg.fleetRestarts };
}

export async function getAuditCountInRange(
  range: AnalyticsRange
): Promise<number> {
  return (await getAuditSummaryInRange(range)).total;
}

export async function getAuditAnalytics(
  range: AnalyticsRange,
  groupBy: AnalyticsGroupBy
): Promise<AuditAnalytics> {
  const sinceMs = rangeSinceUnix(range);
  const agg = await getAuditAggregate(sinceMs != null ? sinceMs * 1000 : null);

  const spec = buildTimeBucketSpec(range, groupBy);
  const bucketed = new Map<string, number>();
  for (const [day, count] of agg.byDay) {
    const key = bucketIsoDay(day, spec);
    bucketed.set(key, (bucketed.get(key) ?? 0) + count);
  }
  const actionsPerDay = normalizeTimeSeries(
    [...bucketed.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    range,
    groupBy
  );

  const topActors = [...agg.byActor.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([actorId, count]) => ({ actorId, count }));

  const topActions: NamedCount[] = [...agg.byAction.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }));

  const topTargetsRaw: NamedCount[] = [...agg.byTarget.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, count]) => ({ name, count }));

  const topTargets = await enrichAuditTargets(topTargetsRaw);

  const successRatePercent =
    agg.total > 0
      ? Math.round(((agg.total - agg.failed) / agg.total) * 1000) / 10
      : 100;

  return {
    range,
    groupBy,
    actionsPerDay,
    topActors,
    topActions,
    topTargets,
    byHour: fillHourOfDayBuckets(agg.byHour),
    fleetRestarts: agg.fleetRestarts,
    totalInRange: agg.total,
    failedActions: agg.failed,
    successRatePercent,
  };
}

async function aggregateAuditTail(sinceMs: number | null): Promise<{
  byDay: Map<string, number>;
  byActor: Map<string, number>;
  byAction: Map<string, number>;
  byTarget: Map<string, number>;
  byHour: { hour: number; count: number }[];
  fleetRestarts: number;
  total: number;
  failed: number;
}> {
  const byDay = new Map<string, number>();
  const byActor = new Map<string, number>();
  const byAction = new Map<string, number>();
  const byTarget = new Map<string, number>();
  const hourTotals = new Map<number, number>();
  let fleetRestarts = 0;
  let total = 0;
  let failed = 0;

  try {
    const fileStat = await stat(AUDIT_FILE);
    if (fileStat.size === 0) {
      return {
        byDay,
        byActor,
        byAction,
        byTarget,
        byHour: [],
        fleetRestarts,
        total,
        failed,
      };
    }

    const start =
      sinceMs == null && fileStat.size > TAIL_BYTES
        ? fileStat.size - TAIL_BYTES
        : 0;

    const stream = createReadStream(AUDIT_FILE, {
      encoding: "utf-8",
      start,
    });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    let firstLine = start > 0;

    for await (const line of rl) {
      if (firstLine) {
        firstLine = false;
        continue;
      }
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as AuditEntry;
        const t = new Date(entry.timestamp).getTime();
        if (sinceMs != null && t < sinceMs) continue;

        total++;
        if (!entry.success) failed++;

        const day = entry.timestamp.slice(0, 10);
        byDay.set(day, (byDay.get(day) ?? 0) + 1);
        byActor.set(entry.actorId, (byActor.get(entry.actorId) ?? 0) + 1);
        byAction.set(entry.action, (byAction.get(entry.action) ?? 0) + 1);

        const targetKey = entry.target?.trim() || "—";
        byTarget.set(targetKey, (byTarget.get(targetKey) ?? 0) + 1);

        const hour = new Date(entry.timestamp).getUTCHours();
        hourTotals.set(hour, (hourTotals.get(hour) ?? 0) + 1);

        if (/restart/i.test(entry.action)) fleetRestarts++;
      } catch {
        /* skip */
      }
    }
  } catch {
    /* missing file */
  }

  const byHour = [...hourTotals.entries()].map(([hour, count]) => ({
    hour,
    count,
  }));

  return {
    byDay,
    byActor,
    byAction,
    byTarget,
    byHour,
    fleetRestarts,
    total,
    failed,
  };
}
