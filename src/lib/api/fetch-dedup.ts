const inflight = new Map<string, Promise<unknown>>();

/** Dedupe identical in-flight GET fetches (per tab session). */
export function fetchDedup<T>(url: string, init?: RequestInit): Promise<T> {
  const key = `${init?.method ?? "GET"}:${url}`;
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fetch(url, init)
    .then(async (res) => {
      if (!res.ok) {
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
