import { query, queryOne, isDbConfigured } from "@/lib/db/pool";
import {
  GAMES_CHAT_SQL,
  GAMES_DM_SQL,
  GAMES_NOT_TEST_SQL,
  GAMES_SESSION_COLUMNS,
  LEVELING_ACTIVE_SQL,
  LEVELING_COLUMNS,
  LEVELING_EVER_PLAYED_SQL,
} from "@/lib/db/schema-aliases";
import type {
  AllTimeLeaderboardType,
  CountingServerRow,
  CountingUserRow,
  DailyClaimRow,
  GameSessionRow,
  GamesLeaderboardType,
  GamesOverview,
  LeaderboardEntry,
  LevelingRow,
  UserAchievementRow,
  XpLogRow,
} from "@/lib/games/types";
import { env } from "@/lib/env";
import {
  buildXpLogsWhere,
  xpLogsOrderClause,
  type ListXpLogsOptions,
} from "@/lib/games/xp-logs-query";

const CHAT_WIN_SOURCES: Record<string, string> = {
  trivia_wins: "Trivia",
  math_quiz_wins: "Math Quiz",
  flag_guesser_wins: "Flag Guesser",
  unscramble_wins: "Unscramble",
  emoji_quiz_wins: "Emoji Quiz",
};

const DM_WIN_TABLES: Record<
  string,
  { table: string; wonCol: string; winValues: string[] }
> = {
  tictactoe_wins: { table: "users_tictactoe", wonCol: "won", winValues: ["Won"] },
  wordle_wins: { table: "users_wordle", wonCol: "won", winValues: ["Won"] },
  connect_four_wins: {
    table: "users_connectfour",
    wonCol: "status",
    winValues: ["Won"],
  },
  memory_wins: { table: "users_memory", wonCol: "won", winValues: ["Won"] },
  "2048_wins": {
    table: "users_2048",
    wonCol: "status",
    winValues: ["Won", "Cashed Out"],
  },
  minesweeper_wins: {
    table: "users_minesweeper",
    wonCol: "won",
    winValues: ["Won"],
  },
  hangman_wins: { table: "users_hangman", wonCol: "won", winValues: ["Won"] },
};

function dmWinWhereClause(dm: { wonCol: string; winValues: string[] }): string {
  const placeholders = dm.winValues.map(() => "?").join(", ");
  return `${dm.wonCol} IN (${placeholders})`;
}

