import { env } from "@/lib/env";
import type { ResolvedDiscordUser } from "@/lib/discord/users.types";
import { cached, invalidateCache } from "@/lib/server-cache";
import dns from "node:dns";
import https from "node:https";

export type { ResolvedDiscordUser };

const USER_CACHE_TTL_MS = 15 * 60 * 1000;
const FETCH_CONCURRENCY = 8;

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  /* Node < 17 */
}

export function isDiscordBotConfigured(): boolean {
  return !!botToken();
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

/** Node https — avoids Next.js patched fetch breaking Discord bot requests. */
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
        family: 4,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let body: unknown = null;
          if (text) {
            try {
              body = JSON.parse(text);
            } catch {
              body = null;
            }
          }
          resolve({ status: res.statusCode ?? 0, body });
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(12_000, () => {
      req.destroy();
      reject(new Error("Discord API timeout"));
    });
    req.end();
  });
}

async function fetchDiscordUserRaw(
  userId: string
): Promise<ResolvedDiscordUser | null> {
  const { status, body } = await discordGet(`/users/${userId}`);

  if (status === 401) {
    invalidateCache("discord-user:");
    console.error("[discord] Bot token rejected (401) for user lookup");
    return null;
  }

  if (status === 429) {
    await sleep(1500);
    return fetchDiscordUserRaw(userId);
  }

  if (status !== 200 || !body || typeof body !== "object") {
    return null;
  }

  const u = body as {
    id: string;
    username?: string;
    global_name?: string | null;
    avatar?: string | null;
  };

  return {
    id: String(u.id),
    username: String(u.username ?? "unknown"),
    displayName: String(u.global_name || u.username || "unknown"),
    avatar: u.avatar ?? null,
    nick: null,
    roles: [],
    joinedAt: null,
  };
}

async function fetchGuildMemberRaw(userId: string) {
  const gid = guildId();
  if (!gid) return null;

  const { status, body } = await discordGet(`/guilds/${gid}/members/${userId}`);
  if (status === 401) {
    invalidateCache("discord-user:");
    return null;
  }
  if (status !== 200 || !body || typeof body !== "object") return null;
  return body as {
    nick?: string | null;
    roles?: string[];
    joined_at?: string | null;
    user: {
      id: string;
      username?: string;
      global_name?: string | null;
      avatar?: string | null;
    };
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function resolveDiscordUserUncached(
  userId: string
): Promise<ResolvedDiscordUser | null> {
  const member = await fetchGuildMemberRaw(userId);
  if (member?.user) {
    const u = member.user;
    const username = String(u.username ?? "unknown");
    const globalName = u.global_name ?? null;
    const nick = member.nick ?? null;
    return {
      id: String(u.id),
      username,
      displayName: nick || globalName || username,
      avatar: u.avatar ?? null,
      nick,
      roles: Array.isArray(member.roles)
        ? member.roles.map((r) => String(r))
        : [],
      joinedAt: member.joined_at ?? null,
    };
  }

  return fetchDiscordUserRaw(userId);
}

export async function resolveDiscordUser(
  userId: string
): Promise<ResolvedDiscordUser | null> {
  const id = userId.trim();
  if (!id || !/^\d{15,22}$/.test(id)) return null;
  if (!botToken()) return null;

  const result = await cached(
    `discord-user:${id}`,
    USER_CACHE_TTL_MS,
    () => resolveDiscordUserUncached(id),
    { cacheNull: false }
  );
  // Backfill legacy cache entries that were stored before roles/joinedAt were added.
  if (
    result &&
    (!Array.isArray((result as Partial<ResolvedDiscordUser>).roles) ||
      !("joinedAt" in (result as object)))
  ) {
    const fresh = await resolveDiscordUserUncached(id);
    return fresh ?? null;
  }
  return result ?? null;
}

async function mapPool<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      await fn(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
}

export async function resolveDiscordUsers(
  userIds: string[]
): Promise<Record<string, ResolvedDiscordUser>> {
  if (!botToken()) return {};

  const unique = [
    ...new Set(
      userIds
        .map((id) => id.trim())
        .filter((id) => /^\d{15,22}$/.test(id))
    ),
  ];

  const out: Record<string, ResolvedDiscordUser> = {};
  await mapPool(unique, FETCH_CONCURRENCY, async (id) => {
    const user = await resolveDiscordUser(id);
    if (user) out[id] = user;
  });

  return out;
}
