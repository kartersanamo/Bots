import {
  requireAction,
  handleApiRoute,
  withAudit,
} from "@/lib/api/helpers";
import { getBotById } from "@/lib/bots/registry";
import {
  getBotConfig,
  putBotConfig,
  isControlApiConfigured,
} from "@/lib/control-api/client";

export const GET = handleApiRoute(async (request, { params }) => {
  await requireAction("config.view");
  const { botId } = await params;
  const path = new URL(request.url).searchParams.get("path");
  if (!getBotById(botId) || !path) {
    return Response.json({ error: "botId and path required" }, { status: 400 });
  }
  if (!isControlApiConfigured()) {
    return Response.json({ error: "Control API not configured" }, { status: 503 });
  }
  const data = await getBotConfig(botId, path);
  return Response.json(data);
});

export const PUT = handleApiRoute(async (request, { params }) => {
  const session = await requireAction("config.edit");
  const { botId } = await params;
  const path = new URL(request.url).searchParams.get("path");
  if (!getBotById(botId) || !path) {
    return Response.json({ error: "botId and path required" }, { status: 400 });
  }
  if (!isControlApiConfigured()) {
    return Response.json({ error: "Control API not configured" }, { status: 503 });
  }
  const body = await request.json();
  const result = await withAudit(
    request,
    session,
    "config.write",
    `${botId}:${path}`,
    () => putBotConfig(botId, path, body.content),
    { before: { path } }
  );
  return Response.json(result);
});
