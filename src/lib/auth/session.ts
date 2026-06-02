import { cookies } from "next/headers";
import {
  resolveSessionAuthorization,
} from "@/lib/auth/session-authorization";
import {
  decodeSignedSession,
  encodeSignedSession,
  sessionVersion,
  type SessionCookiePayload,
} from "@/lib/auth/session-signing";
import { envInt } from "@/lib/env";
import type { PermissionTier } from "@/lib/permissions";

export interface SessionUser {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  tier: PermissionTier;
  roleIds: string[];
  dashboardAccess: boolean;
}

const SESSION_COOKIE = "bots_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function getSessionMaxAge(): number {
  return envInt("SESSION_MAX_AGE_SEC", SESSION_MAX_AGE);
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function getSessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  maxAge: number;
  path: string;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: getSessionMaxAge(),
    path: "/",
  };
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
