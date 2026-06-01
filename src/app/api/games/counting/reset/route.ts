import { handleApiRoute, requireAction, withAudit } from "@/lib/api/helpers";
import { resetCountingServer } from "@/lib/db/mutations";

export const POST = handleApiRoute(async (request) => {
  const session = await requireAction("games.write");
  const guildId =
    process.env.DISCORD_GUILD_ID ||
    process.env.NEXT_PUBLIC_DISCORD_GUILD_ID ||
    "";

  if (!guildId) {
    return Response.json({ error: "Guild ID not configured" }, { status: 503 });
  }

  await withAudit(request, session, "games.counting_reset", guildId, () =>
    resetCountingServer(guildId)
  );
  return Response.json({ ok: true });
});
