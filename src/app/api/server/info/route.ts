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

export async function GET() {
  try {
    await requireSession();

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
      roles: roles.slice(0, 50),
      channels: channels.slice(0, 100),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
