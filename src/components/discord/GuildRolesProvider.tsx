"use client";

import type { GuildRoleLite } from "@/lib/discord/guild-roles";
import { topRoleForMember } from "@/lib/discord/guild-roles";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface GuildRolesContextValue {
  roleById: Map<string, GuildRoleLite>;
  loading: boolean;
  getTopRole: (roleIds: string[] | undefined) => GuildRoleLite | null;
}

const GuildRolesContext = createContext<GuildRolesContextValue | null>(null);

export function GuildRolesProvider({ children }: { children: React.ReactNode }) {
  const [roles, setRoles] = useState<GuildRoleLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/server/info?roles=all")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data?.roles)) return;
        setRoles(
          data.roles.map((r: GuildRoleLite) => ({
            id: String(r.id),
            name: String(r.name),
            color: Number(r.color ?? 0),
            position: Number(r.position ?? 0),
            icon: r.icon ?? null,
            unicode_emoji: r.unicode_emoji ?? null,
          }))
        );
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const roleById = useMemo(
    () => new Map(roles.map((r) => [r.id, r])),
    [roles]
  );

  const getTopRole = useCallback(
    (roleIds: string[] | undefined) => topRoleForMember(roleIds, roleById),
    [roleById]
  );

  const value = useMemo(
    () => ({ roleById, loading, getTopRole }),
    [roleById, loading, getTopRole]
  );

  return (
    <GuildRolesContext.Provider value={value}>{children}</GuildRolesContext.Provider>
  );
}

export function useGuildRoles(): GuildRolesContextValue {
  const ctx = useContext(GuildRolesContext);
  if (!ctx) {
    return {
      roleById: new Map(),
      loading: false,
      getTopRole: () => null,
    };
  }
  return ctx;
}
