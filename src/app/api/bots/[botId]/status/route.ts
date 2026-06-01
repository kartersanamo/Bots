import { requireAction, handleApiRoute } from "@/lib/api/helpers";
import { getBotById } from "@/lib/bots/registry";
import { getBotStatus, isControlApiConfigured } from "@/lib/control-api/client";

export const GET = handleApiRoute(async (_req, { params }) => {
  await requireAction("fleet.view");
  const { botId } = await params;
  if (!getBotById(botId)) {
    return Response.json({ error: "Unknown bot" }, { status: 404 });
  }
  if (!isControlApiConfigured()) {
    return Response.json({ botId, status: "unknown" });
  }
  const status = await getBotStatus(botId);
  return Response.json(status);
});
