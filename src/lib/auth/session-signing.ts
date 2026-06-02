import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

export interface SessionCookiePayload {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  iat: number;
  exp: number;
  /** Bumped via SESSION_VERSION to revoke all sessions */
  sv?: number;
}

function sessionSecret(): string {
  const secret = env("SESSION_SECRET");
  if (secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET must be set to at least 32 characters in production"
    );
  }
  return "dev-insecure-session-secret-min-32-chars!!";
}

export function sessionVersion(): number {
  const v = env("SESSION_VERSION");
  if (!v) return 1;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", sessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function encodeSignedSession(payload: SessionCookiePayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = signPayload(encoded);
  return `${encoded}.${sig}`;
}

export function decodeSignedSession(raw: string): SessionCookiePayload | null {
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;

  const encoded = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!encoded || !sig) return null;

  const expected = signPayload(encoded);
  try {
    const a = Buffer.from(sig, "base64url");
    const b = Buffer.from(expected, "base64url");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf-8")
    ) as SessionCookiePayload;
    if (!payload?.id || typeof payload.exp !== "number") return null;
    if (payload.sv !== undefined && payload.sv !== sessionVersion()) return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
