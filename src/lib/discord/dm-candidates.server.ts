import "server-only";

import { query, isDbConfigured } from "@/lib/db/pool";

const GAMES_DM_USER_TABLES = [
  "users_wordle",
  "users_hangman",
  "users_minesweeper",
  "users_tictactoe",
  "users_connectfour",
  "users_memory",
  "users_2048",
] as const;

const MAX_CANDIDATES = 300;

async function distinctUserIds(sql: string, params: unknown[] = []): Promise<string[]> {
  const rows = await query<{ user_id: string }>(sql, params);
  return rows
    .map((r) => String(r.user_id ?? "").trim())
    .filter((id) => /^\d{17,20}$/.test(id));
}

/**
 * Discord does not expose a bot's DM channel list via REST. These user IDs are
 * used to open DM channels and load message history for conversations that exist.
 */
export async function getDmCandidateUserIds(botId: string): Promise<string[]> {
  if (!isDbConfigured()) return [];

  const ids = new Set<string>();

  try {
    if (botId === "games") {
      for (const table of GAMES_DM_USER_TABLES) {
        const rows = await distinctUserIds(
          `SELECT DISTINCT user_id FROM ${table} LIMIT ?`,
          [MAX_CANDIDATES]
        );
        rows.forEach((id) => ids.add(id));
      }
      const active = await distinctUserIds(
        `SELECT DISTINCT user_id FROM games
         WHERE dm_game = 1 OR dm_game = TRUE OR dm_game = '1'
         LIMIT ?`,
        [MAX_CANDIDATES]
      );
      active.forEach((id) => ids.add(id));
    }

    if (botId === "tickets") {
      const owners = await query<{ ownerID: string }>(
        `SELECT DISTINCT ownerID AS ownerID FROM tickets
         WHERE ownerID IS NOT NULL AND TRIM(ownerID) != ''
         ORDER BY CAST(opened_at AS UNSIGNED) DESC
         LIMIT ?`,
        [MAX_CANDIDATES]
      );
      owners
        .map((r) => String(r.ownerID).trim())
        .filter((id) => /^\d{17,20}$/.test(id))
        .forEach((id) => ids.add(id));
    }

    if (botId === "staff" || botId === "management" || botId === "leader") {
      const stats = await query<{ user_ID: string }>(
        `SELECT DISTINCT user_ID FROM total_statistics
         WHERE user_ID IS NOT NULL AND TRIM(user_ID) != ''
         LIMIT ?`,
        [MAX_CANDIDATES]
      ).catch(() => []);
      stats
        .map((r) => String(r.user_ID).trim())
        .filter((id) => /^\d{17,20}$/.test(id))
        .forEach((id) => ids.add(id));
    }
  } catch (err) {
    console.error(`[dm-candidates] ${botId} failed:`, err);
  }

  return [...ids].slice(0, MAX_CANDIDATES);
}
