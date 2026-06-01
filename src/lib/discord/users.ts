import { cached, invalidateCache } from "@/lib/server-cache";

const DISCORD_API = "https://discord.com/v10";
const USER_CACHE_TTL_MS = 15 * 60 * 1000;
const FETCH_CONCURRENCY = 8;

export interface ResolvedDiscordUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  nick: string | null;
}

export function isDiscordBotConfigured(): boolean {
  return !!botToken();
}

function botToken(): string {
  return (process.env.DISCORD_BOT_TOKEN || "").trim();
}

function botHeaders(): HeadersInit {
  return { Authorization: `Bot ${botToken()}` };
}

const discordFetchInit: RequestInit = { cache: "no-store" };

function guildId(): string | null {
  const id =
    process.env.DISCORD_GUILD_ID ||
    process.env.NEXT_PUBLIC_DISCORD_GUILD_ID ||
    "";
  return id.trim() || null;
}

async function fetchDiscordUserRaw(
  userId: string
): Promise<ResolvedDiscordUser | null> {
  if (!botToken()) return null;

  const res = await fetch(`${DISCORD_API}/users/${userId}`, {
    ...discordFetchInit,
    headers: botHeaders(),
  });

  if (res.status === 401) {
    invalidateCache("discord-user:");
    console.error("[discord] Bot token rejected (401) for user lookup");
    return null;
  }

  if (!res.ok) {
    if (res.status === 429) {
      const retry = res.headers.get("retry-after");
      await sleep((Number(retry) || 1) * 1000);
      return fetchDiscordUserRaw(userId);
    }
    return null;
  }

  const u = await res.json();
  return {
    id: String(u.id),
    username: String(u.username ?? "unknown"),
    displayName: String(u.global_name || u.username || "unknown"),
    avatar: u.avatar ?? null,
    nick: null,
  };
}

async function fetchGuildMemberRaw(userId: string) {
  const gid = guildId();
  if (!gid || !botToken()) return null;

  const res = await fetch(
    `${DISCORD_API}/guilds/${gid}/members/${userId}`,
    {
      ...discordFetchInit,
      headers: botHeaders(),
    }
  );

  if (res.status === 401) {
    invalidateCache("discord-user:");
    return null;
  }

  if (!res.ok) return null;
  return res.json();
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
  return result ?? null;
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
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
