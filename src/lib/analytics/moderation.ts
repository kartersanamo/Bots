import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import { rangeSinceUnix } from "@/lib/analytics/range";
import {
  bucketKeySqlFromUnix,
  buildTimeBucketSpec,
  normalizeTimeSeries,
} from "@/lib/analytics/time-buckets";
import type { AnalyticsRange, DailyCount, ModerationAnalytics } from "@/lib/analytics/types";
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
  const blBucket = bucketKeySqlFromUnix("whenToUnbl", bucketSpec);

  try {
    const [
      kpis,
      discordBanCount,
      discordTimeoutCount,
      blacklistsPerDay,
      blacklistsByStaff,
      mediaCount,
    ] = await Promise.all([
        queryOne<{
          totalBlacklists: number;
          withExpiry: number;
        }>(
          `SELECT
            (SELECT COUNT(*) FROM blacklists) AS totalBlacklists,
            (SELECT COUNT(*) FROM blacklists
             WHERE TRIM(whenToUnbl) != '' AND CAST(whenToUnbl AS UNSIGNED) > 0) AS withExpiry`
        ),
        fetchGuildBanCount().catch(() => null),
        fetchGuildTimeoutCount().catch(() => null),
        query<{ date: string; count: number }>(
          `SELECT ${blBucket} AS date, COUNT(*) AS count
           FROM blacklists
           WHERE CAST(whenToUnbl AS UNSIGNED) > 0
           ${since != null ? "AND CAST(whenToUnbl AS UNSIGNED) >= ?" : ""}
           GROUP BY date ORDER BY date`,
          since != null ? [since] : []
        ).catch(() => []),
        query<{ staffID: string; count: number }>(
          `SELECT staffID, COUNT(*) AS count FROM blacklists
           WHERE TRIM(staffID) != ''
           GROUP BY staffID ORDER BY count DESC LIMIT 15`
        ).catch(() => []),
        queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM media`).catch(
          () => ({ total: 0 })
        ),
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
