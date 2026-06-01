import { requireAction, handleApiRoute } from "@/lib/api/helpers";
import { getBotById } from "@/lib/bots/registry";
import { listBotDms, isControlApiConfigured } from "@/lib/control-api/client";

export const GET = handleApiRoute(async (request, { params }) => {
  await requireAction("dm.view");
  const { botId } = await params;
  if (!getBotById(botId)) {
    return Response.json({ error: "Unknown bot" }, { status: 404 });
  }
  if (!isControlApiConfigured()) {
    return Response.json({ channels: [] });
  }
  const limit = Number(new URL(request.url).searchParams.get("limit") || 50);
  const data = await listBotDms(botId, limit);
  return Response.json(data);
});
