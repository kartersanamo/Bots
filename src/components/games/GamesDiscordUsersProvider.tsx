"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface DiscordUserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  nick: string | null;
}

type UsersMap = Record<string, DiscordUserProfile>;

const GamesDiscordUsersContext = createContext<{
  users: UsersMap;
  resolve: (ids: string[]) => void;
} | null>(null);

const BATCH_MS = 50;

export function GamesDiscordUsersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [users, setUsers] = useState<UsersMap>({});
  const pending = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef(false);

  const flush = useCallback(async () => {
    if (inflight.current || pending.current.size === 0) return;
    const ids = [...pending.current].slice(0, 100);
    ids.forEach((id) => pending.current.delete(id));
    inflight.current = true;
    try {
      const res = await fetch(
        `/api/discord/users?ids=${encodeURIComponent(ids.join(","))}`
      );
      const data = await res.json();
      const batch = (data.users || {}) as UsersMap;
      if (Object.keys(batch).length) {
        setUsers((prev) => ({ ...prev, ...batch }));
      }
    } finally {
      inflight.current = false;
      if (pending.current.size > 0) void flush();
    }
  }, []);

  const usersRef = useRef(users);
  usersRef.current = users;

  const resolve = useCallback(
    (ids: string[]) => {
      const missing = ids.filter(
        (id) =>
          /^\d+$/.test(id) &&
          !usersRef.current[id] &&
          !pending.current.has(id)
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

  const value = useMemo(() => ({ users, resolve }), [users, resolve]);

  return (
    <GamesDiscordUsersContext.Provider value={value}>
      {children}
    </GamesDiscordUsersContext.Provider>
  );
}

export function useGamesDiscordUsers() {
  const ctx = useContext(GamesDiscordUsersContext);
  if (!ctx) {
    throw new Error("useGamesDiscordUsers must be used within GamesDiscordUsersProvider");
  }
  return ctx;
}

export function useResolveDiscordUsers(ids: string[]) {
  const { resolve } = useGamesDiscordUsers();
  const key = ids.filter((id) => /^\d+$/.test(id)).sort().join(",");
  useEffect(() => {
    if (!key) return;
    resolve(key.split(","));
  }, [key, resolve]);
}
