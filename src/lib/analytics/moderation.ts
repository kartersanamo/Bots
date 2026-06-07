import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import { rangeSinceUnix } from "@/lib/analytics/range";
import {
  bucketKeySqlFromUnix,
  buildTimeBucketSpec,
  normalizeTimeSeries,
} from "@/lib/analytics/time-buckets";
import type {
  AnalyticsRange,
  DailyCount,
  ModerationAnalytics,
  NamedCount,
} from "@/lib/analytics/types";
import { getAnalyticsTrackingTableStatus } from "@/lib/analytics/table-check";
import { fetchGuildBanCount } from "@/lib/discord/api";
import { fetchGuildTimeoutCount } from "@/lib/discord/guild-timeouts";
import { query, queryOne, isDbConfigured } from "@/lib/db/pool";

export async function getModerationAnalytics(
  range: AnalyticsRange,
  groupBy: AnalyticsGroupBy
): Promise<ModerationAnalytics | null> {
  if (!isDbConfigured()) return null;

  const since = rangeSinceUnix(range);
  const bucketSpec = buildTimeBucketSpec(range, groupBy);
  const blBucket = bucketKeySqlFromUnix("unblacklist_at", bucketSpec);

  const tracking = await getAnalyticsTrackingTableStatus();
  const hasModActions = tracking.moderation === true;
  const modBucket = bucketKeySqlFromUnix("created_at", bucketSpec);

  try {
    const [
      kpis,
      discordBanCount,
      discordTimeoutCount,
      blacklistsPerDay,
      blacklistsByStaff,
      mediaCount,
      modActionsPerDay,
      modActionsByType,
      modActionsTotal,
    ] = await Promise.all([
        queryOne<{
          totalBlacklists: number;
          withExpiry: number;
        }>(
          `SELECT
            (SELECT COUNT(*) FROM blacklists) AS totalBlacklists,
            (SELECT COUNT(*) FROM blacklists
             WHERE unblacklist_at IS NOT NULL AND unblacklist_at > 0) AS withExpiry`
        ),
        fetchGuildBanCount().catch(() => null),
        fetchGuildTimeoutCount().catch(() => null),
        query<{ date: string; count: number }>(
          `SELECT ${blBucket} AS date, COUNT(*) AS count
           FROM blacklists
           WHERE unblacklist_at IS NOT NULL AND unblacklist_at > 0
           ${since != null ? "AND unblacklist_at >= ?" : ""}
           GROUP BY date ORDER BY date`,
          since != null ? [since] : []
        ).catch(() => []),
        query<{ staffID: string; count: number }>(
          `SELECT staff_id AS staffID, COUNT(*) AS count FROM blacklists
           WHERE staff_id IS NOT NULL AND staff_id > 0
           GROUP BY staff_id ORDER BY count DESC LIMIT 15`
        ).catch(() => []),
        queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM media`).catch(
          () => ({ total: 0 })
        ),
        hasModActions
          ? query<{ date: string; count: number }>(
              `SELECT ${modBucket} AS date, COUNT(*) AS count
               FROM analytics_mod_actions
               WHERE 1=1
               ${since != null ? "AND created_at >= ?" : ""}
               GROUP BY date ORDER BY date`,
              since != null ? [since] : []
            ).catch(() => [])
          : Promise.resolve([]),
        hasModActions
          ? query<{ action_type: string; count: number }>(
              `SELECT action_type, COUNT(*) AS count FROM analytics_mod_actions
               WHERE 1=1
               ${since != null ? "AND created_at >= ?" : ""}
               GROUP BY action_type ORDER BY count DESC LIMIT 12`,
              since != null ? [since] : []
            ).catch(() => [])
          : Promise.resolve([]),
        hasModActions
          ? queryOne<{ total: number }>(
              `SELECT COUNT(*) AS total FROM analytics_mod_actions
               WHERE 1=1
               ${since != null ? "AND created_at >= ?" : ""}`,
              since != null ? [since] : []
            ).catch(() => ({ total: 0 }))
          : Promise.resolve({ total: 0 }),
      ]);

    return {
      range,
      groupBy,
      kpis: {
        activeBans: discordBanCount ?? 0,
        activeTimeouts: discordTimeoutCount ?? 0,
        totalBlacklists: Number(kpis?.totalBlacklists ?? 0),
        mediaEntries: Number(mediaCount?.total ?? 0),
        blacklistsWithExpiry: Number(kpis?.withExpiry ?? 0),
      },
      blacklistsPerDay: normalizeTimeSeries(
        mapDaily(blacklistsPerDay),
        range,
        groupBy
      ),
      blacklistsByStaff: blacklistsByStaff.map((r) => ({
        userId: String(r.staffID),
        count: Number(r.count),
      })),
      modActionsPerDay: normalizeTimeSeries(
        mapDaily(modActionsPerDay),
        range,
        groupBy
      ),
      modActionsByType: modActionsByType.map(
        (r): NamedCount => ({
          name: String(r.action_type),
          count: Number(r.count),
        })
      ),
      modActionsInRange: Number(modActionsTotal?.total ?? 0),
      trackingModActions: hasModActions,
    };
  } catch (err) {
    console.error("[analytics] getModerationAnalytics failed:", err);
    return null;
  }
}

function mapDaily(rows: { date: string | Date; count: number }[]): DailyCount[] {
  return rows.map((r) => ({
    date:
      r.date instanceof Date
        ? r.date.toISOString().slice(0, 10)
        : String(r.date).slice(0, 10),
    count: Number(r.count),
  }));
}
