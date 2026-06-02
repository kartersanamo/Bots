import { invalidateSessionAuthCache } from "@/lib/auth/session-authorization";
import { getSession, requireSession, type SessionUser } from "@/lib/auth/session";
import { logAudit, getClientIp } from "@/lib/audit";
import {
  can,
  type PermissionAction,
} from "@/lib/permissions";
import { NextResponse } from "next/server";

const SENSITIVE_ACTIONS = new Set<PermissionAction>([
  "fleet.restart",
  "fleet.restart_all",
  "config.edit",
  "games.wipe",
  "discord.moderate",
  "bans.write",
]);

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireAction(
  action: PermissionAction
): Promise<SessionUser> {
  let session = await requireSession();
  if (SENSITIVE_ACTIONS.has(action)) {
    invalidateSessionAuthCache(session.id);
    const fresh = await getSession();
    if (!fresh) throw new Error("Unauthorized");
    session = fresh;
  }
  if (!can(session.tier, action)) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function withAudit<T>(
  request: Request,
  session: SessionUser,
  action: string,
  target: string,
  fn: () => Promise<T>,
  opts?: { before?: unknown; getAfter?: (result: T) => unknown }
): Promise<T> {
  const ip = getClientIp(request);
  try {
    const result = await fn();
    await logAudit({
      actorId: session.id,
      actorUsername: session.username,
      tier: session.tier,
      action,
      target,
      before: opts?.before,
      after: opts?.getAfter ? opts.getAfter(result) : undefined,
      ip,
      success: true,
    });
    return result;
  } catch (err) {
    await logAudit({
      actorId: session.id,
      actorUsername: session.username,
      tier: session.tier,
      action,
      target,
      before: opts?.before,
      ip,
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
    throw err;
  }
}

type RouteContext = { params: Promise<Record<string, string>> };

type RouteHandler = (
  request: Request,
  context: RouteContext
) => Promise<NextResponse | Response>;

export function handleApiRoute(handler: RouteHandler) {
  return async (request: Request, context: RouteContext) => {
    try {
      return await handler(request, context);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      const status =
        message === "Unauthorized"
          ? 401
          : message === "Forbidden"
            ? 403
            : 500;
      return apiError(message, status);
    }
  };
}
