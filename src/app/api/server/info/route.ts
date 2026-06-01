import { requireSession } from "@/lib/auth/session";
import {
  fetchGuildChannels,
  fetchGuildInfo,
  fetchGuildRoles,
  isDiscordConfigured,
} from "@/lib/discord/api";
import { NextResponse } from "next/server";

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

    const [guild, roles, channels] = await Promise.all([
      fetchGuildInfo(),
      fetchGuildRoles(),
      fetchGuildChannels(),
    ]);

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
