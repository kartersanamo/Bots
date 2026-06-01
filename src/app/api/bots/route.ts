import { requireAction, handleApiRoute } from "@/lib/api/helpers";
import { getAllBots } from "@/lib/bots/registry";
import {
  getAllBotStatus,
  isControlApiConfigured,
} from "@/lib/control-api/client";

export const GET = handleApiRoute(async () => {
  await requireAction("fleet.view");
  const bots = getAllBots();
  let statusMap: Record<string, string> = {};

  if (isControlApiConfigured()) {
    try {
      const { bots: statuses } = await getAllBotStatus();
      statusMap = Object.fromEntries(
        statuses.map((s) => [s.botId, s.status])
      );
    } catch {
      /* control API unavailable */
    }
  }

  return Response.json({
    bots: bots.map((bot) => ({
      ...bot,
      status: (statusMap[bot.id] as
        | "online"
        | "offline"
        | "starting"
        | "degraded"
        | "unknown") || "unknown",
    })),
  });
});
