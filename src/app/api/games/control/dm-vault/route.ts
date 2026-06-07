import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import {
  isGamesBotApiConfigured,
  setDmVault,
} from "@/lib/games-bot/client";

export const POST = handleApiRoute(async (request: Request) => {
  await requireAction("games.control");

  if (!isGamesBotApiConfigured()) {
    return Response.json({ error: "Games bot API not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const game = String(body.game ?? "").trim();
  if (!game) {
    return Response.json({ error: "game required" }, { status: 400 });
  }
  if (typeof body.vaulted !== "boolean") {
    return Response.json({ error: "vaulted (boolean) required" }, { status: 400 });
  }

  try {
    const result = await setDmVault(game, body.vaulted);
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 502 }
    );
  }
});
