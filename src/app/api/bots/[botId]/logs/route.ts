import { requireAction, handleApiRoute } from "@/lib/api/helpers";
import { getBotById } from "@/lib/bots/registry";
import { tailBotLogs, isControlApiConfigured } from "@/lib/control-api/client";

export const GET = handleApiRoute(async (request, { params }) => {
  await requireAction("logs.view");
  const { botId } = await params;
  if (!getBotById(botId)) {
    return Response.json({ error: "Unknown bot" }, { status: 404 });
  }
  if (!isControlApiConfigured()) {
    return Response.json({ lines: [], file: null, files: [] });
  }
  const url = new URL(request.url);
  const lines = Number(url.searchParams.get("lines") || 100);
  const search = url.searchParams.get("search") || undefined;
  const file = url.searchParams.get("file") || undefined;
  const data = await tailBotLogs(botId, { lines, search, file });
  return Response.json(data);
});
