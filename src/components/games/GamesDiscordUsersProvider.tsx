"use client";

import type { ResolvedDiscordUser } from "@/lib/discord/users";
import { snowflakeString } from "@/lib/games/discord-enrich";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type DiscordUserProfile = ResolvedDiscordUser;

type UsersMap = Record<string, DiscordUserProfile>;

const GamesDiscordUsersContext = createContext<{
  users: UsersMap;
  resolve: (ids: string[] | string | number) => void;
  mergeUsers: (batch: Record<string, DiscordUserProfile>) => void;
} | null>(null);

const BATCH_MS = 50;

function normalizeUsersMap(batch: Record<string, DiscordUserProfile>): UsersMap {
  const out: UsersMap = {};
  for (const u of Object.values(batch)) {
    if (!u?.id) continue;
    const id = snowflakeString(u.id);
    out[id] = { ...u, id };
  }
  return out;
}

export function GamesDiscordUsersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [users, setUsers] = useState<UsersMap>({});
  const pending = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef(false);

  const mergeUsers = useCallback((batch: Record<string, DiscordUserProfile>) => {
    const normalized = normalizeUsersMap(batch);
    if (!Object.keys(normalized).length) return;
    setUsers((prev) => ({ ...prev, ...normalized }));
  }, []);

  const flush = useCallback(async () => {
    if (inflight.current || pending.current.size === 0) return;
    const ids = [...pending.current].slice(0, 100);
    ids.forEach((id) => pending.current.delete(id));
    inflight.current = true;
    try {
      const res = await fetch(
        `/api/discord/users?ids=${encodeURIComponent(ids.join(","))}`,
        { credentials: "same-origin" }
      );
      const data = await res.json();
      if (!res.ok) {
        console.warn("[games] discord users lookup failed:", data?.error || res.status);
        return;
      }
      if (data.users && typeof data.users === "object") {
        mergeUsers(data.users as Record<string, DiscordUserProfile>);
      }
    } catch (err) {
      console.warn("[games] discord users lookup error:", err);
    } finally {
      inflight.current = false;
      if (pending.current.size > 0) void flush();
    }
  }, [mergeUsers]);

  const usersRef = useRef(users);
  usersRef.current = users;

  const resolve = useCallback(
    (ids: string[] | string | number) => {
      const list = normalizeUserIds(ids);
      const missing = list.filter(
        (id) => !usersRef.current[id] && !pending.current.has(id)
      );
      if (!missing.length) return;
      missing.forEach((id) => pending.current.add(id));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void flush();
      }, BATCH_MS);
    },
    [flush]
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const value = useMemo(
    () => ({ users, resolve, mergeUsers }),
    [users, resolve, mergeUsers]
  );

  return (
    <GamesDiscordUsersContext.Provider value={value}>
      {children}
    </GamesDiscordUsersContext.Provider>
  );
}

export function useGamesDiscordUsers() {
  const ctx = useContext(GamesDiscordUsersContext);
  if (!ctx) {
    throw new Error(
      "useGamesDiscordUsers must be used within GamesDiscordUsersProvider"
    );
  }
  return ctx;
}

function normalizeUserIds(
  ids: string[] | string | number | null | undefined
): string[] {
  const list = Array.isArray(ids) ? ids : ids != null && ids !== "" ? [ids] : [];
  return list
    .map((id) => snowflakeString(id))
    .filter((id) => /^\d{15,22}$/.test(id));
}

export function useResolveDiscordUsers(
  ids: string[] | string | number | null | undefined
) {
  const { resolve } = useGamesDiscordUsers();
  const key = normalizeUserIds(ids).sort().join(",");
  useEffect(() => {
    if (!key) return;
    resolve(key.split(","));
  }, [key, resolve]);
}

/** Call after a games API returns a pre-resolved `users` map. */
export function useMergeDiscordUsersFromApi(
  users: Record<string, DiscordUserProfile> | undefined
) {
  const { mergeUsers } = useGamesDiscordUsers();
  const key = users ? Object.keys(users).sort().join(",") : "";
  useEffect(() => {
    if (!users || !key) return;
    mergeUsers(users);
  }, [key, users, mergeUsers]);
}
