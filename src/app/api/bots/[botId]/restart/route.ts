import {
  requireAction,
  handleApiRoute,
  withAudit,
} from "@/lib/api/helpers";
import { getBotById } from "@/lib/bots/registry";
import { restartBot, isControlApiConfigured } from "@/lib/control-api/client";

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
    "bot.restart",
    botId,
    () => restartBot(botId)
  );
  return Response.json(result);
});
