import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import { rangeSinceUnix } from "@/lib/analytics/range";
import {
  bucketKeySqlFromUnix,
  bucketKeySqlFromDate,
  buildTimeBucketSpec,
  normalizeTimeSeries,
} from "@/lib/analytics/time-buckets";
import type {
  AnalyticsRange,
  DailyCount,
  GamesAnalytics,
} from "@/lib/analytics/types";
import { getAllGamesLeaderboards, getGamesOverview } from "@/lib/db/games";
import { query, queryOne, isDbConfigured } from "@/lib/db/pool";
import { env } from "@/lib/env";

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
  const newPlayerHaving =
    since != null ? " HAVING first_ts >= ?" : "";
  const newPlayerParams = since != null ? [since] : [];

  const sessionClause =
    since != null ? " AND CAST(refreshed_at AS UNSIGNED) >= ?" : "";
  const sessionParams = since != null ? [since] : [];

  const achievementClause =
    since != null
      ? " AND CAST(earned_at AS UNSIGNED) >= ?"
      : "";
  const achievementParams = since != null ? [since] : [];

  const guildId =
    env("DISCORD_GUILD_ID") || env("NEXT_PUBLIC_DISCORD_GUILD_ID") || null;
  const countingGuildClause = guildId ? " WHERE guild_id = ?" : "";
  const countingGuildParams = guildId ? [guildId] : [];

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
      countingServer,
      topCounters,
      topStreaks,
      leaderboards,
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
      query<{ date: string; count: number }>(
        `SELECT ${bucketKeySqlFromUnix("first_ts", bucketSpec)} AS date, COUNT(*) AS count
         FROM (
           SELECT user_id, MIN(CAST(timestamp AS UNSIGNED)) AS first_ts
           FROM xp_logs
           WHERE CAST(timestamp AS UNSIGNED) > 0
           GROUP BY user_id${newPlayerHaving}
         ) firsts
         GROUP BY date ORDER BY date`,
        newPlayerParams
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
         WHERE active = '1' OR active = 1
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
      queryOne<{ users: number; mistakes: number }>(
        `SELECT
          (SELECT COUNT(*) FROM counting_users${countingGuildClause}) AS users,
          (SELECT COALESCE(SUM(mistakes), 0) FROM counting_users${countingGuildClause}) AS mistakes`,
        countingGuildParams
      ).catch(() => null),
      guildId
        ? queryOne<{
            last_number: number;
            highest_count: number;
          }>(
            `SELECT last_number, highest_count
             FROM counting_server WHERE guild_id = ?`,
            [guildId]
          ).catch(() => null)
        : Promise.resolve(null),
      guildId
        ? query<{
            user_id: string;
            total_counts: number;
            highest_count: number;
            mistakes: number;
          }>(
            `SELECT user_id, total_counts, highest_count, mistakes
             FROM counting_users WHERE guild_id = ?
             ORDER BY total_counts DESC LIMIT 25`,
            [guildId]
          ).catch(() => [])
        : Promise.resolve([]),
      query<{ user_id: string; streak: number }>(
        `SELECT user_id, streak FROM daily_claims
         ORDER BY streak DESC LIMIT 10`
      ).catch(() => []),
      getAllGamesLeaderboards(10, guildId).catch(
        () => ({}) as Record<string, never>
      ),
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
        countingMistakes: Number(countingAgg?.mistakes ?? 0),
        countingCurrentCount:
          countingServer != null ? Number(countingServer.last_number) : null,
        countingHighestCount:
          countingServer != null ? Number(countingServer.highest_count) : null,
      },
      topCounters: topCounters.map((r) => ({
        userId: String(r.user_id),
        totalCounts: Number(r.total_counts),
        highestCount: Number(r.highest_count),
        mistakes: Number(r.mistakes),
      })),
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
      leaderboards: (leaderboards ?? {}) as GamesAnalytics["leaderboards"],
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
