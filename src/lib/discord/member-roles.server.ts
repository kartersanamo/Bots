import { env } from "@/lib/env";
import { invalidateCache } from "@/lib/server-cache";
import dns from "node:dns";
import https from "node:https";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  /* Node < 17 */
}

function botToken(): string {
  return (
    env("DISCORD_BOT_TOKEN") ||
    env("BOT_GAMES_TOKEN") ||
    env("BOT_TICKETS_TOKEN")
  );
}

function guildId(): string | null {
  const id = env("DISCORD_GUILD_ID") || env("NEXT_PUBLIC_DISCORD_GUILD_ID");
  return id || null;
}

function discordGet(path: string): Promise<{ status: number; body: unknown }> {
  const token = botToken();
  if (!token) {
    return Promise.resolve({ status: 0, body: null });
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "discord.com",
        path: `/api/v10${path}`,
        method: "GET",
        headers: {
          Authorization: `Bot ${token}`,
          "User-Agent": "MinecadiaBotsDashboard/1.0 (Discord Bot)",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf-8");
          let body: unknown = null;
          if (text) {
            try {
              body = JSON.parse(text);
            } catch {
              body = text;
            }
          }
          resolve({ status: res.statusCode ?? 0, body });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

/** Guild member role IDs via bot token (for session authorization). */
export async function fetchMemberRoleIds(userId: string): Promise<string[]> {
  const gid = guildId();
  if (!gid || !botToken()) return [];

  const { status, body } = await discordGet(`/guilds/${gid}/members/${userId}`);
  if (status === 401) {
    invalidateCache("discord-user:");
    return [];
  }
  if (status !== 200 || !body || typeof body !== "object") return [];

  const roles = (body as { roles?: string[] }).roles;
  return Array.isArray(roles) ? roles.map((r) => String(r)) : [];
}
