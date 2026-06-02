import {
  requireAction,
  handleApiRoute,
  withAudit,
} from "@/lib/api/helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getAllBots } from "@/lib/bots/registry";
import { restartBot, isControlApiConfigured } from "@/lib/control-api/client";
import { invalidateCache } from "@/lib/server-cache";

export const POST = handleApiRoute(async (request) => {
  const session = await requireAction("fleet.restart_all");
  const limited = checkRateLimit(`fleet:restart-all:${session.id}`, {
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
  if (!isControlApiConfigured()) {
    return Response.json({ error: "Control API not configured" }, { status: 503 });
  }
  const { confirm } = await request.json();
  if (confirm !== "RESTART_ALL") {
    return Response.json(
      { error: 'Send { "confirm": "RESTART_ALL" }' },
      { status: 400 }
    );
  }
  const results = await withAudit(
    request,
    session,
    "fleet.restart_all",
    "all",
    async () => {
      const out: { botId: string; ok?: boolean; status?: string; error?: string }[] = [];
      for (const bot of getAllBots()) {
        try {
          const result = (await restartBot(bot.id)) as {
            ok?: boolean;
            status?: string;
          };
          out.push({ botId: bot.id, ...result });
        } catch (e) {
          out.push({
            botId: bot.id,
            error: e instanceof Error ? e.message : "failed",
          });
        }
      }
      return out;
    }
  );
  invalidateCache("control-api");
  return Response.json({ results });
});
