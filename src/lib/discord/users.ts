import { cached } from "@/lib/server-cache";

const DISCORD_API = "https://discord.com/v10";
const USER_CACHE_TTL_MS = 15 * 60 * 1000;

export interface ResolvedDiscordUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  nick: string | null;
}

function botHeaders(): HeadersInit {
  const token = process.env.DISCORD_BOT_TOKEN || "";
  return { Authorization: `Bot ${token}` };
}

function guildId(): string | null {
  return (
    process.env.DISCORD_GUILD_ID ||
    process.env.NEXT_PUBLIC_DISCORD_GUILD_ID ||
    null
  );
}

async function fetchDiscordUserRaw(userId: string) {
  const res = await fetch(`${DISCORD_API}/users/${userId}`, {
    headers: botHeaders(),
  });
  if (!res.ok) return null;
  const u = await res.json();
  return {
    id: String(u.id),
    username: String(u.username ?? "unknown"),
    global_name: u.global_name ?? null,
    avatar: u.avatar ?? null,
  };
}

async function fetchGuildMemberRaw(userId: string) {
  const gid = guildId();
  if (!gid) return null;
  const res = await fetch(
    `${DISCORD_API}/guilds/${gid}/members/${userId}`,
    { headers: botHeaders() }
  );
  if (!res.ok) return null;
  return res.json();
}

export async function resolveDiscordUser(
  userId: string
): Promise<ResolvedDiscordUser | null> {
  if (!userId || !/^\d+$/.test(userId)) return null;

  return cached(`discord-user:${userId}`, USER_CACHE_TTL_MS, async () => {
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

    const user = await fetchDiscordUserRaw(userId);
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      displayName: user.global_name || user.username,
      avatar: user.avatar,
      nick: null,
    };
  });
}

export async function resolveDiscordUsers(
  userIds: string[]
): Promise<Record<string, ResolvedDiscordUser>> {
  const unique = [...new Set(userIds.filter((id) => /^\d+$/.test(id)))];
  const out: Record<string, ResolvedDiscordUser> = {};
  await Promise.all(
    unique.map(async (id) => {
      const user = await resolveDiscordUser(id);
      if (user) out[id] = user;
    })
  );
  return out;
}
