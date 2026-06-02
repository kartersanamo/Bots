import {
  buildSessionFromOAuth,
  exchangeCode,
  fetchDiscordUser,
  getDiscordAuthUrl,
} from "@/lib/auth/discord";
import { publishAuthRejectedEvent } from "@/lib/auth/live-events";
import { getClientIp, logAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import {
  encodeSession,
  getSessionCookieName,
  getSessionMaxAge,
} from "@/lib/auth/session";
import { NextRequest, NextResponse } from "next/server";

function getRedirectBaseUrl(request: NextRequest): string {
  return env("NEXT_PUBLIC_APP_URL") || request.url;
}

async function logOAuthAudit(
  request: NextRequest,
  params: {
    actorId: string;
    actorUsername: string;
    action: string;
    success: boolean;
    error?: string;
  }
) {
  await logAudit({
    actorId: params.actorId,
    actorUsername: params.actorUsername,
    tier: "none",
    action: params.action,
    target: params.actorId,
    ip: getClientIp(request),
    success: params.success,
    error: params.error,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> }
) {
  const { route } = await params;
  const action = route[0];

  if (action === "login") {
    const url = getDiscordAuthUrl();
    return NextResponse.redirect(url);
  }

  if (action === "callback") {
    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(
        new URL("/login?error=auth_failed", getRedirectBaseUrl(request))
      );
    }

    try {
      const tokens = await exchangeCode(code);
      const discordUser = await fetchDiscordUser(tokens.access_token);
      const sessionUser = await buildSessionFromOAuth(
        tokens.access_token,
        discordUser
      );

      await logOAuthAudit(request, {
        actorId: sessionUser.id,
        actorUsername: sessionUser.username,
        action: "auth.login_attempt",
        success: true,
      });

      if (!sessionUser.dashboardAccess) {
        await logOAuthAudit(request, {
          actorId: sessionUser.id,
          actorUsername: sessionUser.username,
          action: "auth.login_denied",
          success: false,
          error: "Missing Staff Team or * role",
        });
        publishAuthRejectedEvent({
          userId: sessionUser.id,
          username: sessionUser.username,
          globalName: sessionUser.globalName,
        });

        return NextResponse.redirect(
          new URL("/unauthorized", getRedirectBaseUrl(request))
        );
      }

      await logOAuthAudit(request, {
        actorId: sessionUser.id,
        actorUsername: sessionUser.username,
        action: "auth.login_success",
        success: true,
      });

      const response = NextResponse.redirect(
        new URL("/dashboard", getRedirectBaseUrl(request))
      );
      response.cookies.set(getSessionCookieName(), encodeSession(sessionUser), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: getSessionMaxAge(),
        path: "/",
      });
      return response;
    } catch {
      return NextResponse.redirect(
        new URL("/login?error=auth_failed", getRedirectBaseUrl(request))
      );
    }
  }

  if (action === "logout") {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete(getSessionCookieName());
    return response;
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
