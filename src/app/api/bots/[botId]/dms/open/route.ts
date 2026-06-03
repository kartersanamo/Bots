import { requireAction, handleApiRoute } from "@/lib/api/helpers";
import { getBotById } from "@/lib/bots/registry";
import {
  openBotDm,
  isControlApiConfigured,
  ControlApiError,
} from "@/lib/control-api/client";

export const POST = handleApiRoute(async (request, { params }) => {
  await requireAction("dm.view");
  const { botId } = await params;
  if (!getBotById(botId)) {
    return Response.json({ error: "Unknown bot" }, { status: 404 });
  }
  if (!isControlApiConfigured()) {
    return Response.json({ error: "Control API not configured" }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const userId = String(body.user_id ?? "").trim();
  if (!/^\d{17,20}$/.test(userId)) {
    return Response.json({ error: "Valid user_id required" }, { status: 400 });
  }
  try {
    const data = await openBotDm(botId, userId);
    return Response.json(data);
  } catch (err) {
    const message =
      err instanceof ControlApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to open DM";
    return Response.json({ error: message }, { status: 502 });
  }
});
