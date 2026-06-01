import { handleApiRoute, requireAction, withAudit } from "@/lib/api/helpers";
import { toggleChatGames, isGamesBotApiConfigured } from "@/lib/games-bot/client";

export const POST = handleApiRoute(async (request) => {
  const session = await requireAction("games.control");
  if (!isGamesBotApiConfigured()) {
    return Response.json({ error: "Games bot API not configured" }, { status: 503 });
  }

  const result = await withAudit(request, session, "games.toggle_chat", "chat", () =>
    toggleChatGames()
  );
  return Response.json(result);
});
