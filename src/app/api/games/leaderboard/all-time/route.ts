import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { getGamesLeaderboard } from "@/lib/db/games";
import type { GamesLeaderboardType } from "@/lib/games/types";
import { GAMES_LEADERBOARD_CATALOG } from "@/lib/games/types";
import { isDbConfigured } from "@/lib/db/pool";
import { snowflakeString } from "@/lib/games/snowflake";
import { cached } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

export const GET = handleApiRoute(async (request) => {
  await requireAction("games.read");
  const url = new URL(request.url);
  const type = (url.searchParams.get("type") ||
    "all_time_xp") as GamesLeaderboardType;
  const limit = Number(url.searchParams.get("limit") || 100);

  const valid = GAMES_LEADERBOARD_CATALOG.some((t) => t.id === type);
  if (!valid) {
    return Response.json({ error: "Invalid leaderboard type" }, { status: 400 });
  }

  if (!isDbConfigured()) {
    return Response.json({ entries: [], configured: false });
  }

  const entriesRaw = await cached(
    `games:alltime:${type}:${limit}`,
    60_000,
    () => getGamesLeaderboard(type, limit)
  );
  const entries = entriesRaw.map((e) => ({
    ...e,
    userId: snowflakeString(e.userId),
  }));
  return Response.json({ entries, type, configured: true });
});
