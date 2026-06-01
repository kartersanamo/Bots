import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import {
  getGamesBotStatus,
  isGamesBotApiConfigured,
} from "@/lib/games-bot/client";

export const GET = handleApiRoute(async () => {
  await requireAction("games.read");

  if (!isGamesBotApiConfigured()) {
    return Response.json({ configured: false, status: null });
  }

  try {
    const status = await getGamesBotStatus();
    return Response.json({ configured: true, status });
  } catch (err) {
    return Response.json({
      configured: true,
      status: null,
      error: err instanceof Error ? err.message : "Unavailable",
    });
  }
});
