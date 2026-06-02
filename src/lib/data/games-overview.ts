import "server-only";

import {
  getGamesOverview,
  listXpLogSources,
  listXpLogs,
} from "@/lib/db/games";
import { isDbConfigured } from "@/lib/db/pool";
import {
  getGamesBotStatus,
  isGamesBotApiConfigured,
} from "@/lib/games-bot/client";
import { cached } from "@/lib/server-cache";

export async function getGamesOverviewPayload() {
  const overview = isDbConfigured() ? await getGamesOverview() : null;

  let botStatus: { chatGamesRunning: boolean; dmGamesRunning: boolean } | null =
    null;
  if (isGamesBotApiConfigured()) {
    try {
      botStatus = await cached("games-bot:status", 10_000, getGamesBotStatus);
    } catch {
      botStatus = null;
    }
  }

  return {
    configured: isDbConfigured(),
    overview,
    botStatus,
  };
}

export async function getGamesOverviewFullPayload() {
  const [base, sources, xpLogs] = await Promise.all([
    getGamesOverviewPayload(),
    isDbConfigured()
      ? cached("games:xp-sources", 60_000, () => listXpLogSources())
      : Promise.resolve([]),
    isDbConfigured()
      ? cached("games:xp-logs-preview:50", 30_000, () =>
          listXpLogs({ limit: 50, page: 1 })
        )
      : Promise.resolve({ rows: [], total: 0 }),
  ]);

  return {
    ...base,
    xpSources: sources,
    xpLogs: xpLogs.rows,
    xpLogsTotal: xpLogs.total,
  };
}
