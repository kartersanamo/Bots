import {
  requireAction,
  handleApiRoute,
  withAudit,
} from "@/lib/api/helpers";
import { getAllBots } from "@/lib/bots/registry";
import { restartBot, isControlApiConfigured } from "@/lib/control-api/client";

export const POST = handleApiRoute(async (request) => {
  const session = await requireAction("fleet.restart_all");
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
  return Response.json({ results });
});
