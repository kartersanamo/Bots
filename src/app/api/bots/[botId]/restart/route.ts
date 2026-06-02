import {
  requireAction,
  handleApiRoute,
  withAudit,
} from "@/lib/api/helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getBotById } from "@/lib/bots/registry";
import { restartBot, isControlApiConfigured } from "@/lib/control-api/client";
import { invalidateCache } from "@/lib/server-cache";

export const POST = handleApiRoute(async (request, { params }) => {
  const session = await requireAction("fleet.restart");
  const limited = checkRateLimit(`fleet:restart:${session.id}`, {
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
  invalidateCache("control-api");
  return Response.json(result);
});
