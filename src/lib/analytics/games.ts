import { rangeSinceUnix } from "@/lib/analytics/range";
import type { AnalyticsRange, DailyCount, GamesAnalytics } from "@/lib/analytics/types";
import { getGamesOverview } from "@/lib/db/games";
import { query, queryOne, isDbConfigured } from "@/lib/db/pool";

export async function getGamesAnalytics(
  range: AnalyticsRange
): Promise<GamesAnalytics | null> {
  if (!isDbConfigured()) return null;

  const overview = await getGamesOverview();
  if (!overview) return null;

  const since = rangeSinceUnix(range);
  const tsClause =
    since != null
      ? " AND CAST(timestamp AS UNSIGNED) >= ?"
      : "";
  const tsParams = since != null ? [since] : [];

  const sessionClause =
    since != null
      ? " AND CAST(UNIX_TIMESTAMP(refreshed_at) AS UNSIGNED) >= ?"
      : "";
  const sessionParams = since != null ? [since] : [];

  try {
    const [xpAgg, xpPerDay, sessionsPerDay, topSources, newPlayers] =
      await Promise.all([
        queryOne<{ total: number; events: number }>(
          `SELECT COALESCE(SUM(xp), 0) AS total, COUNT(*) AS events
           FROM xp_logs WHERE 1=1${tsClause}`,
          tsParams
        ),
        query<{ date: string; count: number }>(
          `SELECT DATE(FROM_UNIXTIME(CAST(timestamp AS UNSIGNED))) AS date,
            COALESCE(SUM(xp), 0) AS count
           FROM xp_logs WHERE CAST(timestamp AS UNSIGNED) > 0${tsClause}
           GROUP BY date ORDER BY date`,
          tsParams
        ),
        query<{ date: string; count: number }>(
          `SELECT DATE(refreshed_at) AS date, COUNT(*) AS count
           FROM games
           WHERE game_id != -999999${sessionClause}
           GROUP BY date ORDER BY date`,
          sessionParams
        ),
        query<{ name: string; count: number }>(
          `SELECT COALESCE(NULLIF(TRIM(source), ''), 'unknown') AS name, COUNT(*) AS count
           FROM xp_logs WHERE 1=1${tsClause}
           GROUP BY name ORDER BY count DESC LIMIT 12`,
          tsParams
        ),
        query<{ date: string; count: number }>(
          `SELECT DATE(FROM_UNIXTIME(first_ts)) AS date, COUNT(*) AS count FROM (
            SELECT user_id, MIN(CAST(timestamp AS UNSIGNED)) AS first_ts
            FROM xp_logs WHERE CAST(timestamp AS UNSIGNED) > 0${tsClause}
            GROUP BY user_id
          ) firsts
          GROUP BY date ORDER BY date`,
          tsParams
        ),
      ]);

    return {
      range,
      kpis: {
        activePlayers: overview.activePlayers,
        everPlayed: overview.everPlayed,
        openSessions: overview.openSessions,
        totalXpInRange: Number(xpAgg?.total ?? 0),
        xpLogEventsInRange: Number(xpAgg?.events ?? 0),
      },
      xpPerDay: mapDaily(xpPerDay),
      sessionsPerDay: mapDaily(sessionsPerDay),
      topXpSources: topSources.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      newPlayersPerDay: mapDaily(newPlayers),
    };
  } catch (err) {
    console.error("[analytics] getGamesAnalytics failed:", err);
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
