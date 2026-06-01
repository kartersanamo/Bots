/** Guild ID for Discord deep links (client + server). */
export function discordGuildId(): string {
  return (
    process.env.NEXT_PUBLIC_DISCORD_GUILD_ID ||
    process.env.DISCORD_GUILD_ID ||
    ""
  );
}

/** https://discord.com/channels/{guild_id}/{channel_id} */
export function discordChannelUrl(channelId: string): string {
  const guildId = discordGuildId();
  return `https://discord.com/channels/${guildId}/${channelId}`;
}
