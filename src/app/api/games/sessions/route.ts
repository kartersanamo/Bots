import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { listGameSessions } from "@/lib/db/games";
import {
  getActiveChatGameIds,
  isGamesBotApiConfigured,
} from "@/lib/games-bot/client";
import { isDbConfigured } from "@/lib/db/pool";

export const GET = handleApiRoute(async (request) => {
  await requireAction("games.read");
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || 80);
  const search = url.searchParams.get("search") || undefined;
  const dmParam = url.searchParams.get("dm");
  const dm =
    dmParam === "chat" || dmParam === "dm" ? dmParam : ("all" as const);

  if (!isDbConfigured()) {
    return Response.json({ sessions: [], configured: false });
  }

  const sessions = await listGameSessions({ limit, search, dm });

  let activeChatIds = new Set<number>();
  if (isGamesBotApiConfigured()) {
    try {
      const { gameIds } = await getActiveChatGameIds();
      activeChatIds = new Set(gameIds);
    } catch {
      activeChatIds = new Set();
    }
  }

  const enriched = sessions.map((s) => {
    const isDm = s.dm_game === 1 || s.dm_game === "1";
    return {
      ...s,
      active: !isDm && activeChatIds.has(Number(s.game_id)),
    };
  });

  return Response.json({ sessions: enriched, configured: true });
});
