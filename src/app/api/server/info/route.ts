import { requireSession } from "@/lib/auth/session";
import {
  fetchGuildChannels,
  fetchGuildInfo,
  fetchGuildRoles,
  isDiscordConfigured,
} from "@/lib/discord/api";
import { cached } from "@/lib/server-cache";
import { NextResponse } from "next/server";

const SERVER_INFO_CACHE_MS = 120_000;

export async function GET(request: Request) {
  try {
    await requireSession();
    const url = new URL(request.url);
    const includeAllRoles = url.searchParams.get("roles") === "all";
    const includeAllChannels = url.searchParams.get("channels") === "all";

    if (!isDiscordConfigured()) {
      return NextResponse.json({
        configured: false,
        guild: null,
        roles: [],
        channels: [],
      });
    }

    const [guild, roles, channels] = await cached(
      "discord:server-info",
      SERVER_INFO_CACHE_MS,
      () =>
        Promise.all([
          fetchGuildInfo(),
          fetchGuildRoles(),
          fetchGuildChannels(),
        ])
    );

    return NextResponse.json({
      configured: true,
      guild,
      roles: includeAllRoles ? roles : roles.slice(0, 50),
      channels: includeAllChannels ? channels : channels.slice(0, 100),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
