import { stat } from "fs/promises";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import path from "path";
import type { AuditEntry } from "@/lib/audit";
import { rangeSinceUnix } from "@/lib/analytics/range";
import type { AnalyticsRange, AuditAnalytics, DailyCount, NamedCount } from "@/lib/analytics/types";

const AUDIT_FILE = path.join(process.cwd(), "data", "audit", "audit.jsonl");
const TAIL_BYTES = 2 * 1024 * 1024;

export async function getAuditCountInRange(
  range: AnalyticsRange
): Promise<number> {
  const sinceMs = rangeSinceUnix(range);
  return (await aggregateAuditTail(sinceMs != null ? sinceMs * 1000 : null)).total;
}

export async function getAuditAnalytics(
  range: AnalyticsRange
): Promise<AuditAnalytics> {
  const sinceMs = rangeSinceUnix(range);
  const agg = await aggregateAuditTail(
    sinceMs != null ? sinceMs * 1000 : null
  );

  const actionsPerDay: DailyCount[] = [...agg.byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const topActors = [...agg.byActor.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([actorId, count]) => ({ actorId, count }));

  const topActions: NamedCount[] = [...agg.byAction.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }));

  return {
    range,
    actionsPerDay,
    topActors,
    topActions,
    fleetRestarts: agg.fleetRestarts,
    totalInRange: agg.total,
  };
}

async function aggregateAuditTail(sinceMs: number | null): Promise<{
  byDay: Map<string, number>;
  byActor: Map<string, number>;
  byAction: Map<string, number>;
  fleetRestarts: number;
  total: number;
}> {
  const byDay = new Map<string, number>();
  const byActor = new Map<string, number>();
  const byAction = new Map<string, number>();
  let fleetRestarts = 0;
  let total = 0;

  try {
    const fileStat = await stat(AUDIT_FILE);
    if (fileStat.size === 0) {
      return { byDay, byActor, byAction, fleetRestarts, total };
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
        if (sinceMs != null) {
          const t = new Date(entry.timestamp).getTime();
          if (t < sinceMs) continue;
        }
        total++;
        const day = entry.timestamp.slice(0, 10);
        byDay.set(day, (byDay.get(day) ?? 0) + 1);
        byActor.set(entry.actorId, (byActor.get(entry.actorId) ?? 0) + 1);
        byAction.set(entry.action, (byAction.get(entry.action) ?? 0) + 1);
        if (/restart/i.test(entry.action)) fleetRestarts++;
      } catch {
        /* skip */
      }
    }
  } catch {
    /* missing file */
  }

  return { byDay, byActor, byAction, fleetRestarts, total };
}
