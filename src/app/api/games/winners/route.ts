import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { getBotConfig, isControlApiConfigured } from "@/lib/control-api/client";
import { discordUsersForIds, snowflakeString } from "@/lib/games/discord-enrich";

export const GET = handleApiRoute(async () => {
  await requireAction("games.read");

  if (!isControlApiConfigured()) {
    return Response.json({ months: {}, configured: false });
  }

  try {
    const data = await getBotConfig("games", "assets/configs/winners.json");
    const content = (data.content ?? {}) as {
      Months?: Record<string, Record<string, number>>;
    };
    const months = content.Months ?? {};
    const allIds = Object.values(months).flatMap((winners) =>
      Object.keys(winners).map((id) => snowflakeString(id))
    );
    const users = await discordUsersForIds(allIds);
    return Response.json({
      months,
      users,
      configured: true,
    });
  } catch {
    return Response.json({ months: {}, configured: true, error: "winners.json not found" });
  }
});
