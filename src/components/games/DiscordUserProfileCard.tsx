"use client";

import { Avatar } from "@/components/ui/Avatar";
import type { DiscordUserProfile } from "@/components/games/GamesDiscordUsersProvider";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface GuildRoleLite {
  id: string;
  name: string;
  color: number;
  position: number;
}

interface DiscordUserProfileCardProps {
  user: DiscordUserProfile;
  onClose: () => void;
}

function formatDiscordTimestamp(iso: string | null): string {
  if (!iso) return "Unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString();
}

function discordAccountCreatedAt(userId: string): string {
  try {
    const snowflake = BigInt(userId);
    const discordEpoch = BigInt("1420070400000");
    const ms = Number((snowflake >> BigInt(22)) + discordEpoch);
    return new Date(ms).toLocaleString();
  } catch {
    return "Unknown";
  }
}

function roleColorHex(color: number): string {
  return color > 0 ? `#${color.toString(16).padStart(6, "0")}` : "#9ca3af";
}

export function DiscordUserProfileCard({
  user,
  onClose,
}: DiscordUserProfileCardProps) {
  const [roles, setRoles] = useState<GuildRoleLite[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/server/info")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data?.roles)) return;
        setRoles(
          data.roles.map((r: GuildRoleLite) => ({
            id: String(r.id),
            name: String(r.name),
            color: Number(r.color ?? 0),
            position: Number(r.position ?? 0),
          }))
        );
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const memberRoles = useMemo(() => {
    if (!user.roles?.length || !roles.length) return [];
    const byId = new Map(roles.map((r) => [r.id, r]));
    return user.roles
      .map((id) => byId.get(id))
      .filter((r): r is GuildRoleLite => Boolean(r))
      .sort((a, b) => b.position - a.position);
  }, [roles, user.roles]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">User profile</h3>
          <button
            type="button"
            className="rounded p-1 text-muted hover:bg-surface-hover hover:text-white"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <Avatar userId={user.id} avatarHash={user.avatar} size={48} />
          <div className="min-w-0">
            <p className="truncate text-white">{user.displayName}</p>
            <p className="truncate text-sm text-muted">@{user.username}</p>
            {user.nick && user.nick !== user.displayName && (
              <p className="truncate text-xs text-muted">Nick: {user.nick}</p>
            )}
          </div>
        </div>

        <div className="space-y-1 text-xs">
          <p className="text-muted">
            User ID: <span className="font-mono text-white">{user.id}</span>
          </p>
          <p className="text-muted">
            Account created:{" "}
            <span className="text-white">{discordAccountCreatedAt(user.id)}</span>
          </p>
          <p className="text-muted">
            Joined server:{" "}
            <span className="text-white">{formatDiscordTimestamp(user.joinedAt)}</span>
          </p>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Roles ({memberRoles.length})
          </p>
          {memberRoles.length === 0 ? (
            <p className="text-xs text-muted">No role data available.</p>
          ) : (
            <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto pr-1">
              {memberRoles.map((role) => (
                <span
                  key={role.id}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-white"
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: roleColorHex(role.color) }}
                  />
                  {role.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
