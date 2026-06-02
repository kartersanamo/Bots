"use client";

import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fetchDedup } from "@/lib/api/fetch-dedup";
import { useCallback, useEffect, useState } from "react";
import type { AuditEntry } from "@/lib/audit";

const PAGE_SIZE = 50;

export function DashboardAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (nextLimit: number, append: boolean) => {
    const data = await fetchDedup<{ entries: AuditEntry[] }>(
      `/api/audit?limit=${nextLimit}`
    );
    const list = data.entries || [];
    setEntries(list);
    setHasMore(list.length >= nextLimit);
    if (append) setLimit(nextLimit);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load(PAGE_SIZE, false)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function loadMore() {
    setLoadingMore(true);
    const next = limit + PAGE_SIZE;
    try {
      await load(next, true);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <Card>
      <p className="mb-4 text-sm text-muted">
        Dashboard actions including Discord sign-in attempts, config edits,
        moderation, and bot controls.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-2 pr-4">Time</th>
              <th className="pb-2 pr-4">Actor</th>
              <th className="pb-2 pr-4">Action</th>
              <th className="pb-2 pr-4">Target</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-border/50">
                <td className="py-2 pr-4 text-xs text-muted whitespace-nowrap">
                  {new Date(e.timestamp).toLocaleString()}
                </td>
                <td className="py-2 pr-4">
                  <div className="flex flex-wrap items-center gap-1">
                    <DiscordUserChip userId={e.actorId} compact />
                    <span className="text-xs text-muted">({e.tier})</span>
                  </div>
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-accent-light">
                  {e.action}
                </td>
                <td className="py-2 pr-4 text-muted truncate max-w-[200px]">
                  {e.target}
                </td>
                <td className="py-2">
                  <Badge variant={e.success ? "success" : "danger"}>
                    {e.success ? "ok" : "fail"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <p className="py-8 text-center text-muted">Loading…</p>
        )}
        {!loading && !entries.length && (
          <p className="py-8 text-center text-muted">No audit entries yet.</p>
        )}
        {!loading && hasMore && entries.length > 0 && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="secondary"
              size="sm"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
