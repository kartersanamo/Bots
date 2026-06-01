import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { getCountingData } from "@/lib/db/games";
import { isDbConfigured } from "@/lib/db/pool";
import { env } from "@/lib/env";
import { discordUsersForIds, snowflakeString } from "@/lib/games/discord-enrich";

export const GET = handleApiRoute(async () => {
  await requireAction("games.read");
  const guildId = env("DISCORD_GUILD_ID") || env("NEXT_PUBLIC_DISCORD_GUILD_ID");

  if (!isDbConfigured() || !guildId) {
    return Response.json({ server: null, users: [], configured: false });
  }

  const data = await getCountingData(guildId);
  const users = data.users.map((u) => ({
    ...u,
    user_id: snowflakeString(u.user_id),
  }));
  const discordUsers = await discordUsersForIds(users.map((u) => u.user_id));
  return Response.json({
    server: data.server,
    users,
    discordUsers,
    configured: true,
  });
});