export async function getGamesOverview(): Promise<GamesOverview | null> {
  if (!isDbConfigured()) return null;
  try {
    const row = await queryOne<{
      activePlayers: number;
      everPlayed: number;
      openSessions: number;
      totalXpLogs: number;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM leveling WHERE ${LEVELING_ACTIVE_SQL}) AS activePlayers,
        (SELECT COUNT(*) FROM leveling WHERE ${LEVELING_EVER_PLAYED_SQL}) AS everPlayed,
        (SELECT COUNT(*) FROM games WHERE ${GAMES_NOT_TEST_SQL}) AS openSessions,
        (SELECT COUNT(*) FROM xp_logs) AS totalXpLogs`
    );
    return row;
  } catch (err) {
    console.error("[db] getGamesOverview failed:", err);
    return null;
  }
}

export async function listMonthlyLeaderboard(opts: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ rows: LevelingRow[]; total: number }> {
  if (!isDbConfigured()) return { rows: [], total: 0 };

  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
  const offset = (page - 1) * limit;

  const conditions = [`(${LEVELING_ACTIVE_SQL})`];
  const params: string[] = [];
  if (opts.search?.trim()) {
    conditions.push("user_id LIKE ?");
    params.push(`%${opts.search.trim()}%`);
  }
  const where = conditions.join(" AND ");

  const countRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM leveling WHERE ${where}`,
    params
  );
  const rows = await query<LevelingRow>(
    `SELECT ${LEVELING_COLUMNS}
     FROM leveling
     WHERE ${where}
     ORDER BY CAST(level AS UNSIGNED) DESC, CAST(xp AS UNSIGNED) DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { rows, total: countRow?.total ?? 0 };
}

export async function getAllTimeLeaderboard(
  type: AllTimeLeaderboardType,
  limit = 100
): Promise<LeaderboardEntry[]> {
  if (!isDbConfigured()) return [];

  if (type === "all_time_xp") {
    const rows = await query<{ user_id: string; value: number }>(
      `SELECT user_id, SUM(xp) AS value FROM xp_logs
       GROUP BY user_id ORDER BY value DESC LIMIT ?`,
      [limit]
    );
    return rows.map((r, i) => ({
      userId: String(r.user_id),
      value: Number(r.value),
      rank: i + 1,
    }));
  }

  if (type === "all_time_level") {
    try {
      const rows = await query<{ user_id: string; value: number }>(
        `SELECT user_id, global_level AS value FROM leveling_global
         WHERE global_level > 0
         ORDER BY global_level DESC LIMIT ?`,
        [limit]
      );
      return rows.map((r, i) => ({
        userId: String(r.user_id),
        value: Number(r.value),
        rank: i + 1,
      }));
    } catch {
      return [];
    }
  }

  if (type === "2048_best_score") {
    const rows = await query<{ user_id: string; value: number }>(
      `SELECT user_id, MAX(score) AS value FROM users_2048
       GROUP BY user_id ORDER BY value DESC LIMIT ?`,
      [limit]
    );
    return rows.map((r, i) => ({
      userId: String(r.user_id),
      value: Number(r.value),
      rank: i + 1,
    }));
  }

  const chatSource = CHAT_WIN_SOURCES[type];
  if (chatSource) {
    const rows = await query<{ user_id: string; value: number }>(
      `SELECT user_id, COUNT(*) AS value FROM xp_logs
       WHERE source = ? GROUP BY user_id ORDER BY value DESC LIMIT ?`,
      [chatSource, limit]
    );
    return rows.map((r, i) => ({
      userId: String(r.user_id),
      value: Number(r.value),
      rank: i + 1,
    }));
  }

  const dm = DM_WIN_TABLES[type];
  if (dm) {
    const rows = await query<{ user_id: string; value: number }>(
      `SELECT user_id, COUNT(*) AS value FROM ${dm.table}
       WHERE ${dmWinWhereClause(dm)} GROUP BY user_id ORDER BY value DESC LIMIT ?`,
      [...dm.winValues, limit]
    );
    return rows.map((r, i) => ({
      userId: String(r.user_id),
      value: Number(r.value),
      rank: i + 1,
    }));
  }

  return [];
}

export async function getGamesLeaderboard(
  type: GamesLeaderboardType,
  limit = 100,
  opts?: { guildId?: string | null }
): Promise<LeaderboardEntry[]> {
  if (!isDbConfigured()) return [];

  const guildId =
    opts?.guildId ??
    env("DISCORD_GUILD_ID") ??
    env("NEXT_PUBLIC_DISCORD_GUILD_ID") ??
    null;

  if (type === "monthly_level") {
    const rows = await query<{ user_id: string; level: number; xp: number }>(
      `SELECT user_id, CAST(level AS UNSIGNED) AS level, CAST(xp AS UNSIGNED) AS xp
       FROM leveling
       WHERE CAST(xp AS UNSIGNED) > 0 OR CAST(level AS UNSIGNED) > 1
       ORDER BY CAST(level AS UNSIGNED) DESC, CAST(xp AS UNSIGNED) DESC
       LIMIT ?`,
      [limit]
    );
    return rows.map((r, i) => ({
      userId: String(r.user_id),
      value: Number(r.level),
      rank: i + 1,
      extra: `${Number(r.xp)} xp`,
    }));
  }

  if (type === "achievements_earned") {
    const rows = await query<{ user_id: string; value: number }>(
      `SELECT user_id, COUNT(*) AS value FROM user_achievements
       GROUP BY user_id ORDER BY value DESC LIMIT ?`,
      [limit]
    );
    return rows.map((r, i) => ({
      userId: String(r.user_id),
      value: Number(r.value),
      rank: i + 1,
    }));
  }

  if (type === "daily_streak") {
    const rows = await query<{ user_id: string; value: number }>(
      `SELECT user_id, streak AS value FROM daily_claims
       WHERE streak > 0 ORDER BY value DESC LIMIT ?`,
      [limit]
    );
    return rows.map((r, i) => ({
      userId: String(r.user_id),
      value: Number(r.value),
      rank: i + 1,
    }));
  }

  if (type === "counting_counts") {
    if (!guildId) return [];
    const rows = await query<{ user_id: string; value: number }>(
      `SELECT user_id, total_counts AS value FROM counting_users
       WHERE guild_id = ? AND total_counts > 0
       ORDER BY value DESC LIMIT ?`,
      [guildId, limit]
    );
    return rows.map((r, i) => ({
      userId: String(r.user_id),
      value: Number(r.value),
      rank: i + 1,
    }));
  }

  if (type === "distinct_games_played") {
    const rows = await query<{ user_id: string; value: number }>(
      `SELECT user_id, COUNT(DISTINCT game_id) AS value FROM xp_logs
       WHERE game_id != -999999 AND CAST(game_id AS UNSIGNED) > 0
       GROUP BY user_id ORDER BY value DESC LIMIT ?`,
      [limit]
    );
    return rows.map((r, i) => ({
      userId: String(r.user_id),
      value: Number(r.value),
      rank: i + 1,
    }));
  }

  return getAllTimeLeaderboard(type as AllTimeLeaderboardType, limit);
}

export async function getAllGamesLeaderboards(
  limit = 10,
  guildId?: string | null
): Promise<Record<GamesLeaderboardType, LeaderboardEntry[]>> {
  const { GAMES_LEADERBOARD_CATALOG } = await import("@/lib/games/types");
  const entries = await Promise.all(
    GAMES_LEADERBOARD_CATALOG.map(async (def) => {
      const rows = await getGamesLeaderboard(def.id, limit, { guildId }).catch(
        () => [] as LeaderboardEntry[]
      );
      return [def.id, rows] as const;
    })
  );
  return Object.fromEntries(entries) as Record<
    GamesLeaderboardType,
    LeaderboardEntry[]
  >;
}

export async function listXpLogs(
  opts: ListXpLogsOptions & { maxLimit?: number } = {}
): Promise<{ rows: XpLogRow[]; total: number }> {
  if (!isDbConfigured()) return { rows: [], total: 0 };

  const page = Math.max(1, opts.page ?? 1);
  const maxLimit = opts.maxLimit ?? 100;
  const limit = Math.min(maxLimit, Math.max(1, opts.limit ?? 50));
  const offset = (page - 1) * limit;
  const { conditions, params } = buildXpLogsWhere(opts);
  const where = conditions.join(" AND ");
  const order = xpLogsOrderClause(opts.sortBy, opts.sortDir);

  const countRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM xp_logs WHERE ${where}`,
    params
  );
  const rows = await query<XpLogRow>(
    `SELECT game_id, user_id, xp, channel_id, source, timestamp
     FROM xp_logs WHERE ${where}
     ORDER BY ${order} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { rows, total: countRow?.total ?? 0 };
}

export async function listXpLogSources(limit = 80): Promise<string[]> {
  if (!isDbConfigured()) return [];
  const rows = await query<{ source: string }>(
    `SELECT DISTINCT TRIM(source) AS source FROM xp_logs
     WHERE game_id != -999999 AND TRIM(source) != ''
     ORDER BY source LIMIT ?`,
    [limit]
  );
  return rows.map((r) => r.source).filter(Boolean);
}

/** Most recent DM rotation session (matches MinecadiaGames GameRepository). */
export async function getCurrentDmGameId(): Promise<number | null> {
  if (!isDbConfigured()) return null;
  const row = await queryOne<{ game_id: number }>(
    `SELECT id AS game_id FROM games
     WHERE ${GAMES_DM_SQL}
     ORDER BY id DESC LIMIT 1`
  );
  return row?.game_id != null ? Number(row.game_id) : null;
}

export async function listGameSessions(opts: {
  limit?: number;
  dm?: "all" | "chat" | "dm";
  search?: string;
} = {}): Promise<GameSessionRow[]> {
  if (!isDbConfigured()) return [];
  const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
  const conditions = [GAMES_NOT_TEST_SQL];
  const params: (string | number)[] = [];

  if (opts.dm === "chat") {
    conditions.push(GAMES_CHAT_SQL);
  } else if (opts.dm === "dm") {
    conditions.push(GAMES_DM_SQL);
  }

  if (opts.search?.trim()) {
    const q = `%${opts.search.trim()}%`;
    conditions.push("(CAST(id AS CHAR) LIKE ? OR name LIKE ?)");
    params.push(q, q);
  }

  return query<GameSessionRow>(
    `SELECT ${GAMES_SESSION_COLUMNS}
     FROM games WHERE ${conditions.join(" AND ")}
     ORDER BY refreshed_at DESC LIMIT ?`,
    [...params, limit]
  );
}

export async function getGameSession(gameId: number) {
  if (!isDbConfigured()) return null;
  const game = await queryOne<GameSessionRow>(
    `SELECT ${GAMES_SESSION_COLUMNS}
     FROM games WHERE id = ?`,
    [gameId]
  );
  if (!game) return null;

  const xpLogs = await query<XpLogRow>(
    `SELECT game_id, user_id, xp, channel_id, source, timestamp
     FROM xp_logs WHERE game_id = ?
     ORDER BY timestamp DESC LIMIT 100`,
    [gameId]
  );

  return { game, xpLogs };
}

export async function listDmSessionEntries(
  gameId: number,
  table: string,
  columns: string[]
) {
  if (!isDbConfigured()) return [];
  const cols = columns.join(", ");
  return query<Record<string, string | number | null>>(
    `SELECT ${cols} FROM ${table} WHERE game_id = ? ORDER BY started_at DESC`,
    [gameId]
  );
}

export async function getUserGamesProfile(userId: string) {
  if (!isDbConfigured()) return null;

  const leveling = await queryOne<LevelingRow>(
    `SELECT ${LEVELING_COLUMNS} FROM leveling WHERE user_id = ?`,
    [userId]
  );
  const daily = await queryOne<DailyClaimRow>(
    `SELECT user_id, last_claimed, streak FROM daily_claims WHERE user_id = ?`,
    [userId]
  );
  const achievements = await query<UserAchievementRow>(
    `SELECT user_id, achievement_id, earned_at FROM user_achievements WHERE user_id = ?`,
    [userId]
  );
  const badge = await queryOne<{ selected_badge_id: string }>(
    `SELECT selected_badge_id FROM user_badge_preferences WHERE user_id = ?`,
    [userId]
  );
  const totalXp = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(xp), 0) AS total FROM xp_logs WHERE user_id = ?`,
    [userId]
  );

  return {
    leveling: leveling ?? { user_id: userId, xp: 0, level: 1, active: 0, ever_played: 0 },
    daily,
    achievements,
    selectedBadgeId: badge?.selected_badge_id ?? null,
    allTimeXp: Number(totalXp?.total ?? 0),
  };
}

