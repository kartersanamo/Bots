import { getCached, setCached } from "@/lib/server-cache";

const inflight = new Map<string, Promise<unknown>>();

/** Dedupe concurrent requests and cache results (analytics TTL is longer). */
export async function cachedAnalytics<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const hit = getCached<T>(key);
  if (hit !== undefined) return hit;

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = fn()
    .then((value) => {
      setCached(key, value, ttlMs);
      inflight.delete(key);
      return value;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}

export const ANALYTICS_CACHE_MS = 5 * 60_000;
