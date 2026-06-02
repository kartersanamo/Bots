import {
  DASHBOARD_FETCH_HEADER,
  DASHBOARD_FETCH_VALUE,
} from "@/lib/api/dashboard-fetch";
import { getSessionCookieName } from "@/lib/auth/session-cookie";
import { decodeSignedSession } from "@/lib/auth/session-signing";
import { NextResponse, type NextRequest } from "next/server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/callback",
  "/api/auth/logout",
];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isBotWebhook(pathname: string, method: string): boolean {
  return method === "POST" && pathname === "/api/tickets/live-events";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    if (isPublicApi(pathname) || isBotWebhook(pathname, request.method)) {
      return NextResponse.next();
    }

    if (MUTATING.has(request.method)) {
      const csrf = request.headers.get(DASHBOARD_FETCH_HEADER);
      if (csrf !== DASHBOARD_FETCH_VALUE) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const raw = request.cookies.get(getSessionCookieName())?.value;
    if (!raw || !decodeSignedSession(raw)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard")) {
    const raw = request.cookies.get(getSessionCookieName())?.value;
    if (!raw || !decodeSignedSession(raw)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
