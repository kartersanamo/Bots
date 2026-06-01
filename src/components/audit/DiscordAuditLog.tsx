"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  auditActionLabel,
  formatAuditChanges,
  formatAuditTarget,
  snowflakeToDate,
  type DiscordAuditEntry,
  type DiscordAuditUser,
} from "@/lib/discord/audit";
import { discordGuildUrl } from "@/lib/discord/guild";
import { cn } from "@/lib/utils";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function DiscordAuditLog() {
  const [entries, setEntries] = useState<DiscordAuditEntry[]>([]);
  const [users, setUsers] = useState<DiscordAuditUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);

  const userMap = Object.fromEntries(
    users.map((u) => [
      u.id,
      u.global_name || u.username,
    ])
  );

  const load = useCallback(async (before?: string, append = false) => {
    if (before) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: "50" });
      if (before) params.set("before", before);

      const res = await fetch(`/api/audit/discord?${params}`);
      const data = await res.json();

      setConfigured(data.configured !== false);
      if (data.error) {
        setError(data.error);
        if (!append) {
          setEntries([]);
          setUsers([]);
        }
        return;
      }

      const nextEntries = (data.entries || []) as DiscordAuditEntry[];
      const nextUsers = (data.users || []) as DiscordAuditUser[];

      setEntries((prev) => (append ? [...prev, ...nextEntries] : nextEntries));
      setUsers((prev) => {
        const byId = new Map(prev.map((u) => [u.id, u]));
        for (const u of nextUsers) byId.set(u.id, u);
        return [...byId.values()];
      });
    } catch {
      setError("Could not load Discord audit log");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const guildUrl = discordGuildUrl();
  const oldestId = entries.length ? entries[entries.length - 1].id : null;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-muted">
          Server audit log from Discord (bans, channel changes, role edits, etc.).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => load()}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          {guildUrl && (
            <a href={guildUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="primary">
                <ExternalLink className="h-4 w-4" />
                Open in Discord
              </Button>
            </a>
          )}
        </div>
      </div>

      {!configured && (
        <p className="text-sm text-amber-400">
          Discord API not configured. Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID.
        </p>
      )}

      {error && (
        <p className="mb-4 text-sm text-red-400">{error}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-2 pr-4">Time</th>
              <th className="pb-2 pr-4">User</th>
              <th className="pb-2 pr-4">Action</th>
              <th className="pb-2 pr-4">Target</th>
              <th className="pb-2 pr-4">Changes</th>
              <th className="pb-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-border/50 align-top">
                <td className="py-2 pr-4 text-xs text-muted whitespace-nowrap">
                  {snowflakeToDate(e.id).toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-white">
                  {e.user_id
                    ? userMap[e.user_id] || e.user_id
                    : "System"}
                </td>
                <td className="py-2 pr-4 text-white">
                  {auditActionLabel(e.action_type)}
                </td>
                <td className="py-2 pr-4 text-muted max-w-[140px] truncate">
                  {formatAuditTarget(e)}
                </td>
                <td className="py-2 pr-4 text-xs text-muted max-w-[240px]">
                  {formatAuditChanges(e.changes) || "—"}
                </td>
                <td className="py-2 text-xs text-muted max-w-[160px] truncate">
                  {e.reason || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <p className="py-8 text-center text-muted">Loading…</p>
        )}
        {!loading && !error && !entries.length && configured && (
          <p className="py-8 text-center text-muted">No entries returned.</p>
        )}
      </div>

      {oldestId && entries.length >= 50 && (
        <div className="mt-4 flex justify-center">
          <Button
            size="sm"
            variant="secondary"
            disabled={loadingMore}
            onClick={() => load(oldestId, true)}
          >
            {loadingMore ? "Loading…" : "Load older"}
          </Button>
        </div>
      )}
    </Card>
  );
}
