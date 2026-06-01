import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { getCountingData } from "@/lib/db/games";
import { isDbConfigured } from "@/lib/db/pool";

export const GET = handleApiRoute(async () => {
  await requireAction("games.read");
  const guildId =
    process.env.DISCORD_GUILD_ID ||
    process.env.NEXT_PUBLIC_DISCORD_GUILD_ID ||
    "";

  if (!isDbConfigured() || !guildId) {
    return Response.json({ server: null, users: [], configured: false });
  }

  const data = await getCountingData(guildId);
  return Response.json({ ...data, configured: true });
});
