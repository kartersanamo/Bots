const inflight = new Map<string, Promise<unknown>>();

export type FetchDedupOptions = {
  /** When true, failed responses resolve to null instead of rejecting. */
  soft?: boolean;
};

/** Dedupe identical in-flight GET fetches (per tab session). */
export function fetchDedup<T>(
  url: string,
  init?: RequestInit,
  opts?: FetchDedupOptions
): Promise<T> {
  const key = `${init?.method ?? "GET"}:${url}:${opts?.soft ? "soft" : "hard"}`;
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fetch(url, init)
    .then(async (res) => {
      if (!res.ok) {
        if (opts?.soft) return null as T;
        throw new Error(`HTTP ${res.status}`);
      }
      return res.json() as Promise<T>;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
