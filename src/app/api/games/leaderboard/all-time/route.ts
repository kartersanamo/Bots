import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { getAllTimeLeaderboard } from "@/lib/db/games";
import type { AllTimeLeaderboardType } from "@/lib/games/types";
import { ALL_TIME_LEADERBOARD_TYPES } from "@/lib/games/types";
import { isDbConfigured } from "@/lib/db/pool";
import { discordUsersForIds, snowflakeString } from "@/lib/games/discord-enrich";

export const GET = handleApiRoute(async (request) => {
  await requireAction("games.read");
  const url = new URL(request.url);
  const type = (url.searchParams.get("type") ||
    "all_time_xp") as AllTimeLeaderboardType;
  const limit = Number(url.searchParams.get("limit") || 100);

  const valid = ALL_TIME_LEADERBOARD_TYPES.some((t) => t.id === type);
  if (!valid) {
    return Response.json({ error: "Invalid leaderboard type" }, { status: 400 });
  }

  if (!isDbConfigured()) {
    return Response.json({ entries: [], configured: false });
  }

  const entriesRaw = await getAllTimeLeaderboard(type, limit);
  const entries = entriesRaw.map((e) => ({
    ...e,
    userId: snowflakeString(e.userId),
  }));
  const users = await discordUsersForIds(entries.map((e) => e.userId));
  return Response.json({ entries, users, type, configured: true });
});
