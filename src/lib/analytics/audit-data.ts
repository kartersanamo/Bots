import { createReadStream } from "fs";
import { createInterface } from "readline";
import path from "path";
import { stat } from "fs/promises";
import type { AuditEntry } from "@/lib/audit";
import { rangeSinceUnix } from "@/lib/analytics/range";
import type { AnalyticsRange, AuditAnalytics, DailyCount, NamedCount } from "@/lib/analytics/types";

const AUDIT_FILE = path.join(process.cwd(), "data", "audit", "audit.jsonl");

export async function getAuditAnalytics(
  range: AnalyticsRange
): Promise<AuditAnalytics> {
  const sinceMs =
    rangeSinceUnix(range) != null
      ? rangeSinceUnix(range)! * 1000
      : null;

  const entries = await readAuditEntries(sinceMs);

  const byDay = new Map<string, number>();
  const byActor = new Map<string, number>();
  const byAction = new Map<string, number>();
  let fleetRestarts = 0;

  for (const e of entries) {
    const day = e.timestamp.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    byActor.set(e.actorId, (byActor.get(e.actorId) ?? 0) + 1);
    byAction.set(e.action, (byAction.get(e.action) ?? 0) + 1);
    if (/restart/i.test(e.action)) fleetRestarts++;
  }

  const actionsPerDay: DailyCount[] = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const topActors = [...byActor.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([actorId, count]) => ({ actorId, count }));

  const topActions: NamedCount[] = [...byAction.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }));

  return {
    range,
    actionsPerDay,
    topActors,
    topActions,
    fleetRestarts,
    totalInRange: entries.length,
  };
}

async function readAuditEntries(sinceMs: number | null): Promise<AuditEntry[]> {
  try {
    await stat(AUDIT_FILE);
  } catch {
    return [];
  }

  const out: AuditEntry[] = [];
  const stream = createReadStream(AUDIT_FILE, { encoding: "utf-8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line) as AuditEntry;
      if (sinceMs != null) {
        const t = new Date(entry.timestamp).getTime();
        if (t < sinceMs) continue;
      }
      out.push(entry);
    } catch {
      /* skip malformed */
    }
  }

  return out;
}
