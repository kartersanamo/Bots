import { handleApiRoute, requireAction, withAudit } from "@/lib/api/helpers";
import { wipeLevels, isGamesBotApiConfigured } from "@/lib/games-bot/client";

export const POST = handleApiRoute(async (request) => {
  const session = await requireAction("games.wipe");
  if (!isGamesBotApiConfigured()) {
    return Response.json({ error: "Games bot API not configured" }, { status: 503 });
  }

  const body = await request.json();
  const month = String(body.month || "").trim();
  const confirm = String(body.confirm || "");

  if (!month) {
    return Response.json({ error: "month required" }, { status: 400 });
  }
  if (confirm !== "WIPE_LEVELS") {
    return Response.json(
      { error: 'Send { "confirm": "WIPE_LEVELS" }' },
      { status: 400 }
    );
  }

  const result = await withAudit(request, session, "games.wipe_levels", month, () =>
    wipeLevels(month, session.id)
  );
  return Response.json({ ok: true, result });
});
