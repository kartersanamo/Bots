import {
  requireAction,
  handleApiRoute,
  withAudit,
} from "@/lib/api/helpers";
import { getBotById } from "@/lib/bots/registry";
import { startBot, isControlApiConfigured } from "@/lib/control-api/client";
import { invalidateCache } from "@/lib/server-cache";

export const POST = handleApiRoute(async (request, { params }) => {
  const session = await requireAction("fleet.restart");
  const { botId } = await params;
  if (!getBotById(botId)) {
    return Response.json({ error: "Unknown bot" }, { status: 404 });
  }
  if (!isControlApiConfigured()) {
    return Response.json({ error: "Control API not configured" }, { status: 503 });
  }
  const result = await withAudit(
    request,
    session,
    "bot.start",
    botId,
    () => startBot(botId)
  );
  invalidateCache("control-api");
  return Response.json(result);
});
