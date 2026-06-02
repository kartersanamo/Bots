import { hasDashboardGuildAccess } from "@/lib/auth/dashboard-access";
import { fetchGuildRoles } from "@/lib/discord/api";
import { PERMISSION_ONLY_ROLE_NAME } from "@/lib/discord/guild-roles";
import { fetchMemberRoleIds } from "@/lib/discord/member-roles.server";
import { envInt } from "@/lib/env";
import type { PermissionTier } from "@/lib/permissions";
import { resolvePermissionTier } from "@/lib/permissions";

export interface SessionAuthorization {
  tier: PermissionTier;
  roleIds: string[];
  dashboardAccess: boolean;
  fetchedAt: number;
}

const AUTH_CACHE_TTL_MS = () => envInt("SESSION_AUTH_CACHE_TTL_SEC", 300) * 1000;
const AUTH_MAX_STALE_MS = () => envInt("SESSION_AUTH_MAX_STALE_SEC", 900) * 1000;

const cache = new Map<string, SessionAuthorization>();

export function invalidateSessionAuthCache(userId: string): void {
  cache.delete(userId);
}

export async function resolveSessionAuthorization(
  userId: string,
  opts?: { force?: boolean }
): Promise<SessionAuthorization | null> {
  const now = Date.now();
  const hit = cache.get(userId);
  if (hit && !opts?.force && now - hit.fetchedAt < AUTH_CACHE_TTL_MS()) {
    return hit;
  }

  try {
    const [roleIds, guildRoles] = await Promise.all([
      fetchMemberRoleIds(userId),
      fetchGuildRoles().catch(() => []),
    ]);

    const dashboardAccess = hasDashboardGuildAccess(
      userId,
      roleIds,
      guildRoles
    );

    let tier = resolvePermissionTier(userId, roleIds);
    const hasStarRole = guildRoles.some(
      (r) => r.name === PERMISSION_ONLY_ROLE_NAME && roleIds.includes(r.id)
    );
    if (hasStarRole && tier === "none") {
      tier = "owner";
    }

    const auth: SessionAuthorization = {
      tier,
      roleIds,
      dashboardAccess,
      fetchedAt: now,
    };
    cache.set(userId, auth);
    return auth;
  } catch {
    if (hit && now - hit.fetchedAt < AUTH_MAX_STALE_MS()) {
      return hit;
    }
    return null;
  }
}
