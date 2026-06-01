type Entry<T> = { expires: number; value: T };

const store = new Map<string, Entry<unknown>>();

export function getCached<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit || hit.expires <= Date.now()) {
    if (hit) store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number): T {
  store.set(key, { expires: Date.now() + ttlMs, value });
  return value;
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const hit = getCached<T>(key);
  if (hit !== undefined) return hit;
  const value = await fn();
  return setCached(key, value, ttlMs);
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
