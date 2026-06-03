"use client";

import type { GuildRoleLite } from "@/lib/discord/guild-roles";
import { topRoleForMember } from "@/lib/discord/guild-roles";
import { fetchGuildInfoPayload } from "@/lib/api/guild-info-fetch";
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

function normalizeRoles(roles: GuildRoleLite[]): GuildRoleLite[] {
  return roles.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    color: Number(r.color ?? 0),
    position: Number(r.position ?? 0),
    icon: r.icon ?? null,
    unicode_emoji: r.unicode_emoji ?? null,
  }));
}

export function GuildRolesProvider({
  children,
  initialRoles,
}: {
  children: React.ReactNode;
  initialRoles?: GuildRoleLite[];
}) {
  const [roles, setRoles] = useState<GuildRoleLite[]>(
    initialRoles?.length ? normalizeRoles(initialRoles) : []
  );
  const [loading, setLoading] = useState(!initialRoles?.length);

  useEffect(() => {
    if (initialRoles?.length) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchGuildInfoPayload("roles=all")
      .then((data) => {
        if (cancelled || !data.roles.length) return;
        setRoles(normalizeRoles(data.roles));
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
  }, [initialRoles?.length]);

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
