import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import {
  isDiscordBotConfigured,
  resolveDiscordUsers,
} from "@/lib/discord/users.server";
import { collectSnowflakeIds } from "@/lib/games/snowflake";
import { jsonCached } from "@/lib/http/json-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handleApiRoute(async (request) => {
  await requireAction("games.read");
  const idsParam = new URL(request.url).searchParams.get("ids") || "";
  const ids = collectSnowflakeIds(idsParam.split(",")).slice(0, 100);

  if (!ids.length) {
    return Response.json({ users: {} });
  }

  if (!isDiscordBotConfigured()) {
    return Response.json({ users: {}, error: "Discord bot not configured" });
  }

  const users = await resolveDiscordUsers(ids);
  return jsonCached(
    {
      users,
      resolved: Object.keys(users).length,
      requested: ids.length,
    },
    300,
    { staleWhileRevalidate: 600, private: true }
  );
});
