import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { isDiscordConfigured } from "@/lib/discord/api";
import {
  fetchGuildBans,
  mapGuildBanRow,
} from "@/lib/discord/guild-bans";
import { can } from "@/lib/permissions";
import { jsonCached } from "@/lib/http/json-cache";

export const GET = handleApiRoute(async () => {
  const session = await requireAction("bans.read");

  if (!isDiscordConfigured()) {
    return Response.json({
      configured: false,
      canRevoke: false,
      viewer: {
        id: session.id,
        username: session.username,
        globalName: session.globalName,
      },
      bans: [],
      error: "Discord bot is not configured on this dashboard.",
    });
  }

  const raw = await fetchGuildBans();
  if (raw === null) {
    return Response.json(
      {
        configured: true,
        canRevoke: can(session.tier, "bans.write"),
        viewer: {
          id: session.id,
          username: session.username,
          globalName: session.globalName,
        },
        bans: [],
        error:
          "Could not load bans from Discord. Ensure the bot has BAN_MEMBERS and access to the guild.",
      },
      { status: 502 }
    );
  }

  const bans = raw
    .map(mapGuildBanRow)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return jsonCached(
    {
      configured: true,
      canRevoke: can(session.tier, "bans.write"),
      viewer: {
        id: session.id,
        username: session.username,
        globalName: session.globalName,
      },
      bans,
      fetchedAt: Date.now(),
    },
    30,
    { staleWhileRevalidate: 60, private: true }
  );
});
