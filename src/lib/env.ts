/**
 * Read process.env with CRLF/whitespace stripped (.env files edited on Windows).
 */
export function env(key: string): string {
  const raw = process.env[key];
  if (raw == null) return "";
  return raw.replace(/\r/g, "").trim();
}

export function envRequired(key: string): string {
  const value = env(key);
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export function envInt(key: string, fallback: number): number {
  const value = env(key);
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function envBool(key: string): boolean {
  const value = env(key).toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

let productionValidated = false;

/** Fail fast in production when critical secrets are missing or weak. */
export function validateProductionEnv(): void {
  if (productionValidated) return;
  if (process.env.NODE_ENV !== "production") return;
  productionValidated = true;

  const secret = env("SESSION_SECRET");
  if (secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to at least 32 characters in production"
    );
  }
}

validateProductionEnv();
