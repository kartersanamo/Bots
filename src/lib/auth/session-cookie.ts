/** Cookie name/options only — safe for proxy/edge (no Discord or DB imports). */
import { envInt } from "@/lib/env";

export const SESSION_COOKIE = "bots_session";
const SESSION_MAX_AGE_DEFAULT = 60 * 60 * 24 * 7;

export function getSessionMaxAge(): number {
  return envInt("SESSION_MAX_AGE_SEC", SESSION_MAX_AGE_DEFAULT);
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
