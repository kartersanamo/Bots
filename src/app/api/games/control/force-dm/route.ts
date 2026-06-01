import { handleApiRoute, requireAction, withAudit } from "@/lib/api/helpers";
import { forceDmRefresh, isGamesBotApiConfigured } from "@/lib/games-bot/client";

export const POST = handleApiRoute(async (request) => {
  const session = await requireAction("games.control");
  if (!isGamesBotApiConfigured()) {
    return Response.json({ error: "Games bot API not configured" }, { status: 503 });
  }

  await withAudit(request, session, "games.force_dm", "dm", () => forceDmRefresh());
  return Response.json({ ok: true });
});
