import { requireAction, handleApiRoute } from "@/lib/api/helpers";
import { getAllBots } from "@/lib/bots/registry";
import {
  getAllBotStatus,
  isControlApiConfigured,
} from "@/lib/control-api/client";

export const GET = handleApiRoute(async () => {
  await requireAction("fleet.view");
  const bots = getAllBots();

  let statusRows: Awaited<ReturnType<typeof getAllBotStatus>>["bots"] = [];
  if (isControlApiConfigured()) {
    try {
      const data = await getAllBotStatus();
      statusRows = data.bots;
    } catch {
      /* control API unavailable */
    }
  }

  const statusById = Object.fromEntries(statusRows.map((s) => [s.botId, s]));

  return Response.json({
    bots: bots.map((bot) => {
      const row = statusById[bot.id];
      return {
        ...bot,
        status:
          (row?.status as
            | "online"
            | "offline"
            | "starting"
            | "degraded"
            | "unknown") || "unknown",
        pid: row?.pid ?? null,
        uptimeSeconds: row?.uptimeSeconds ?? null,
      };
    }),
  });
});
