import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { getGamesOverview, listRecentXpLogs } from "@/lib/db/games";
import { isDbConfigured } from "@/lib/db/pool";
import {
  getGamesBotStatus,
  isGamesBotApiConfigured,
} from "@/lib/games-bot/client";
import { discordUsersForIds, snowflakeString } from "@/lib/games/discord-enrich";
import { cached } from "@/lib/server-cache";

export const GET = handleApiRoute(async () => {
  await requireAction("games.read");

  const overview = isDbConfigured() ? await getGamesOverview() : null;
  const recentLogsRaw = isDbConfigured() ? await listRecentXpLogs(10) : [];
  const recentLogs = recentLogsRaw.map((l) => ({
    ...l,
    user_id: snowflakeString(l.user_id),
  }));
  const users = await discordUsersForIds(recentLogs.map((l) => l.user_id));

  let botStatus: { chatGamesRunning: boolean; dmGamesRunning: boolean } | null =
    null;
  if (isGamesBotApiConfigured()) {
    try {
      botStatus = await cached("games-bot:status", 10_000, getGamesBotStatus);
    } catch {
      botStatus = null;
    }
  }

  return Response.json({
    configured: isDbConfigured(),
    overview,
    recentLogs,
    users,
    botStatus,
  });
});
