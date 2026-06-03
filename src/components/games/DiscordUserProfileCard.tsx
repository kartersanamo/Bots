"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { DiscordUserProfile } from "@/components/games/GamesDiscordUsersProvider";
import { useGamesPlayerDrawer } from "@/components/games/GamesPlayerDrawerProvider";
import type { TicketRow } from "@/lib/tickets/types";
import { isTicketOpen } from "@/lib/tickets/types";
import { fetchGuildRolesClient } from "@/lib/api/guild-info-fetch";
import { cn, formatNumber, formatUnixTimestamp, isTruthyFlag } from "@/lib/utils";
import { ExternalLink, Ticket, X, Zap } from "lucide-react";
import Link from "next/link";
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

type ProfileTab = "tickets" | "games";

type XpPreviewRow = {
  game_id: number;
  xp: number;
  source: string | null;
  timestamp: string | null;
};

type GamesProfilePreview = {
  leveling: { xp: number; level: number };
  daily: { streak: number; last_claimed: string | null } | null;
  allTimeXp: number;
  achievements: { achievement_id: string }[];
};

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
  const [tab, setTab] = useState<ProfileTab>("tickets");
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [xpRows, setXpRows] = useState<XpPreviewRow[] | null>(null);
  const [xpError, setXpError] = useState<string | null>(null);
  const [xpLoading, setXpLoading] = useState(false);
  const [gamesProfile, setGamesProfile] = useState<GamesProfilePreview | null>(
    null
  );
  const [gamesProfileLoading, setGamesProfileLoading] = useState(false);
  const gamesDrawer = useGamesPlayerDrawer();

  useEffect(() => {
    let cancelled = false;
    fetchGuildRolesClient()
      .then((roles) => {
        if (cancelled || !roles.length) return;
        setRoles(
          roles.map((r: GuildRoleLite) => ({
            id: String(r.id),
            name: String(r.name),
            color: Number(r.color ?? 0),
            position: Number(r.position ?? 0),
          }))
        );
      })
      .catch(() => {});
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

  useEffect(() => {
    if (tab !== "tickets") return;
    let cancelled = false;
    setTicketsLoading(true);
    setTicketsError(null);
    const params = new URLSearchParams({
      ownerId: user.id,
      status: "all",
      sort: "opened_at",
      order: "desc",
      limit: "6",
      page: "1",
    });
    fetch(`/api/tickets?${params}`)
      .then(async (r) => {
        const d = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setTicketsError(d.error || "Could not load tickets");
          setTickets([]);
          return;
        }
        setTickets((d.tickets || []) as TicketRow[]);
      })
      .catch(() => {
        if (!cancelled) {
          setTicketsError("Could not load tickets");
          setTickets([]);
        }
      })
      .finally(() => {
        if (!cancelled) setTicketsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, user.id]);

  useEffect(() => {
    if (tab !== "games") return;
    let cancelled = false;
    setXpLoading(true);
    setXpError(null);
    setGamesProfileLoading(true);
    setGamesProfile(null);

    const xpParams = new URLSearchParams({
      userId: user.id,
      sortBy: "timestamp",
      sortDir: "desc",
      limit: "8",
      page: "1",
    });

    const xpPromise = fetch(`/api/games/xp-logs?${xpParams}`).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not load XP logs");
      return d.rows as XpPreviewRow[];
    });

    const profilePromise = fetch(`/api/games/users/${user.id}`).then(
      async (r) => {
        const d = await r.json();
        if (!r.ok) return null;
        return d.profile as GamesProfilePreview | null;
      }
    );

    Promise.all([xpPromise, profilePromise])
      .then(([rows, profile]) => {
        if (cancelled) return;
        setXpRows(rows);
        setGamesProfile(profile);
      })
      .catch((err) => {
        if (!cancelled) {
          setXpError(
            err instanceof Error ? err.message : "Could not load XP logs"
          );
          setXpRows([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setXpLoading(false);
          setGamesProfileLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tab, user.id]);

  const memberRoles = useMemo(() => {
    if (!user.roles?.length || !roles.length) return [];
    const byId = new Map(roles.map((r) => [r.id, r]));
    return user.roles
      .map((id) => byId.get(id))
      .filter((r): r is GuildRoleLite => Boolean(r))
      .sort((a, b) => b.position - a.position);
  }, [roles, user.roles]);

  const ticketlogsHref = `/dashboard/ticketlogs?ownerId=${encodeURIComponent(user.id)}&sort=closed_at&order=desc`;
  const gamesXpHref = `/dashboard/games?section=xplogs&userId=${encodeURIComponent(user.id)}`;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(90vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-border p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">User profile</h3>
            <button
              type="button"
              className="rounded p-1 text-muted hover:bg-surface-hover hover:text-white"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4 flex items-center gap-4">
            <Avatar userId={user.id} avatarHash={user.avatar} size={56} />
            <div className="min-w-0">
              <p className="truncate text-lg text-white">{user.displayName}</p>
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
              <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto pr-1">
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

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 gap-1 border-b border-border px-5 pt-3">
            <button
              type="button"
              onClick={() => setTab("tickets")}
              className={cn(
                "flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
                tab === "tickets"
                  ? "border border-b-0 border-border bg-background text-white"
                  : "text-muted hover:text-white"
              )}
            >
              <Ticket className="h-3.5 w-3.5" />
              Ticket history
            </button>
            <button
              type="button"
              onClick={() => setTab("games")}
              className={cn(
                "flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
                tab === "games"
                  ? "border border-b-0 border-border bg-background text-white"
                  : "text-muted hover:text-white"
              )}
            >
              <Zap className="h-3.5 w-3.5" />
              Games XP
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 p-5">
            {tab === "tickets" && (
              <div className="space-y-3">
                {ticketsLoading && (
                  <p className="text-sm text-muted">Loading tickets…</p>
                )}
                {ticketsError && (
                  <p className="text-sm text-red-400">{ticketsError}</p>
                )}
                {!ticketsLoading && !ticketsError && tickets?.length === 0 && (
                  <p className="text-sm text-muted">No tickets found for this user.</p>
                )}
                {tickets?.map((t) => {
                  const open = isTicketOpen(t.active);
                  return (
                    <div
                      key={t.channelID}
                      className="rounded-lg border border-border bg-surface/80 p-3 text-sm"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-medium text-white">
                          #{t.number} · {t.type}
                        </span>
                        <Badge variant={open ? "success" : "default"}>
                          {open ? "Open" : "Closed"}
                        </Badge>
                        {isTruthyFlag(t.privated) && (
                          <Badge variant="warning">Private</Badge>
                        )}
                      </div>
                      {t.name && (
                        <p className="truncate text-xs text-white/90">{t.name}</p>
                      )}
                      <p className="mt-1 text-xs text-muted">
                        Opened {formatUnixTimestamp(t.opened_at)}
                        {!open && t.closed_at && (
                          <>
                            {" "}
                            · Closed {formatUnixTimestamp(t.closed_at)}
                          </>
                        )}
                      </p>
                      {t.reason?.trim() && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted">
                          {t.reason}
                        </p>
                      )}
                    </div>
                  );
                })}
                <Link
                  href={ticketlogsHref}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                  onClick={onClose}
                >
                  View all ticket history
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {tab === "games" && (
              <div className="space-y-3">
                {gamesProfileLoading && !gamesProfile && (
                  <p className="text-sm text-muted">Loading games profile…</p>
                )}
                {gamesProfile && (
                  <div className="rounded-lg border border-border bg-surface/80 p-3 text-sm">
                    <p className="text-white">
                      Level {gamesProfile.leveling.level} ·{" "}
                      {formatNumber(gamesProfile.leveling.xp)} monthly XP
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      All-time XP (logs):{" "}
                      {formatNumber(gamesProfile.allTimeXp)}
                    </p>
                    {gamesProfile.daily && (
                      <p className="mt-1 text-xs text-muted">
                        Daily streak {gamesProfile.daily.streak} · last claim{" "}
                        {formatUnixTimestamp(gamesProfile.daily.last_claimed)}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted">
                      Achievements: {gamesProfile.achievements.length}
                    </p>
                  </div>
                )}
                {gamesDrawer && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      gamesDrawer.openGamesUser(user.id);
                      onClose();
                    }}
                  >
                    Open games profile & edits
                  </Button>
                )}
                {xpLoading && (
                  <p className="text-sm text-muted">Loading XP logs…</p>
                )}
                {xpError && (
                  <p className="text-sm text-red-400">{xpError}</p>
                )}
                {!xpLoading && !xpError && xpRows?.length === 0 && (
                  <p className="text-sm text-muted">No XP logs for this user.</p>
                )}
                {xpRows && xpRows.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-left text-muted">
                          <th className="px-2 py-1.5">Time</th>
                          <th className="px-2 py-1.5">XP</th>
                          <th className="px-2 py-1.5">Source</th>
                          <th className="px-2 py-1.5">Session</th>
                        </tr>
                      </thead>
                      <tbody>
                        {xpRows.map((r, i) => (
                          <tr
                            key={`${r.game_id}-${r.timestamp}-${i}`}
                            className="border-b border-border/50 last:border-0"
                          >
                            <td className="whitespace-nowrap px-2 py-1.5 text-muted">
                              {formatUnixTimestamp(r.timestamp)}
                            </td>
                            <td
                              className={cn(
                                "px-2 py-1.5 font-mono tabular-nums",
                                r.xp >= 0 ? "text-emerald-400" : "text-red-400"
                              )}
                            >
                              {r.xp >= 0 ? "+" : ""}
                              {formatNumber(r.xp)}
                            </td>
                            <td className="max-w-[140px] truncate px-2 py-1.5">
                              {r.source || "—"}
                            </td>
                            <td className="px-2 py-1.5 font-mono text-muted">
                              #{r.game_id}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Link
                  href={gamesXpHref}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                  onClick={onClose}
                >
                  View all game XP logs
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