export async function listDailyClaims(opts: {
  page?: number;
  limit?: number;
}): Promise<{ rows: DailyClaimRow[]; total: number }> {
  if (!isDbConfigured()) return { rows: [], total: 0 };
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, opts.limit ?? 50);
  const offset = (page - 1) * limit;
  const countRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM daily_claims`
  );
  const rows = await query<DailyClaimRow>(
    `SELECT user_id, last_claimed, streak FROM daily_claims
     ORDER BY streak DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return { rows, total: countRow?.total ?? 0 };
}

export async function getCountingData(guildId: string) {
  if (!isDbConfigured()) return { server: null, users: [] as CountingUserRow[] };

  const server = await queryOne<CountingServerRow>(
    `SELECT guild_id, last_number, total_counts, highest_count
     FROM counting_server WHERE guild_id = ?`,
    [guildId]
  );
  const users = await query<CountingUserRow>(
    `SELECT user_id, total_counts, highest_count, mistakes
     FROM counting_users WHERE guild_id = ?
     ORDER BY total_counts DESC LIMIT 50`,
    [guildId]
  );
  return { server, users };
}

export async function listRecentXpLogs(limit = 10): Promise<XpLogRow[]> {
  if (!isDbConfigured()) return [];
  return query<XpLogRow>(
    `SELECT game_id, user_id, xp, channel_id, source, timestamp
     FROM xp_logs WHERE game_id != -999999
     ORDER BY timestamp DESC LIMIT ?`,
    [limit]
  );
}
