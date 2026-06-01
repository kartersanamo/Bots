import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { getGamesOverview, listRecentXpLogs } from "@/lib/db/games";
import { isDbConfigured } from "@/lib/db/pool";
import {
  getGamesBotStatus,
  isGamesBotApiConfigured,
} from "@/lib/games-bot/client";
import { cached } from "@/lib/server-cache";

export const GET = handleApiRoute(async () => {
  await requireAction("games.read");

  const overview = isDbConfigured() ? await getGamesOverview() : null;
  const recentLogs = isDbConfigured() ? await listRecentXpLogs(10) : [];

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
    botStatus,
  });
});
