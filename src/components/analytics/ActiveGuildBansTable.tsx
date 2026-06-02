"use client";

import {
  AnalyticsDataTable,
  AnalyticsTable,
} from "@/components/analytics/AnalyticsDataTable";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { useResolveDiscordUsers } from "@/components/games/GamesDiscordUsersProvider";
import { useAnalyticsTableRowLimit } from "@/components/analytics/table-row-limit";
import { Button } from "@/components/ui/Button";
import type { GuildBanRow } from "@/lib/discord/guild-bans";
import { useCallback, useEffect, useState } from "react";

interface BansApiResponse {
  configured: boolean;
  canRevoke: boolean;
  viewer: {
    id: string;
    username: string;
    globalName: string | null;
  };
  bans: GuildBanRow[];
  fetchedAt?: number;
  error?: string;
}

export function ActiveGuildBansTable() {
  const [data, setData] = useState<BansApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<GuildBanRow | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [confirmAuth, setConfirmAuth] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const { slice, tableRowLimit } = useAnalyticsTableRowLimit(25);
  useResolveDiscordUsers(data?.bans?.map((b) => b.userId) ?? []);

  const loadBans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/discord/bans");
      const json = (await res.json()) as BansApiResponse;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBans();
  }, [loadBans]);

  async function submitRevoke() {
    if (!revokeTarget || !data?.canRevoke) return;
    if (!confirmAuth || revokeReason.trim().length < 3) {
      setRevokeError("Enter a reason (3+ characters) and confirm authorization.");
      return;
    }

    setRevoking(true);
    setRevokeError(null);
    try {
      const res = await fetch("/api/discord/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unban",
          userId: revokeTarget.userId,
          reason: revokeReason.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (body as { error?: string }).error ?? `Unban failed (${res.status})`
        );
      }
      setRevokeTarget(null);
      setRevokeReason("");
      setConfirmAuth(false);
      await loadBans();
    } catch (e) {
      setRevokeError(e instanceof Error ? e.message : "Unban failed");
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
        Loading active bans from Discord…
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

  const bans = data.bans ?? [];
  const visible = slice(bans);

  return (
    <>
      <AnalyticsDataTable
        title="Active guild bans"
        dataHint="moderation.table.bans"
        headers={[
          "userId",
          "username",
          "displayName",
          "reason",
        ]}
        exportFilename="active-guild-bans.csv"
        exportRows={bans.map((b) => ({
          userId: b.userId,
          username: b.username,
          displayName: b.displayName,
          reason: b.reason ?? "",
        }))}
        tableRowLimit={tableRowLimit}
      >
        <p className="px-4 pt-3 text-xs text-muted">
          Live list from Discord (guild ban list).{" "}
          {data.canRevoke
            ? "Revoke uses the dashboard bot on your behalf; your account is recorded in the audit log."
            : "You can view bans; revoking requires Admin or higher."}
          {data.error ? (
            <span className="mt-1 block text-amber-300">{data.error}</span>
          ) : null}
        </p>
        {bans.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">No active bans.</p>
        ) : (
          <div className="overflow-x-auto">
            <AnalyticsTable>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-2">Member</th>
                  <th className="px-4 py-2">User ID</th>
                  <th className="px-4 py-2">Ban reason</th>
                  {data.canRevoke && (
                    <th className="px-4 py-2 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((ban) => (
                  <tr
                    key={ban.userId}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-4 py-2 whitespace-nowrap">
                      <DiscordUserChip userId={ban.userId} />
                      <p className="mt-0.5 text-xs text-muted">@{ban.username}</p>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-muted whitespace-nowrap">
                      {ban.userId}
                    </td>
                    <td className="max-w-md px-4 py-2 text-sm text-slate-300">
                      {ban.reason ?? (
                        <span className="text-muted italic">No reason set</span>
                      )}
                    </td>
                    {data.canRevoke && (
                      <td className="px-4 py-2 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setRevokeTarget(ban);
                            setRevokeReason("");
                            setConfirmAuth(false);
                            setRevokeError(null);
                          }}
                        >
                          Revoke ban
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-ban-title"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-xl">
            <h3
              id="revoke-ban-title"
              className="text-lg font-semibold text-white"
            >
              Revoke ban
            </h3>
            <p className="mt-1 text-sm text-muted">
              {revokeTarget.displayName}{" "}
              <span className="font-mono text-xs">({revokeTarget.userId})</span>
            </p>
            {revokeTarget.reason && (
              <p className="mt-2 rounded-md bg-black/20 px-3 py-2 text-sm text-slate-300">
                Current reason: {revokeTarget.reason}
              </p>
            )}

            <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
              Discord does not allow user accounts to remove guild bans directly.
              The bot will unban this member and attach your dashboard identity to
              the Discord audit reason and dashboard audit log.
            </div>

            <label className="mt-4 block text-xs font-medium text-muted">
              Revoke reason (required)
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
                placeholder="Why is this ban being removed?"
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
                the dashboard bot to revoke this ban on my behalf.
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
                variant="danger"
                size="sm"
                disabled={revoking}
                onClick={() => void submitRevoke()}
              >
                {revoking ? "Revoking…" : "Revoke ban"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
