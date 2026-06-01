import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { getGameSession, listDmSessionEntries } from "@/lib/db/games";
import { dmTableForGameName } from "@/lib/games/dm-tables";
import {
  getSessionLiveState,
  isGamesBotApiConfigured,
} from "@/lib/games-bot/client";
import { isDbConfigured } from "@/lib/db/pool";
import { discordUsersForIds, snowflakeString } from "@/lib/games/discord-enrich";

export const GET = handleApiRoute(async (_request, ctx) => {
  await requireAction("games.read");
  const gameId = Number((await ctx.params).gameId);
  if (!Number.isFinite(gameId)) {
    return Response.json({ error: "Invalid game id" }, { status: 400 });
  }

  if (!isDbConfigured()) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }

  const detail = await getGameSession(gameId);
  if (!detail) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const isDm =
    detail.game.dm_game === 1 || detail.game.dm_game === "1";

  let dmEntries: Record<string, string | number | null>[] = [];
  const dmMeta = isDm ? dmTableForGameName(detail.game.game_name) : null;
  if (dmMeta) {
    dmEntries = await listDmSessionEntries(
      gameId,
      dmMeta.table,
      dmMeta.columns
    );
  }

  let live = null;
  if (!isDm && isGamesBotApiConfigured()) {
    try {
      live = await getSessionLiveState(gameId);
    } catch {
      live = null;
    }
  }

  const xpLogs = detail.xpLogs.map((l) => ({
    ...l,
    user_id: snowflakeString(l.user_id),
  }));
  const dmEntriesNormalized = dmEntries.map((e) => ({
    ...e,
    user_id: snowflakeString(e.user_id),
  }));
  const winnerIds =
    live?.winners?.map((w) => snowflakeString(w.user_id)).filter(Boolean) ?? [];
  const users = await discordUsersForIds([
    ...xpLogs.map((l) => l.user_id),
    ...dmEntriesNormalized.map((e) => e.user_id),
    ...winnerIds,
  ]);

  return Response.json({
    game: detail.game,
    xpLogs,
    dmEntries: dmEntriesNormalized,
    dmMeta,
    live,
    users,
  });
});
