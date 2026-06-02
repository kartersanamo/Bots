import { timingSafeEqual } from "crypto";

export function timingSafeSecretEqual(
  provided: string | null | undefined,
  expected: string
): boolean {
  if (!provided || !expected) return false;
  try {
    const a = Buffer.from(provided, "utf-8");
    const b = Buffer.from(expected, "utf-8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const SENSITIVE_KEY = /token|secret|password|api[_-]?key/i;

export function redactConfigSecrets<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactConfigSecrets(item)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(key) && typeof val === "string") {
        out[key] = "••••••••";
      } else {
        out[key] = redactConfigSecrets(val);
      }
    }
    return out as T;
  }
  return value;
}
