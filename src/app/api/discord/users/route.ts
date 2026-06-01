import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { resolveDiscordUsers } from "@/lib/discord/users";
import { collectSnowflakeIds } from "@/lib/games/discord-enrich";

export const GET = handleApiRoute(async (request) => {
  await requireAction("games.read");
  const idsParam = new URL(request.url).searchParams.get("ids") || "";
  const ids = collectSnowflakeIds(idsParam.split(",")).slice(0, 100);

  if (!ids.length) {
    return Response.json({ users: {} });
  }

  const users = await resolveDiscordUsers(ids);
  return Response.json({ users });
});
