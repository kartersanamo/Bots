import {
  requireAction,
  handleApiRoute,
  withAudit,
} from "@/lib/api/helpers";
import { getBotById } from "@/lib/bots/registry";
import {
  getDmMessages,
  sendDmMessage,
  isControlApiConfigured,
} from "@/lib/control-api/client";

export const GET = handleApiRoute(async (request, { params }) => {
  await requireAction("dm.view");
  const { botId, channelId } = await params;
  if (!getBotById(botId)) {
    return Response.json({ error: "Unknown bot" }, { status: 404 });
  }
  if (!isControlApiConfigured()) {
    return Response.json({ messages: [] });
  }
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || 50);
  const before = url.searchParams.get("before") || undefined;
  const data = await getDmMessages(botId, channelId, limit, before);
  return Response.json(data);
});

export const POST = handleApiRoute(async (request, { params }) => {
  const session = await requireAction("dm.send");
  const { botId, channelId } = await params;
  if (!getBotById(botId)) {
    return Response.json({ error: "Unknown bot" }, { status: 404 });
  }
  if (!isControlApiConfigured()) {
    return Response.json({ error: "Control API not configured" }, { status: 503 });
  }
  const { content } = await request.json();
  if (!content || typeof content !== "string") {
    return Response.json({ error: "content required" }, { status: 400 });
  }
  const result = await withAudit(
    request,
    session,
    "dm.send",
    `${botId}:${channelId}`,
    () => sendDmMessage(botId, channelId, content)
  );
  return Response.json(result);
});
