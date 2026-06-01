import { handleApiRoute, requireAction, withAudit } from "@/lib/api/helpers";
import { forceChatGame, isGamesBotApiConfigured } from "@/lib/games-bot/client";

export const POST = handleApiRoute(async (request) => {
  const session = await requireAction("games.control");
  if (!isGamesBotApiConfigured()) {
    return Response.json({ error: "Games bot API not configured" }, { status: 503 });
  }

  const body = await request.json();
  const game = String(body.game || "");
  if (!game) {
    return Response.json({ error: "game required" }, { status: 400 });
  }

  await withAudit(request, session, "games.force_chat", game, () =>
    forceChatGame(game, body.channelId)
  );
  return Response.json({ ok: true });
});
