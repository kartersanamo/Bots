import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import {
  getDmRotation,
  isGamesBotApiConfigured,
} from "@/lib/games-bot/client";

export const GET = handleApiRoute(async () => {
  await requireAction("games.read");

  if (!isGamesBotApiConfigured()) {
    return Response.json({ configured: false, rotation: null });
  }

  try {
    const rotation = await getDmRotation();
    return Response.json({ configured: true, rotation });
  } catch (err) {
    return Response.json({
      configured: true,
      rotation: null,
      error: err instanceof Error ? err.message : "Unavailable",
    });
  }
});
