import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { isDiscordConfigured } from "@/lib/discord/api";
import { fetchGuildTimeouts } from "@/lib/discord/guild-timeouts";
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
      timeouts: [],
      error: "Discord bot is not configured on this dashboard.",
    });
  }

  const raw = await fetchGuildTimeouts();
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
        timeouts: [],
        error:
          "Could not load timed-out members. Ensure the bot has Server Members Intent and Moderate Members permission.",
      },
      { status: 502 }
    );
  }

  return jsonCached(
    {
      configured: true,
      canRevoke: can(session.tier, "bans.write"),
      viewer: {
        id: session.id,
        username: session.username,
        globalName: session.globalName,
      },
      timeouts: raw,
      fetchedAt: Date.now(),
    },
    30,
    { staleWhileRevalidate: 60, private: true }
  );
});
