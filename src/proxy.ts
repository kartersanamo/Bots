import { hasDashboardAccess } from "@/lib/auth/dashboard-access";
import { decodeSession, getSessionCookieName } from "@/lib/auth/session";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const url = new URL(request.url);
  const { pathname } = url;

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const cookieName = getSessionCookieName();
  const raw = request.cookies.get(cookieName)?.value;
  if (!raw) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = decodeSession(raw);
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (!hasDashboardAccess(session)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
