import { requireAction, handleApiRoute } from "@/lib/api/helpers";
import { getBotById } from "@/lib/bots/registry";
import {
  listBotDms,
  isControlApiConfigured,
  ControlApiError,
} from "@/lib/control-api/client";
import { getDmCandidateUserIds } from "@/lib/discord/dm-candidates.server";

export const GET = handleApiRoute(async (request, { params }) => {
  await requireAction("dm.view");
  const { botId } = await params;
  if (!getBotById(botId)) {
    return Response.json({ error: "Unknown bot" }, { status: 404 });
  }
  if (!isControlApiConfigured()) {
    return Response.json({
      channels: [],
      error: "Control API not configured (set CONTROL_API_SECRET)",
    });
  }
  const limit = Number(new URL(request.url).searchParams.get("limit") || 50);
  const candidates = await getDmCandidateUserIds(botId);
  try {
    const data = await listBotDms(botId, limit, candidates);
    return Response.json(data);
  } catch (err) {
    const message =
      err instanceof ControlApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to load DMs";
    return Response.json({ channels: [], error: message }, { status: 502 });
  }
});
