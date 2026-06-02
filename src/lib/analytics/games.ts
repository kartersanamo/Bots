import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import { rangeSinceUnix } from "@/lib/analytics/range";
import {
  bucketKeySqlFromUnix,
  bucketKeySqlFromDate,
  buildTimeBucketSpec,
  normalizeTimeSeries,
} from "@/lib/analytics/time-buckets";
import type { AnalyticsRange, DailyCount, GamesAnalytics } from "@/lib/analytics/types";
import { getGamesOverview } from "@/lib/db/games";
import { query, queryOne, isDbConfigured } from "@/lib/db/pool";

/** Matches MinecadiaGames `/daily` XP log entries. */
const DAILY_CLAIM_XP_WHERE =
  "CAST(timestamp AS UNSIGNED) > 0 AND TRIM(source) = 'Daily Reward'";

export async function getGamesAnalytics(
  range: AnalyticsRange,
  groupBy: AnalyticsGroupBy
): Promise<GamesAnalytics | null> {
  if (!isDbConfigured()) return null;

  const overview = await getGamesOverview();
  if (!overview) return null;

  const since = rangeSinceUnix(range);
  const tsClause =
    since != null ? " AND CAST(timestamp AS UNSIGNED) >= ?" : "";
  const tsParams = since != null ? [since] : [];
  const bucketSpec = buildTimeBucketSpec(range, groupBy);
  const xpBucket = bucketKeySqlFromUnix("timestamp", bucketSpec);
  const sessionBucket = bucketKeySqlFromUnix("refreshed_at", bucketSpec);
  const dailyClaimBucket = bucketKeySqlFromUnix("timestamp", bucketSpec);
  const earnedBucket = bucketKeySqlFromUnix("earned_at", bucketSpec);
  const skipNewPlayers = range === "all" || range === "365d";

  const sessionClause =
    since != null ? " AND CAST(refreshed_at AS UNSIGNED) >= ?" : "";
  const sessionParams = since != null ? [since] : [];

  const achievementClause =
    since != null
      ? " AND CAST(earned_at AS UNSIGNED) >= ?"
      : "";
  const achievementParams = since != null ? [since] : [];

  try {
    const [
      xpAgg,
      xpPerDay,
      sessionsPerDay,
      topSources,
      topSourcesByXp,
      newPlayers,
      topEarners,
      levelDist,
      claimsPerDay,
      achievementsPerDay,
      sessionsByGame,
      modeSplit,
      achievementTotals,
      claimTotals,
      countingAgg,
      topStreaks,
    ] = await Promise.all([
      queryOne<{ total: number; events: number }>(
        `SELECT COALESCE(SUM(xp), 0) AS total, COUNT(*) AS events
         FROM xp_logs WHERE CAST(timestamp AS UNSIGNED) > 0${tsClause}`,
        tsParams
      ),
      query<{ date: string; count: number }>(
        `SELECT ${xpBucket} AS date, COALESCE(SUM(xp), 0) AS count
         FROM xp_logs WHERE CAST(timestamp AS UNSIGNED) > 0${tsClause}
         GROUP BY date ORDER BY date`,
        tsParams
      ),
      query<{ date: string; count: number }>(
        `SELECT ${sessionBucket} AS date, COUNT(*) AS count
         FROM games
         WHERE game_id != -999999${sessionClause}
         GROUP BY date ORDER BY date`,
        sessionParams
      ),
      query<{ name: string; count: number }>(
        `SELECT COALESCE(NULLIF(TRIM(source), ''), 'unknown') AS name, COUNT(*) AS count
         FROM xp_logs WHERE CAST(timestamp AS UNSIGNED) > 0${tsClause}
         GROUP BY name ORDER BY count DESC LIMIT 12`,
        tsParams
      ),
      query<{ name: string; count: number }>(
        `SELECT COALESCE(NULLIF(TRIM(source), ''), 'unknown') AS name,
                COALESCE(SUM(xp), 0) AS count
         FROM xp_logs WHERE CAST(timestamp AS UNSIGNED) > 0${tsClause}
         GROUP BY name ORDER BY count DESC LIMIT 12`,
        tsParams
      ),
      skipNewPlayers
        ? Promise.resolve([] as { date: string; count: number }[])
        : query<{ date: string; count: number }>(
            `SELECT ${bucketKeySqlFromUnix("first_ts", bucketSpec)} AS date, COUNT(*) AS count FROM (
              SELECT user_id, MIN(CAST(timestamp AS UNSIGNED)) AS first_ts
              FROM xp_logs WHERE CAST(timestamp AS UNSIGNED) > 0${tsClause}
              GROUP BY user_id
            ) firsts
            GROUP BY date ORDER BY date`,
            tsParams
          ),
      query<{ user_id: string; total: number }>(
        `SELECT user_id, SUM(xp) AS total FROM xp_logs
         WHERE CAST(timestamp AS UNSIGNED) > 0${tsClause}
         GROUP BY user_id ORDER BY total DESC LIMIT 20`,
        tsParams
      ),
      query<{ name: string; count: number }>(
        `SELECT
          CASE
            WHEN CAST(level AS UNSIGNED) < 5 THEN 'Levels 1–4'
            WHEN CAST(level AS UNSIGNED) < 15 THEN 'Levels 5–14'
            WHEN CAST(level AS UNSIGNED) < 30 THEN 'Levels 15–29'
            WHEN CAST(level AS UNSIGNED) < 50 THEN 'Levels 30–49'
            ELSE 'Level 50+'
          END AS name,
          COUNT(*) AS count
         FROM leveling
         GROUP BY name ORDER BY count DESC`
      ),
      query<{ date: string; count: number }>(
        `SELECT ${dailyClaimBucket} AS date, COUNT(*) AS count
         FROM xp_logs
         WHERE ${DAILY_CLAIM_XP_WHERE}${tsClause}
         GROUP BY date ORDER BY date`,
        tsParams
      ),
      query<{ date: string; count: number }>(
        `SELECT ${earnedBucket} AS date, COUNT(*) AS count
         FROM user_achievements
         WHERE CAST(earned_at AS UNSIGNED) > 0${achievementClause}
         GROUP BY date ORDER BY date`,
        achievementParams
      ),
      query<{ name: string; count: number }>(
        `SELECT COALESCE(NULLIF(TRIM(game_name), ''), 'Unknown') AS name, COUNT(*) AS count
         FROM games
         WHERE game_id != -999999${sessionClause}
         GROUP BY name ORDER BY count DESC LIMIT 14`,
        sessionParams
      ),
      query<{ name: string; count: number }>(
        `SELECT
          CASE WHEN dm_game IN ('1', 1, 'true', 'True') THEN 'DM games' ELSE 'Channel games' END AS name,
          COUNT(*) AS count
         FROM games
         WHERE game_id != -999999${sessionClause}
         GROUP BY name`,
        sessionParams
      ),
      queryOne<{ total: number; inRange: number }>(
        `SELECT
          (SELECT COUNT(*) FROM user_achievements) AS total,
          (SELECT COUNT(*) FROM user_achievements
           WHERE CAST(earned_at AS UNSIGNED) > 0${achievementClause}) AS inRange`,
        achievementParams
      ),
      queryOne<{ users: number; claims: number; usersInRange: number }>(
        `SELECT
          (SELECT COUNT(*) FROM daily_claims) AS users,
          (SELECT COUNT(*) FROM xp_logs
           WHERE ${DAILY_CLAIM_XP_WHERE}${tsClause}) AS claims,
          (SELECT COUNT(DISTINCT user_id) FROM xp_logs
           WHERE ${DAILY_CLAIM_XP_WHERE}${tsClause}) AS usersInRange`,
        tsParams
      ),
      queryOne<{
        users: number;
        totalCounts: number;
        mistakes: number;
      }>(
        `SELECT
          (SELECT COUNT(*) FROM counting_users) AS users,
          (SELECT COALESCE(SUM(total_counts), 0) FROM counting_users) AS totalCounts,
          (SELECT COALESCE(SUM(mistakes), 0) FROM counting_users) AS mistakes`
      ).catch(() => null),
      query<{ user_id: string; streak: number }>(
        `SELECT user_id, streak FROM daily_claims
         ORDER BY streak DESC LIMIT 10`
      ).catch(() => []),
    ]);

    const events = Number(xpAgg?.events ?? 0);
    const totalXp = Number(xpAgg?.total ?? 0);

    return {
      range,
      groupBy,
      kpis: {
        activePlayers: Number(overview.activePlayers),
        everPlayed: Number(overview.everPlayed),
        openSessions: Number(overview.openSessions),
        totalXpInRange: totalXp,
        xpLogEventsInRange: events,
        avgXpPerEvent: events > 0 ? Math.round(totalXp / events) : 0,
        totalAchievements: Number(achievementTotals?.total ?? 0),
        achievementsInRange: Number(achievementTotals?.inRange ?? 0),
        dailyClaimUsers: Number(claimTotals?.users ?? 0),
        claimsInRange: Number(claimTotals?.claims ?? 0),
        dailyClaimUsersInRange: Number(claimTotals?.usersInRange ?? 0),
        countingUsers: Number(countingAgg?.users ?? 0),
        countingTotalCounts: Number(countingAgg?.totalCounts ?? 0),
        countingMistakes: Number(countingAgg?.mistakes ?? 0),
      },
      xpPerDay: normalizeTimeSeries(mapDaily(xpPerDay), range, groupBy),
      sessionsPerDay: normalizeTimeSeries(
        mapDaily(sessionsPerDay),
        range,
        groupBy
      ),
      topXpSources: topSources.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      topXpSourcesByXp: topSourcesByXp.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      newPlayersPerDay: normalizeTimeSeries(mapDaily(newPlayers), range, groupBy),
      topXpEarners: topEarners.map((r) => ({
        userId: String(r.user_id),
        value: Number(r.total),
      })),
      levelDistribution: levelDist.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      dailyClaimsPerDay: normalizeTimeSeries(
        mapDaily(claimsPerDay),
        range,
        groupBy
      ),
      achievementsPerDay: normalizeTimeSeries(
        mapDaily(achievementsPerDay),
        range,
        groupBy
      ),
      sessionsByGame: sessionsByGame.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      sessionModeSplit: modeSplit.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      topStreaks: topStreaks.map((r) => ({
        userId: String(r.user_id),
        streak: Number(r.streak),
      })),
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
