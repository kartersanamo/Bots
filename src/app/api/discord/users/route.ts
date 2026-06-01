import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { resolveDiscordUsers } from "@/lib/discord/users";

export const GET = handleApiRoute(async (request) => {
  await requireAction("games.read");
  const idsParam = new URL(request.url).searchParams.get("ids") || "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);

  if (!ids.length) {
    return Response.json({ users: {} });
  }

  const users = await resolveDiscordUsers(ids);
  return Response.json({ users });
});
