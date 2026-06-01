import { env, envRequired } from "@/lib/env";

const DISCORD_API = "https://discord.com/api/v10";

function botHeaders(): HeadersInit {
  return { Authorization: `Bot ${envRequired("DISCORD_BOT_TOKEN")}` };
}

export interface GuildInfo {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  approximatePresenceCount?: number;
  premiumTier: number;
  description: string | null;
}

export interface GuildRole {
  id: string;
  name: string;
  color: number;
  position: number;
  members?: number;
}

export interface GuildChannel {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
  position: number;
}

export function isDiscordConfigured(): boolean {
  return !!(env("DISCORD_BOT_TOKEN") && env("DISCORD_GUILD_ID"));
}

export async function fetchGuildInfo(): Promise<GuildInfo | null> {
  if (!isDiscordConfigured()) return null;

  const guildId = envRequired("DISCORD_GUILD_ID");
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}?with_counts=true`, {
    headers: botHeaders(),
    next: { revalidate: 60 },
  });

  if (!res.ok) return null;

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    icon: data.icon,
    memberCount: data.approximate_member_count ?? 0,
    approximatePresenceCount: data.approximate_presence_count,
    premiumTier: data.premium_tier ?? 0,
    description: data.description,
  };
}

export async function fetchGuildRoles(): Promise<GuildRole[]> {
  if (!isDiscordConfigured()) return [];

  const guildId = envRequired("DISCORD_GUILD_ID");
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
    headers: botHeaders(),
    next: { revalidate: 300 },
  });

  if (!res.ok) return [];

  const roles: GuildRole[] = await res.json();
  return roles.sort((a, b) => b.position - a.position);
}

export async function fetchGuildChannels(): Promise<GuildChannel[]> {
  if (!isDiscordConfigured()) return [];

  const guildId = envRequired("DISCORD_GUILD_ID");
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
    headers: botHeaders(),
    next: { revalidate: 300 },
  });

  if (!res.ok) return [];

  const channels: GuildChannel[] = await res.json();
  return channels.sort((a, b) => a.position - b.position);
}

export const CHANNEL_TYPE_LABELS: Record<number, string> = {
  0: "Text",
  2: "Voice",
  4: "Category",
  5: "Announcement",
  13: "Stage",
  15: "Forum",
};
