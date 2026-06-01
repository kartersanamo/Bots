import { rangeSinceUnix } from "@/lib/analytics/range";
import type { AnalyticsRange, DailyCount, ModerationAnalytics } from "@/lib/analytics/types";
import { query, queryOne, isDbConfigured } from "@/lib/db/pool";

export async function getModerationAnalytics(
  range: AnalyticsRange
): Promise<ModerationAnalytics | null> {
  if (!isDbConfigured()) return null;

  const since = rangeSinceUnix(range);

  try {
    const [kpis, blacklistsPerDay, pollsPerDay] = await Promise.all([
      queryOne<{
        activeBans: number;
        totalBlacklists: number;
        activePolls: number;
        totalPolls: number;
      }>(
        `SELECT
          (SELECT COUNT(*) FROM bans) AS activeBans,
          (SELECT COUNT(*) FROM blacklists) AS totalBlacklists,
          (SELECT COUNT(*) FROM polls WHERE active = 1 OR active = '1') AS activePolls,
          (SELECT COUNT(*) FROM polls) AS totalPolls`
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
      query<{ date: string; count: number }>(
        `SELECT CURDATE() AS date, COUNT(*) AS count FROM polls`
      ).catch(() => []),
    ]);

    return {
      range,
      kpis: {
        activeBans: Number(kpis?.activeBans ?? 0),
        totalBlacklists: Number(kpis?.totalBlacklists ?? 0),
        activePolls: Number(kpis?.activePolls ?? 0),
        totalPolls: Number(kpis?.totalPolls ?? 0),
      },
      blacklistsPerDay: mapDaily(blacklistsPerDay),
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
