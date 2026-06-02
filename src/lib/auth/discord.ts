import { hasDashboardGuildAccess } from "@/lib/auth/dashboard-access";
import { fetchGuildRoles } from "@/lib/discord/api";
import { PERMISSION_ONLY_ROLE_NAME } from "@/lib/discord/guild-roles";
import { env, envRequired } from "@/lib/env";
import type { PermissionTier } from "@/lib/permissions";
import { resolvePermissionTier } from "@/lib/permissions";

const DISCORD_API = "https://discord.com/api/v10";

export function getDiscordAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: envRequired("DISCORD_CLIENT_ID"),
    redirect_uri: envRequired("DISCORD_REDIRECT_URI"),
    response_type: "code",
    scope: "identify guilds guilds.members.read",
    state,
  });
  return `https://discord.com/api/oauth2/authorize?${params}`;
}

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}

export interface GuildMember {
  roles: string[];
  nick: string | null;
}

export async function exchangeCode(code: string): Promise<DiscordTokenResponse> {
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: envRequired("DISCORD_CLIENT_ID"),
      client_secret: envRequired("DISCORD_CLIENT_SECRET"),
      grant_type: "authorization_code",
      code,
      redirect_uri: envRequired("DISCORD_REDIRECT_URI"),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return res.json();
}

export async function fetchDiscordUser(
  accessToken: string
): Promise<DiscordUser> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error("Failed to fetch Discord user");
  return res.json();
}

export async function fetchGuildMember(
  accessToken: string,
  guildId: string
): Promise<GuildMember | null> {
  const res = await fetch(
    `${DISCORD_API}/users/@me/guilds/${guildId}/member`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch guild member");
  return res.json();
}

export async function fetchGuildMemberRoles(
  accessToken: string,
  guildId: string
): Promise<string[]> {
  const member = await fetchGuildMember(accessToken, guildId);
  return member?.roles ?? [];
}

export async function buildSessionFromOAuth(
  accessToken: string,
  user: DiscordUser
): Promise<{
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  tier: PermissionTier;
  roleIds: string[];
  dashboardAccess: boolean;
}> {
  const guildId = envRequired("DISCORD_GUILD_ID");
  const roleIds = await fetchGuildMemberRoles(accessToken, guildId);
  const guildRoles = await fetchGuildRoles().catch(() => []);
  const dashboardAccess = hasDashboardGuildAccess(
    user.id,
    roleIds,
    guildRoles
  );

  let tier = resolvePermissionTier(user.id, roleIds);
  const hasStarRole = guildRoles.some(
    (r) => r.name === PERMISSION_ONLY_ROLE_NAME && roleIds.includes(r.id)
  );
  if (hasStarRole && tier === "none") {
    tier = "owner";
  }

  return {
    id: user.id,
    username: user.username,
    globalName: user.global_name,
    avatar: user.avatar,
    tier,
    roleIds,
    dashboardAccess,
  };
}
