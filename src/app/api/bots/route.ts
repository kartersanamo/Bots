import { requireAction, handleApiRoute } from "@/lib/api/helpers";
import { getAllBots } from "@/lib/bots/registry";
import {
  getAllBotStatus,
  isControlApiConfigured,
} from "@/lib/control-api/client";
import { cached } from "@/lib/server-cache";

const BOTS_STATUS_CACHE_MS = 12_000;

export const GET = handleApiRoute(async () => {
  await requireAction("fleet.view");
  const bots = getAllBots();

  let statusRows: Awaited<ReturnType<typeof getAllBotStatus>>["bots"] = [];
  if (isControlApiConfigured()) {
    try {
      const data = await cached("control-api:bots-status", BOTS_STATUS_CACHE_MS, () =>
        getAllBotStatus()
      );
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
