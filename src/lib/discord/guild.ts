import { env } from "@/lib/env";

/** Guild ID for Discord deep links (client + server). */
export function discordGuildId(): string {
  return env("NEXT_PUBLIC_DISCORD_GUILD_ID") || env("DISCORD_GUILD_ID");
}

/** https://discord.com/channels/{guild_id}/{channel_id} */
export function discordChannelUrl(channelId: string): string {
  const guildId = discordGuildId();
  return `https://discord.com/channels/${guildId}/${channelId}`;
}

/** Opens the guild in Discord (audit log is under Server Settings). */
export function discordGuildUrl(): string {
  const guildId = discordGuildId();
  return guildId ? `https://discord.com/channels/${guildId}` : "";
}
