import { env, envRequired } from "@/lib/env";

function isDiscordConfigured(): boolean {
  return !!(env("DISCORD_BOT_TOKEN") && env("DISCORD_GUILD_ID"));
}

const DISCORD_API = "https://discord.com/api/v10";

export interface GuildBanUser {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  discriminator: string;
}

export interface GuildBan {
  user: GuildBanUser;
  reason: string | null;
}

export interface GuildBanRow {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  reason: string | null;
}

function botHeaders(): HeadersInit {
  return { Authorization: `Bot ${envRequired("DISCORD_BOT_TOKEN")}` };
}

export function guildBanAvatarUrl(
  userId: string,
  avatar: string | null
): string | null {
  if (!avatar) return null;
  const ext = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${ext}?size=64`;
}

export function mapGuildBanRow(ban: GuildBan): GuildBanRow {
  const user = ban.user;
  return {
    userId: user.id,
    username: user.username,
    displayName: user.globalName?.trim() || user.username,
    avatarUrl: guildBanAvatarUrl(user.id, user.avatar),
    reason: ban.reason?.trim() || null,
  };
}

/** All guild bans (paginated). Requires BAN_MEMBERS intent on the bot. */
export async function fetchGuildBans(): Promise<GuildBan[] | null> {
  if (!isDiscordConfigured()) return null;

  const guildId = envRequired("DISCORD_GUILD_ID");
  const all: GuildBan[] = [];
  let after: string | undefined;

  for (;;) {
    const url = new URL(`${DISCORD_API}/guilds/${guildId}/bans`);
    url.searchParams.set("limit", "1000");
    if (after) url.searchParams.set("after", after);

    const res = await fetch(url.toString(), {
      headers: botHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[discord] fetchGuildBans failed:", res.status, text);
      return null;
    }

    const batch = (await res.json()) as GuildBan[];
    if (!batch.length) break;

    all.push(...batch);
    if (batch.length < 1000) break;

    const lastId = batch[batch.length - 1]?.user?.id;
    if (!lastId) break;
    after = lastId;
  }

  return all;
}

export async function fetchGuildBanCount(): Promise<number | null> {
  const bans = await fetchGuildBans();
  return bans ? bans.length : null;
}

export function discordGuildId(): string {
  return env("DISCORD_GUILD_ID") || envRequired("DISCORD_GUILD_ID");
}
