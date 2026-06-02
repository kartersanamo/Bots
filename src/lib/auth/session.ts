import { cookies } from "next/headers";
import type { PermissionTier } from "@/lib/permissions";

export interface SessionUser {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  tier: PermissionTier;
  roleIds: string[];
  /** Staff Team, * role, or owner — required for dashboard routes */
  dashboardAccess?: boolean;
}

const SESSION_COOKIE = "bots_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function getSessionMaxAge(): number {
  return SESSION_MAX_AGE;
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const session = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf-8")
    ) as SessionUser;
    return session;
  } catch {
    return null;
  }
}

export function encodeSession(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString("base64url");
}

export function decodeSession(raw: string): SessionUser | null {
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
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
