import { handleApiRoute, requireAction, withAudit } from "@/lib/api/helpers";
import { getGameSession } from "@/lib/db/games";
import { dmTableForGameName } from "@/lib/games/dm-tables";
import {
  deleteDmSessionEntry,
  updateDmSessionEntry,
} from "@/lib/db/mutations";
import { isDbConfigured } from "@/lib/db/pool";

export const PATCH = handleApiRoute(async (request, ctx) => {
  const session = await requireAction("games.write");
  const gameId = Number((await ctx.params).gameId);
  const userId = String((await ctx.params).userId);
  const body = await request.json();

  if (!isDbConfigured()) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }

  const detail = await getGameSession(gameId);
  if (!detail) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const dmMeta = dmTableForGameName(detail.game.game_name);
  if (!dmMeta) {
    return Response.json({ error: "Not a DM game session" }, { status: 400 });
  }

  const updates = body.updates as Record<string, string | number | null>;
  if (!updates || typeof updates !== "object") {
    return Response.json({ error: "updates required" }, { status: 400 });
  }

  await withAudit(
    request,
    session,
    "games.dm_entry.update",
    `game:${gameId}/user:${userId}`,
    () => updateDmSessionEntry(dmMeta.table, gameId, userId, updates),
    { before: { gameId, userId }, getAfter: () => updates }
  );

  return Response.json({ ok: true });
});

export const DELETE = handleApiRoute(async (request, ctx) => {
  const session = await requireAction("games.write");
  const gameId = Number((await ctx.params).gameId);
  const userId = String((await ctx.params).userId);

  if (!isDbConfigured()) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }

  const detail = await getGameSession(gameId);
  if (!detail) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const dmMeta = dmTableForGameName(detail.game.game_name);
  if (!dmMeta) {
    return Response.json({ error: "Not a DM game session" }, { status: 400 });
  }

  await withAudit(
    request,
    session,
    "games.dm_entry.delete",
    `game:${gameId}/user:${userId}`,
    () => deleteDmSessionEntry(dmMeta.table, gameId, userId)
  );

  return Response.json({ ok: true });
});
