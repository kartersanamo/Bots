import type { GuildInfoPayload } from "@/lib/guild-info-types";
import type { GuildRoleLite } from "@/lib/discord/guild-roles";

const EMPTY_GUILD_INFO: GuildInfoPayload = {
  configured: false,
  guild: null,
  roles: [],
  channels: [],
};

/** Client fetch for /api/server/info — never throws; returns empty data on 401/403/errors. */
export async function fetchGuildInfoPayload(
  query = "",
  init?: RequestInit
): Promise<GuildInfoPayload> {
  try {
    const q = query.startsWith("?") ? query : query ? `?${query}` : "";
    const res = await fetch(`/api/server/info${q}`, {
      credentials: "same-origin",
      ...init,
    });
    const data = (await res.json().catch(() => ({}))) as Partial<
      GuildInfoPayload
    > & { error?: string };

    if (!Array.isArray(data.roles)) {
      return { ...EMPTY_GUILD_INFO };
    }

    return {
      configured: res.ok && data.configured !== false,
      guild: data.guild ?? null,
      roles: data.roles as GuildRoleLite[],
      channels: Array.isArray(data.channels) ? data.channels : [],
    };
  } catch {
    return { ...EMPTY_GUILD_INFO };
  }
}

export async function fetchGuildRolesClient(): Promise<GuildRoleLite[]> {
  const payload = await fetchGuildInfoPayload("roles=all");
  return payload.roles;
}
