import {
  buildSessionFromOAuth,
  exchangeCode,
  fetchDiscordUser,
  getDiscordAuthUrl,
} from "@/lib/auth/discord";
import { publishAuthRejectedEvent } from "@/lib/auth/live-events";
import {
  invalidateSessionAuthCache,
  resolveSessionAuthorization,
} from "@/lib/auth/session-authorization";
import { getClientIp, logAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { env } from "@/lib/env";
import {
  encodeSession,
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/auth/session";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const OAUTH_STATE_COOKIE = "oauth_state";
const OAUTH_STATE_MAX_AGE = 600;

function getRedirectBaseUrl(request: NextRequest): string {
  return env("NEXT_PUBLIC_APP_URL") || request.url;
}

function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: OAUTH_STATE_MAX_AGE,
    path: "/",
  };
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
    const state = randomBytes(32).toString("base64url");
    const url = getDiscordAuthUrl(state);
    const response = NextResponse.redirect(url);
    response.cookies.set(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions());
    return response;
  }

  if (action === "callback") {
    const ip = getClientIp(request) ?? "unknown";
    const limited = checkRateLimit(`auth:callback:${ip}`, {
      windowMs: 60_000,
      max: 10,
    });
    if (!limited.ok) {
      return NextResponse.redirect(
        new URL("/login?error=rate_limited", getRedirectBaseUrl(request))
      );
    }

    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");
    const stateParam = request.nextUrl.searchParams.get("state");
    const stateCookie = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

    const clearState = (res: NextResponse) => {
      res.cookies.set(OAUTH_STATE_COOKIE, "", { ...oauthStateCookieOptions(), maxAge: 0 });
      return res;
    };

    if (
      error ||
      !code ||
      !stateParam ||
      !stateCookie ||
      stateParam !== stateCookie
    ) {
      return clearState(
        NextResponse.redirect(
          new URL("/login?error=auth_failed", getRedirectBaseUrl(request))
        )
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

        return clearState(
          NextResponse.redirect(
            new URL("/unauthorized", getRedirectBaseUrl(request))
          )
        );
      }

      await logOAuthAudit(request, {
        actorId: sessionUser.id,
        actorUsername: sessionUser.username,
        action: "auth.login_success",
        success: true,
      });

      invalidateSessionAuthCache(sessionUser.id);
      await resolveSessionAuthorization(sessionUser.id, { force: true });

      const response = clearState(
        NextResponse.redirect(
          new URL("/dashboard", getRedirectBaseUrl(request))
        )
      );
      response.cookies.set(
        getSessionCookieName(),
        encodeSession({
          id: sessionUser.id,
          username: sessionUser.username,
          globalName: sessionUser.globalName,
          avatar: sessionUser.avatar,
        }),
        getSessionCookieOptions()
      );
      return response;
    } catch {
      return clearState(
        NextResponse.redirect(
          new URL("/login?error=auth_failed", getRedirectBaseUrl(request))
        )
      );
    }
  }

  if (action === "logout") {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set(getSessionCookieName(), "", {
      ...getSessionCookieOptions(),
      maxAge: 0,
    });
    return response;
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
