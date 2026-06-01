import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { fetchGuildAuditLogs } from "@/lib/discord/audit";
import { isDiscordConfigured } from "@/lib/discord/api";
import { cached } from "@/lib/server-cache";

const CACHE_MS = 20_000;

export const GET = handleApiRoute(async (request) => {
  await requireAction("audit.view");

  if (!isDiscordConfigured()) {
    return Response.json({
      configured: false,
      entries: [],
      users: [],
      error: "DISCORD_BOT_TOKEN and DISCORD_GUILD_ID required",
    });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || 50);
  const before = url.searchParams.get("before") || undefined;
  const userId = url.searchParams.get("userId") || undefined;

  const cacheKey = `discord-audit:${before ?? ""}:${userId ?? ""}:${limit}`;

  try {
    const data = before
      ? await fetchGuildAuditLogs({ limit, before, userId })
      : await cached(cacheKey, CACHE_MS, () =>
          fetchGuildAuditLogs({ limit, before, userId })
        );

    return Response.json({
      configured: true,
      entries: data.entries,
      users: data.users,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load audit log";
    return Response.json({
      configured: true,
      entries: [],
      users: [],
      error: message,
    });
  }
});
