"use client";

import { Button } from "@/components/ui/Button";
import { dashboardFetch } from "@/lib/api/dashboard-fetch";
import type { MemberMessagesBackfillState } from "@/lib/db/member-messages-backfill";
import { formatNumber } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

export function MemberMessagesBackfillBanner() {
  const [state, setState] = useState<MemberMessagesBackfillState | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await dashboardFetch("/api/analytics/backfill/member-messages");
      const data = await res.json();
      setState(data.state ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (state?.status !== "running") return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [state?.status, load]);

  async function startBackfill() {
    setStarting(true);
    setError(null);
    try {
      const res = await dashboardFetch(
        "/api/analytics/backfill/member-messages",
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start backfill");
        if (data.state) setState(data.state);
        return;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start");
    } finally {
      setStarting(false);
    }
  }

  if (!state) return null;

  const running = state.status === "running";
  const pct =
    state.channelsTotal > 0
      ? Math.round((state.channelsDone / state.channelsTotal) * 100)
      : 0;

  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-white">Member message history backfill</p>
          <p className="mt-1 text-xs text-muted">
            Scans guild channels in ultra-slow mode (nice/ionice, load-aware pauses,
            bots and staff excluded). Expect hours or days; safe to stop with{" "}
            <code className="text-accent-light">pkill -f backfill-member-messages</code>.
          </p>
          {running && (
            <p className="mt-2 text-xs text-accent-light">
              {state.currentChannelName
                ? `Channel: ${state.currentChannelName}`
                : "Starting…"}{" "}
              · {state.channelsDone}/{state.channelsTotal} ({pct}%) ·{" "}
              {formatNumber(state.messagesScanned)} messages scanned
            </p>
          )}
          {state.status === "completed" && (
            <p className="mt-2 text-xs text-emerald-300">
              Completed — {formatNumber(state.messagesScanned)} messages processed.
            </p>
          )}
          {state.status === "error" && state.errorMessage && (
            <p className="mt-2 text-xs text-red-300">{state.errorMessage}</p>
          )}
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={running || starting}
          onClick={() => void startBackfill()}
        >
          {running
            ? "Running…"
            : state.status === "completed"
              ? "Run again"
              : "Start backfill"}
        </Button>
      </div>
    </div>
  );
}
