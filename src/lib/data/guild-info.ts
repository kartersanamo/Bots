import "server-only";

import {
  fetchGuildChannels,
  fetchGuildInfo,
  fetchGuildRoles,
  isDiscordConfigured,
} from "@/lib/discord/api";
import type { GuildRoleLite } from "@/lib/discord/guild-roles";
import type { GuildInfoPayload } from "@/lib/guild-info-types";
import { cached } from "@/lib/server-cache";

const SERVER_INFO_CACHE_MS = 120_000;

export type { GuildInfoPayload };

export type GuildInfoOptions = {
  allRoles?: boolean;
  allChannels?: boolean;
};

export async function getGuildInfoPayload(
  opts: GuildInfoOptions = {}
): Promise<GuildInfoPayload> {
  if (!isDiscordConfigured()) {
    return {
      configured: false,
      guild: null,
      roles: [],
      channels: [],
    };
  }

  const [guild, roles, channels] = await cached(
    "discord:server-info",
    SERVER_INFO_CACHE_MS,
    () =>
      Promise.all([
        fetchGuildInfo(),
        fetchGuildRoles(),
        fetchGuildChannels(),
      ])
  );

  return {
    configured: true,
    guild,
    roles: opts.allRoles ? roles : roles.slice(0, 50),
    channels: opts.allChannels ? channels : channels.slice(0, 100),
  };
}

export async function getGuildRolesAll(): Promise<GuildRoleLite[]> {
  const payload = await getGuildInfoPayload({ allRoles: true });
  return payload.roles;
}
