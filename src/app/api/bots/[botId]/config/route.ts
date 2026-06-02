import {
  requireAction,
  handleApiRoute,
  withAudit,
} from "@/lib/api/helpers";
import { redactConfigSecrets } from "@/lib/api/secrets";
import { checkRateLimit } from "@/lib/api/rate-limit";
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
  const { raw: _raw, content, ...rest } = data as {
    raw?: string;
    content?: unknown;
    path?: string;
  };
  return Response.json({
    ...rest,
    path: data.path,
    content: redactConfigSecrets(content),
  });
});

export const PUT = handleApiRoute(async (request, { params }) => {
  const session = await requireAction("config.edit");
  const limited = checkRateLimit(`config:put:${session.id}`, {
    windowMs: 60_000,
    max: 10,
  });
  if (!limited.ok) {
    return Response.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec ?? 60) },
      }
    );
  }
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
