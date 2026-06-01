import { rangeSinceUnix } from "@/lib/analytics/range";
import type { AnalyticsRange, DailyCount, ModerationAnalytics } from "@/lib/analytics/types";
import { query, queryOne, isDbConfigured } from "@/lib/db/pool";

export async function getModerationAnalytics(
  range: AnalyticsRange
): Promise<ModerationAnalytics | null> {
  if (!isDbConfigured()) return null;

  const since = rangeSinceUnix(range);

  try {
    const [kpis, blacklistsPerDay, blacklistsByStaff, pollsPerDay, mediaCount] =
      await Promise.all([
        queryOne<{
          activeBans: number;
          totalBlacklists: number;
          activePolls: number;
          totalPolls: number;
          withExpiry: number;
        }>(
          `SELECT
            (SELECT COUNT(*) FROM bans) AS activeBans,
            (SELECT COUNT(*) FROM blacklists) AS totalBlacklists,
            (SELECT COUNT(*) FROM polls) AS activePolls,
            (SELECT COUNT(*) FROM polls) AS totalPolls,
            (SELECT COUNT(*) FROM blacklists
             WHERE TRIM(whenToUnbl) != '' AND CAST(whenToUnbl AS UNSIGNED) > 0) AS withExpiry`
        ),
        since != null
          ? query<{ date: string; count: number }>(
              `SELECT DATE(FROM_UNIXTIME(CAST(whenToUnbl AS UNSIGNED))) AS date, COUNT(*) AS count
               FROM blacklists
               WHERE CAST(whenToUnbl AS UNSIGNED) >= ?
               GROUP BY date ORDER BY date`,
              [since]
            ).catch(() => [])
          : query<{ date: string; count: number }>(
              `SELECT DATE(FROM_UNIXTIME(CAST(whenToUnbl AS UNSIGNED))) AS date, COUNT(*) AS count
               FROM blacklists
               WHERE CAST(whenToUnbl AS UNSIGNED) > 0
               GROUP BY date ORDER BY date`
            ).catch(() => []),
        query<{ staffID: string; count: number }>(
          `SELECT staffID, COUNT(*) AS count FROM blacklists
           WHERE TRIM(staffID) != ''
           GROUP BY staffID ORDER BY count DESC LIMIT 15`
        ).catch(() => []),
        query<{ date: string; count: number }>(
          `SELECT DATE(FROM_UNIXTIME(CAST(created_at AS UNSIGNED))) AS date, COUNT(*) AS count
           FROM polls
           WHERE CAST(created_at AS UNSIGNED) > 0
           ${since != null ? "AND CAST(created_at AS UNSIGNED) >= ?" : ""}
           GROUP BY date ORDER BY date`,
          since != null ? [since] : []
        ).catch(() => []),
        queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM media`).catch(
          () => ({ total: 0 })
        ),
      ]);

    return {
      range,
      kpis: {
        activeBans: Number(kpis?.activeBans ?? 0),
        totalBlacklists: Number(kpis?.totalBlacklists ?? 0),
        activePolls: Number(kpis?.activePolls ?? 0),
        totalPolls: Number(kpis?.totalPolls ?? 0),
        mediaEntries: Number(mediaCount?.total ?? 0),
        blacklistsWithExpiry: Number(kpis?.withExpiry ?? 0),
      },
      blacklistsPerDay: mapDaily(blacklistsPerDay),
      blacklistsByStaff: blacklistsByStaff.map((r) => ({
        userId: String(r.staffID),
        count: Number(r.count),
      })),
      pollsCreatedPerDay: mapDaily(pollsPerDay),
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
