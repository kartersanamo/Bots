import { PERMISSION_ONLY_ROLE_NAME } from "@/lib/discord/guild-roles";
import type { SessionUser } from "@/lib/auth/session";

export const STAFF_TEAM_ROLE_NAME = "Staff Team";

export interface GuildRoleNameLookup {
  id: string;
  name: string;
}

export function hasDashboardGuildAccess(
  userId: string,
  roleIds: string[],
  guildRoles: GuildRoleNameLookup[]
): boolean {
  const raw = process.env.OWNER_DISCORD_ID;
  const ownerId =
    raw != null ? raw.replace(/\r/g, "").trim() : "";
  if (ownerId && userId === ownerId) return true;

  const roleById = new Map(guildRoles.map((r) => [r.id, r.name]));
  const allowed = new Set([STAFF_TEAM_ROLE_NAME, PERMISSION_ONLY_ROLE_NAME]);

  for (const roleId of roleIds) {
    const name = roleById.get(roleId);
    if (name && allowed.has(name)) return true;
  }
  return false;
}

export function hasDashboardAccess(session: SessionUser): boolean {
  return session.dashboardAccess === true;
}
