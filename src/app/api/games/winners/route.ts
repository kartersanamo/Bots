import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { getBotConfig, isControlApiConfigured } from "@/lib/control-api/client";

export const GET = handleApiRoute(async () => {
  await requireAction("games.read");

  if (!isControlApiConfigured()) {
    return Response.json({ months: {}, configured: false });
  }

  try {
    const data = await getBotConfig("games", "assets/Configs/winners.json");
    const content = (data.content ?? {}) as { Months?: Record<string, unknown> };
    return Response.json({
      months: content.Months ?? {},
      configured: true,
    });
  } catch {
    return Response.json({ months: {}, configured: true, error: "winners.json not found" });
  }
});
