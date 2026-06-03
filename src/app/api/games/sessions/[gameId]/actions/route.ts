import { handleApiRoute, requireAction, withAudit } from "@/lib/api/helpers";
import { sessionChatAction, isGamesBotApiConfigured } from "@/lib/games-bot/client";

export const POST = handleApiRoute(async (request, ctx) => {
  const session = await requireAction("games.control");
  const gameId = Number((await ctx.params).gameId);
  const body = await request.json();
  const action = String(body.action || "");

  if (!isGamesBotApiConfigured()) {
    return Response.json(
      { error: "Games bot API not configured" },
      { status: 503 }
    );
  }

  const allowed = [
    "end_game",
    "toggle_2x",
    "reset",
    "reroll",
    "show_correct_answer",
  ];
  if (!allowed.includes(action)) {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  const result = await withAudit(
    request,
    session,
    `games.session.${action}`,
    `game:${gameId}`,
    () => sessionChatAction(gameId, action)
  );

  return Response.json(result);
});
