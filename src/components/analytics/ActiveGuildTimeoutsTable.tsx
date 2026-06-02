"use client";

import { dashboardFetch } from "@/lib/api/dashboard-fetch";

import {
  AnalyticsDataTable,
  AnalyticsTable,
} from "@/components/analytics/AnalyticsDataTable";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { useResolveDiscordUsers } from "@/components/games/GamesDiscordUsersProvider";
import { useAnalyticsTableRowLimit } from "@/components/analytics/table-row-limit";
import { Button } from "@/components/ui/Button";
import type { GuildTimeoutRow } from "@/lib/discord/guild-timeouts";
import { useCallback, useEffect, useState } from "react";

interface TimeoutsApiResponse {
  configured: boolean;
  canRevoke: boolean;
  viewer: {
    id: string;
    username: string;
    globalName: string | null;
  };
  timeouts: GuildTimeoutRow[];
  fetchedAt?: number;
  error?: string;
}

function formatTimeoutEnd(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatTimeRemaining(untilMs: number): string {
  const seconds = Math.max(0, Math.floor((untilMs - Date.now()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function ActiveGuildTimeoutsTable() {
  const [data, setData] = useState<TimeoutsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<GuildTimeoutRow | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [confirmAuth, setConfirmAuth] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const { slice, tableRowLimit } = useAnalyticsTableRowLimit(25);
  const userIds = [
    ...(data?.timeouts?.map((t) => t.userId) ?? []),
    ...(data?.timeouts
      ?.map((t) => t.moderatedBy)
      .filter((id): id is string => !!id) ?? []),
  ];
  useResolveDiscordUsers(userIds);

  const loadTimeouts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardFetch("/api/discord/timeouts");
      const json = (await res.json()) as TimeoutsApiResponse;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTimeouts();
  }, [loadTimeouts]);

  async function submitRevoke() {
    if (!revokeTarget || !data?.canRevoke) return;
    if (!confirmAuth || revokeReason.trim().length < 3) {
      setRevokeError("Enter a reason (3+ characters) and confirm authorization.");
      return;
    }

    setRevoking(true);
    setRevokeError(null);
    try {
      const res = await dashboardFetch("/api/discord/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "untimeout",
          userId: revokeTarget.userId,
          reason: revokeReason.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (body as { error?: string }).error ??
            `Remove timeout failed (${res.status})`
        );
      }
      setRevokeTarget(null);
      setRevokeReason("");
      setConfirmAuth(false);
      await loadTimeouts();
    } catch (e) {
      setRevokeError(
        e instanceof Error ? e.message : "Remove timeout failed"
      );
    } finally {
      setRevoking(false);
    }
  }

  const viewerName = data?.viewer
    ? data.viewer.globalName?.trim() || data.viewer.username
    : "you";

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
        Loading active timeouts from Discord…
      </div>
    );
  }

  if (!data?.configured) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        {data?.error ?? "Discord bot is not configured."}
      </div>
    );
  }

  const timeouts = data.timeouts ?? [];
  const visible = slice(timeouts);

  return (
    <>
      <AnalyticsDataTable
        title="Active timeouts"
        dataHint="moderation.table.timeouts"
        headers={[
          "userId",
          "username",
          "displayName",
          "timeoutUntil",
          "timeRemaining",
          "reason",
          "moderatedBy",
        ]}
        exportFilename="active-guild-timeouts.csv"
        exportRows={timeouts.map((t) => ({
          userId: t.userId,
          username: t.username,
          displayName: t.displayName,
          timeoutUntil: t.timeoutUntil,
          timeRemaining: formatTimeRemaining(t.timeoutUntilMs),
          reason: t.reason ?? "",
          moderatedBy: t.moderatedBy ?? "",
        }))}
        tableRowLimit={tableRowLimit}
      >
        <p className="px-4 pt-3 text-xs text-muted">
          Members currently timed out in the guild (from member list + audit log
          reasons).{" "}
          {data.canRevoke
            ? "Remove timeout uses the dashboard bot on your behalf; your account is recorded in the audit log."
            : "You can view timeouts; removing them requires Admin or higher."}
          {data.error ? (
            <span className="mt-1 block text-amber-300">{data.error}</span>
          ) : null}
        </p>
        {timeouts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">No active timeouts.</p>
        ) : (
          <div className="overflow-x-auto">
            <AnalyticsTable>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-2">Member</th>
                  <th className="px-4 py-2">User ID</th>
                  <th className="px-4 py-2">Ends</th>
                  <th className="px-4 py-2">Remaining</th>
                  <th className="px-4 py-2">Reason</th>
                  <th className="px-4 py-2">Moderator</th>
                  {data.canRevoke && (
                    <th className="px-4 py-2 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr
                    key={row.userId}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-4 py-2 whitespace-nowrap">
                      <DiscordUserChip userId={row.userId} />
                      <p className="mt-0.5 text-xs text-muted">@{row.username}</p>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-muted whitespace-nowrap">
                      {row.userId}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-300 whitespace-nowrap">
                      {formatTimeoutEnd(row.timeoutUntil)}
                    </td>
                    <td className="px-4 py-2 text-sm text-amber-200/90 whitespace-nowrap">
                      {formatTimeRemaining(row.timeoutUntilMs)}
                    </td>
                    <td className="max-w-xs px-4 py-2 text-sm text-slate-300">
                      {row.reason ?? (
                        <span className="text-muted italic">No reason in audit log</span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {row.moderatedBy ? (
                        <DiscordUserChip userId={row.moderatedBy} compact />
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    {data.canRevoke && (
                      <td className="px-4 py-2 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setRevokeTarget(row);
                            setRevokeReason("");
                            setConfirmAuth(false);
                            setRevokeError(null);
                          }}
                        >
                          Remove timeout
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </AnalyticsTable>
          </div>
        )}
      </AnalyticsDataTable>

      {revokeTarget && data.canRevoke && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-timeout-title"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-xl">
            <h3
              id="remove-timeout-title"
              className="text-lg font-semibold text-white"
            >
              Remove timeout
            </h3>
            <p className="mt-1 text-sm text-muted">
              {revokeTarget.displayName}{" "}
              <span className="font-mono text-xs">({revokeTarget.userId})</span>
            </p>
            <p className="mt-2 text-xs text-muted">
              Ends {formatTimeoutEnd(revokeTarget.timeoutUntil)} (
              {formatTimeRemaining(revokeTarget.timeoutUntilMs)} left)
            </p>
            {revokeTarget.reason && (
              <p className="mt-2 rounded-md bg-black/20 px-3 py-2 text-sm text-slate-300">
                Timeout reason: {revokeTarget.reason}
              </p>
            )}

            <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
              Discord requires the bot to clear timeouts. Your dashboard account
              is recorded when you authorize this action.
            </div>

            <label className="mt-4 block text-xs font-medium text-muted">
              Note (required)
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
                placeholder="Why is this timeout being removed early?"
              />
            </label>

            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={confirmAuth}
                onChange={(e) => setConfirmAuth(e.target.checked)}
                className="mt-1"
              />
              <span>
                I, <strong className="text-white">{viewerName}</strong>, authorize
                the dashboard bot to remove this timeout on my behalf.
              </span>
            </label>

            {revokeError && (
              <p className="mt-3 text-sm text-red-400">{revokeError}</p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={revoking}
                onClick={() => setRevokeTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={revoking}
                onClick={() => void submitRevoke()}
              >
                {revoking ? "Removing…" : "Remove timeout"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
