import "server-only";

import {
  SESSION_COOKIE,
  getSessionMaxAge,
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/auth/session-cookie";
import {
  resolveSessionAuthorization,
} from "@/lib/auth/session-authorization";
import {
  decodeSignedSession,
  encodeSignedSession,
  sessionVersion,
  type SessionCookiePayload,
} from "@/lib/auth/session-signing";
import { cookies } from "next/headers";
import type { PermissionTier } from "@/lib/permissions";

export {
  getSessionCookieName,
  getSessionMaxAge,
  getSessionCookieOptions,
} from "@/lib/auth/session-cookie";

export interface SessionUser {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  tier: PermissionTier;
  roleIds: string[];
  dashboardAccess: boolean;
}

export interface SessionIdentity {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
}

export function encodeSession(identity: SessionIdentity): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionCookiePayload = {
    id: identity.id,
    username: identity.username,
    globalName: identity.globalName,
    avatar: identity.avatar,
    iat: now,
    exp: now + getSessionMaxAge(),
    sv: sessionVersion(),
  };
  return encodeSignedSession(payload);
}

export function decodeSession(raw: string): SessionCookiePayload | null {
  return decodeSignedSession(raw);
}

async function hydrateSession(
  payload: SessionCookiePayload
): Promise<SessionUser | null> {
  const auth = await resolveSessionAuthorization(payload.id);
  if (!auth) return null;

  return {
    id: payload.id,
    username: payload.username,
    globalName: payload.globalName,
    avatar: payload.avatar,
    tier: auth.tier,
    roleIds: auth.roleIds,
    dashboardAccess: auth.dashboardAccess,
  };
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const payload = decodeSignedSession(raw);
  if (!payload) return null;

  return hydrateSession(payload);
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const { hasDashboardAccess } = await import("@/lib/auth/dashboard-access");
  if (!hasDashboardAccess(session)) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function requireTier(
  minimum: PermissionTier
): Promise<SessionUser> {
  const session = await requireSession();
  const { hasMinimumTier } = await import("@/lib/permissions");
  if (!hasMinimumTier(session.tier, minimum)) {
    throw new Error("Forbidden");
  }
  return session;
}
