"use client";

import { fetchDedup } from "@/lib/api/fetch-dedup";
import { useCallback, useEffect, useRef, useState } from "react";

type CacheEntry<T> = { expires: number; data: T };

const memory = new Map<string, CacheEntry<unknown>>();

function readMemory<T>(key: string): T | undefined {
  const hit = memory.get(key);
  if (!hit || hit.expires <= Date.now()) {
    if (hit) memory.delete(key);
    return undefined;
  }
  return hit.data as T;
}

function writeMemory<T>(key: string, data: T, ttlMs: number) {
  memory.set(key, { expires: Date.now() + ttlMs, data });
}

export function useClientQuery<T>(opts: {
  key: string;
  url: string;
  initialData?: T;
  ttlMs?: number;
  enabled?: boolean;
}) {
  const { key, url, initialData, ttlMs = 0, enabled = true } = opts;
  const [data, setData] = useState<T | undefined>(initialData ?? readMemory<T>(key));
  const [loading, setLoading] = useState(!data && enabled);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(
    async (opts?: { background?: boolean }) => {
      if (!enabled) return;
      const cached = readMemory<T>(key);
      if (cached && !opts?.background) {
        setData(cached);
        setLoading(false);
        return cached;
      }
      if (!opts?.background && !data) setLoading(true);
      try {
        const json = await fetchDedup<T>(url);
        if (!mounted.current) return json;
        setData(json);
        setError(null);
        if (ttlMs > 0) writeMemory(key, json, ttlMs);
        return json;
      } catch (e) {
        if (mounted.current) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
        return undefined;
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [key, url, enabled, ttlMs, data]
  );

  useEffect(() => {
    mounted.current = true;
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (data && ttlMs > 0) return;
    void refresh({ background: !!data });
    return () => {
      mounted.current = false;
    };
  }, [key, url, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refresh, setData };
}
