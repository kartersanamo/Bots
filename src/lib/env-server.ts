import "server-only";

import { env } from "@/lib/env";

let validated = false;

/** Fail fast on the Node server when critical secrets are missing (not in the browser). */
export function validateProductionEnv(): void {
  if (validated) return;
  if (process.env.NODE_ENV !== "production") return;
  validated = true;

  const secret = env("SESSION_SECRET");
  if (secret.length < 32) {
    console.error(
      "[env] SESSION_SECRET must be set to at least 32 characters in production. " +
        "Check .env on the host and restart the dashboard process."
    );
  }
}

validateProductionEnv();
