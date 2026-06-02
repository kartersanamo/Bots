import type { GuildChannel } from "@/lib/discord/api";
import { env } from "@/lib/env";

const VIEW_CHANNEL_BIT = 1n << 10n;

interface Overwrite {
  id: string;
  type: number | string;
  allow: string;
  deny: string;
}

function isRoleOverwrite(type: number | string): boolean {
  return type === 0 || type === "0" || type === "role";
}

function isMemberOverwrite(type: number | string): boolean {
  return type === 1 || type === "1" || type === "member";
}

function hasBit(value: string, bit: bigint): boolean {
  try {
    return (BigInt(value || "0") & bit) !== 0n;
  } catch {
    return false;
  }
}

function resolveViewDecision(
  overwrites: Overwrite[] | undefined,
  params: { userId: string; roleIds: string[]; guildId: string | null }
): boolean | null {
  if (!overwrites?.length) return null;

  let decision: boolean | null = null;

  const everyone = params.guildId
    ? overwrites.find((o) => isRoleOverwrite(o.type) && o.id === params.guildId)
    : null;
  if (everyone) {
    if (hasBit(everyone.deny, VIEW_CHANNEL_BIT)) decision = false;
    if (hasBit(everyone.allow, VIEW_CHANNEL_BIT)) decision = true;
  }

  const roleOverwrites = overwrites.filter(
    (o) => isRoleOverwrite(o.type) && params.roleIds.includes(o.id)
  );
  if (roleOverwrites.length) {
    const anyRoleDeny = roleOverwrites.some((o) =>
      hasBit(o.deny, VIEW_CHANNEL_BIT)
    );
    const anyRoleAllow = roleOverwrites.some((o) =>
      hasBit(o.allow, VIEW_CHANNEL_BIT)
    );
    if (anyRoleDeny) decision = false;
    if (anyRoleAllow) decision = true;
  }

  const member = overwrites.find(
    (o) => isMemberOverwrite(o.type) && o.id === params.userId
  );
  if (member) {
    if (hasBit(member.deny, VIEW_CHANNEL_BIT)) decision = false;
    if (hasBit(member.allow, VIEW_CHANNEL_BIT)) decision = true;
  }

  return decision;
}

function canViewChannelByOverwrites(
  channel: GuildChannel | undefined,
  params: { userId: string; roleIds: string[]; guildId: string | null }
): boolean {
  if (!channel) return true;
  const channelDecision = resolveViewDecision(channel.permissionOverwrites, params);
  if (channelDecision != null) return channelDecision;
  return true;
}

export function filterVisibleTicketChannelIds(
  channels: GuildChannel[],
  ticketChannelIds: string[],
  params: { userId: string; roleIds: string[] }
): Set<string> {
  const byId = new Map(channels.map((c) => [c.id, c]));
  const guildId = env("DISCORD_GUILD_ID") || env("NEXT_PUBLIC_DISCORD_GUILD_ID");
  const member = { ...params, guildId };
  const out = new Set<string>();

  for (const channelId of ticketChannelIds) {
    const channel = byId.get(channelId);
    if (!channel) {
      out.add(channelId);
      continue;
    }

    const category = channel.parentId ? byId.get(channel.parentId) : undefined;
    const categoryVisible = canViewChannelByOverwrites(category, member);
    const channelVisible = canViewChannelByOverwrites(channel, member);
    if (categoryVisible && channelVisible) {
      out.add(channelId);
    }
  }

  return out;
}
