"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import {
  useMergeDiscordUsersFromApi,
  useResolveDiscordUsers,
} from "@/components/games/GamesDiscordUsersProvider";
import { snowflakeString } from "@/lib/games/snowflake";
import type { ResolvedDiscordUser } from "@/lib/discord/users.types";
import { formatBoolFlag, formatUnixTimestamp } from "@/lib/utils";
import { can, type PermissionTier } from "@/lib/permissions";
import { X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface SessionDetail {
  game: {
    game_id: number;
    game_name: string;
    refreshed_at: string | null;
    dm_game: number | string | null;
  };
  xpLogs: {
    user_id: string;
    xp: number;
    source: string | null;
    timestamp: string | null;
  }[];
  dmEntries: Record<string, string | number | null>[];
  dmMeta: { table: string; statusCol: string; columns: string[] } | null;
  live: {
    active: boolean;
    messageUrl?: string;
    xpMultiplier?: number;
    testMode?: boolean;
    winners?: { user_id: string | null; xp: number }[];
    gameType?: string;
  } | null;
}

export function GamesSessionDrawer({
  gameId,
  onClose,
  onUpdated,
  userTier,
}: {
  gameId: number;
  onClose: () => void;
  onUpdated: () => void;
  userTier: PermissionTier;
}) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [apiUsers, setApiUsers] = useState<Record<string, ResolvedDiscordUser>>({});
  useMergeDiscordUsersFromApi(apiUsers);

  const canControl = can(userTier, "games.control");
  const canWrite = can(userTier, "games.write");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/games/sessions/${gameId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setDetail(d);
        if (d.users) setApiUsers(d.users);
      })
      .catch((e) => setMsg(e.message))
      .finally(() => setLoading(false));
  }, [gameId]);

  useEffect(() => {
    load();
  }, [load]);

  const userIds = [
    ...(detail?.xpLogs.map((l) => snowflakeString(l.user_id)) ?? []),
    ...(detail?.dmEntries.map((e) => snowflakeString(e.user_id)) ?? []),
    ...(detail?.live?.winners
      ?.map((w) => snowflakeString(w.user_id))
      .filter((id) => id.length > 0) ?? []),
  ];
  useResolveDiscordUsers(userIds);

  const isDm =
    detail?.game.dm_game === 1 || detail?.game.dm_game === "1";

  async function chatAction(action: string) {
    setMsg(null);
    const res = await fetch(`/api/games/sessions/${gameId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Action failed");
      return;
    }
    setMsg("Done");
    load();
    onUpdated();
  }

  async function saveEntry(userId: string) {
    const updates: Record<string, string | number | null> = {};
    for (const [k, v] of Object.entries(editFields)) {
      if (v === "") updates[k] = null;
      else if (/^\d+$/.test(v)) updates[k] = Number(v);
      else updates[k] = v;
    }
    const res = await fetch(
      `/api/games/sessions/${gameId}/entries/${userId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      }
    );
    if (!res.ok) {
      const data = await res.json();
      setMsg(data.error || "Save failed");
      return;
    }
    setEditingUser(null);
    setEditFields({});
    load();
    onUpdated();
  }

  async function removeEntry(userId: string) {
    if (!confirm(`Remove ${userId} from this session?`)) return;
    const res = await fetch(
      `/api/games/sessions/${gameId}/entries/${userId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const data = await res.json();
      setMsg(data.error || "Remove failed");
      return;
    }
    load();
    onUpdated();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="flex h-full w-full max-w-lg flex-col border-l border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold text-white">
            Session #{gameId}
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && <p className="text-sm text-muted">Loading…</p>}
          {msg && <p className="text-sm text-accent-light">{msg}</p>}

          {detail && (
            <>
              <Card className="p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white">{detail.game.game_name}</span>
                  <Badge variant={isDm ? "info" : "default"}>
                    {isDm ? "DM" : "Chat"}
                  </Badge>
                  {detail.live?.active && (
                    <Badge variant="success">Live</Badge>
                  )}
                </div>
                <p className="text-sm text-muted">
                  Refreshed: {formatUnixTimestamp(detail.game.refreshed_at)}
                </p>
                {detail.live?.messageUrl && (
                  <Link
                    href={detail.live.messageUrl}
                    target="_blank"
                    className="text-sm text-accent-light hover:underline"
                  >
                    Open game message
                  </Link>
                )}
              </Card>

              {!isDm && detail.live?.active && canControl && (
                <Card className="p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-white">Chat controls</h3>
                  <p className="text-xs text-muted">
                    XP multiplier: {detail.live.xpMultiplier ?? 1}x · Test:{" "}
                    {formatBoolFlag(detail.live.testMode ? 1 : 0)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => chatAction("toggle_2x")}>
                      Toggle 2x XP
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => chatAction("end_game")}>
                      End game
                    </Button>
                  </div>
                  {detail.live.winners && detail.live.winners.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted mb-1">Winners (live)</p>
                      {detail.live.winners.map((w, i) =>
                        w.user_id != null ? (
                          <DiscordUserChip key={i} userId={String(w.user_id)} className="mb-1" />
                        ) : null
                      )}
                    </div>
                  )}
                </Card>
              )}

              {!isDm && !detail.live?.active && canControl && (
                <p className="text-xs text-muted">
                  This chat session is not in the bot&apos;s live registry (ended or bot restarted). End / 2x controls only work on active games.
                </p>
              )}

              {isDm && detail.dmEntries.length > 0 && (
                <Card className="p-4">
                  <h3 className="mb-3 text-sm font-semibold text-white">DM participants</h3>
                  <div className="space-y-3">
                    {detail.dmEntries.map((entry) => {
                      const uid = String(entry.user_id);
                      const isEditing = editingUser === uid;
                      return (
                        <div
                          key={uid}
                          className="rounded-md border border-border/60 p-3 space-y-2"
                        >
                          <DiscordUserChip userId={uid} showId />
                          <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                            {Object.entries(entry).map(([k, v]) =>
                              k === "user_id" ? null : (
                                <div key={k} className="contents">
                                  <dt className="text-muted">{k}</dt>
                                  <dd className="text-white font-mono">
                                    {k.includes("at") || k === "started_at" || k === "ended_at"
                                      ? formatUnixTimestamp(v)
                                      : k === detail.dmMeta?.statusCol
                                        ? String(v)
                                        : String(v ?? "—")}
                                  </dd>
                                </div>
                              )
                            )}
                          </dl>
                          {canWrite && (
                            <div className="flex flex-wrap gap-2">
                              {!isEditing ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                      setEditingUser(uid);
                                      const fields: Record<string, string> = {};
                                      for (const [k, v] of Object.entries(entry)) {
                                        if (k !== "user_id") fields[k] = v == null ? "" : String(v);
                                      }
                                      setEditFields(fields);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => removeEntry(uid)}
                                  >
                                    Remove
                                  </Button>
                                </>
                              ) : (
                                <div className="w-full space-y-2">
                                  {Object.keys(editFields).map((col) => (
                                    <label key={col} className="block text-xs">
                                      <span className="text-muted">{col}</span>
                                      <input
                                        className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1 text-white"
                                        value={editFields[col] ?? ""}
                                        onChange={(e) =>
                                          setEditFields((f) => ({
                                            ...f,
                                            [col]: e.target.value,
                                          }))
                                        }
                                      />
                                    </label>
                                  ))}
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => saveEntry(uid)}>
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => {
                                        setEditingUser(null);
                                        setEditFields({});
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              <Card className="p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">XP awards</h3>
                {!detail.xpLogs.length ? (
                  <p className="text-sm text-muted">No XP logs for this session.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {detail.xpLogs.map((log, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-2 border-b border-border/40 pb-2"
                      >
                        <DiscordUserChip userId={String(log.user_id)} />
                        <span className="shrink-0 text-muted">
                          +{log.xp} {log.source || ""}{" "}
                          <span className="text-xs">
                            {formatUnixTimestamp(log.timestamp)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
