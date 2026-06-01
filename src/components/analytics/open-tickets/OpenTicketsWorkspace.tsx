"use client";

import { OpenTicketCard } from "@/components/analytics/open-tickets/OpenTicketCard";
import { TicketStatsBar } from "@/components/tickets/TicketStatsBar";
import { TicketDetailDrawer } from "@/components/tickets/TicketDetailDrawer";
import { Button } from "@/components/ui/Button";
import { useOpenTicketsQueue } from "@/hooks/useOpenTicketsQueue";
import { useTicketEnrichment } from "@/hooks/useTicketEnrichment";
import type { TicketRow } from "@/lib/tickets/types";
import { can, type PermissionTier } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ticketAgeHours } from "@/lib/tickets/age";
import {
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface OpenTicketsWorkspaceProps {
  userTier: PermissionTier;
}

export function OpenTicketsWorkspace({ userTier }: OpenTicketsWorkspaceProps) {
  const {
    state,
    setParams,
    tickets,
    total,
    stats,
    types,
    loading,
    configured,
    refresh,
    pageCount,
  } = useOpenTicketsQueue();

  const [view, setView] = useState<"grid" | "list">("grid");
  const [groupByType, setGroupByType] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [discordPreviews, setDiscordPreviews] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const enrichEnabled = discordPreviews && tickets.length > 0;
  const { enrichments, loading: enrichLoading, refresh: refreshEnrich } =
    useTicketEnrichment(tickets, enrichEnabled);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => {
      refresh();
      if (discordPreviews) refreshEnrich();
    }, 30_000);
    return () => clearInterval(t);
  }, [autoRefresh, discordPreviews, refresh, refreshEnrich]);

  useEffect(() => {
    if (tickets.length && !selectedId) {
      setSelectedId(tickets[0].channelID);
    }
    if (selectedId && !tickets.find((t) => t.channelID === selectedId)) {
      setSelectedId(tickets[0]?.channelID ?? null);
    }
  }, [tickets, selectedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;
      if (!tickets.length) return;
      const idx = tickets.findIndex((t) => t.channelID === selectedId);
      const next =
        e.key === "ArrowDown"
          ? Math.min(tickets.length - 1, idx + 1)
          : Math.max(0, idx - 1);
      setSelectedId(tickets[next].channelID);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tickets, selectedId]);

  const oldestHours = useMemo(() => {
    if (!tickets.length) return null;
    return Math.max(...tickets.map((t) => ticketAgeHours(t.opened_at)));
  }, [tickets]);

  const grouped = useMemo(() => {
    if (!groupByType) return null;
    const map = new Map<string, TicketRow[]>();
    for (const t of tickets) {
      const list = map.get(t.type) ?? [];
      list.push(t);
      map.set(t.type, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [tickets, groupByType]);

  const selectTicket = (t: TicketRow) => {
    setSelectedId(t.channelID);
    if (window.innerWidth < 1024) setMobileDrawer(true);
  };

  const queue = (
    <div className="space-y-3">
      {loading &&
        [...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-border bg-surface"
          />
        ))}

      {!loading && !tickets.length && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted">No open tickets in queue.</p>
          <Button className="mt-4" variant="secondary" onClick={refresh}>
            Refresh
          </Button>
        </div>
      )}

      {!loading &&
        !groupByType &&
        view === "grid" &&
        tickets.map((t) => (
          <OpenTicketCard
            key={t.channelID}
            ticket={t}
            enrichment={enrichments[t.channelID]}
            selected={selectedId === t.channelID}
            onSelect={() => selectTicket(t)}
          />
        ))}

      {!loading &&
        !groupByType &&
        view === "list" &&
        tickets.map((t) => (
          <button
            key={t.channelID}
            type="button"
            onClick={() => selectTicket(t)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left hover:bg-surface-hover",
              selectedId === t.channelID && "border-accent bg-surface-hover"
            )}
          >
            <span className="font-medium text-white">
              #{t.number} · {t.type}
            </span>
            <span className="text-xs text-muted">{t.ownerID}</span>
          </button>
        ))}

      {!loading &&
        groupByType &&
        grouped?.map(([type, list]) => (
          <details key={type} open className="rounded-lg border border-border">
            <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-white">
              {type} ({list.length})
            </summary>
            <div className="space-y-2 p-2">
              {list.map((t) => (
                <OpenTicketCard
                  key={t.channelID}
                  ticket={t}
                  enrichment={enrichments[t.channelID]}
                  selected={selectedId === t.channelID}
                  onSelect={() => selectTicket(t)}
                />
              ))}
            </div>
          </details>
        ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {!configured && (
        <p className="text-sm text-amber-400">Database not configured.</p>
      )}

      <div className="rounded-xl border border-accent/20 bg-gradient-to-br from-accent/10 to-transparent p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Open ticket queue</h2>
          {oldestHours != null && (
            <span className="text-xs text-muted">
              Oldest in view: {Math.round(oldestHours)}h · {total} total open
            </span>
          )}
        </div>
        <TicketStatsBar stats={stats} loading={loading} />
        {stats?.byType && stats.byType.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.byType.map((row) => (
              <button
                key={row.type}
                type="button"
                onClick={() =>
                  setParams({
                    type: state.type === row.type ? "" : row.type,
                    page: 1,
                  })
                }
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  state.type === row.type
                    ? "border-accent bg-accent/20 text-white"
                    : "border-border text-muted hover:text-white"
                )}
              >
                {row.type} ({row.count})
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            ref={searchRef}
            placeholder="Search queue… (press /)"
            defaultValue={state.q}
            onChange={(e) =>
              setParams({ q: e.target.value, page: 1 })
            }
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm text-white"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={state.type}
            onChange={(e) => setParams({ type: e.target.value, page: 1 })}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-white"
          >
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={`${state.sort}-${state.order}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split("-");
              setParams({ sort, order, page: 1 });
            }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-white"
          >
            <option value="opened_at-asc">Oldest first</option>
            <option value="opened_at-desc">Newest first</option>
            <option value="number-desc">Ticket # ↓</option>
          </select>
          {can(userTier, "tickets.view_private") && (
            <select
              value={state.privated}
              onChange={(e) =>
                setParams({ privated: e.target.value, page: 1 })
              }
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-white"
            >
              <option value="">All visibility</option>
              <option value="public">Public only</option>
              <option value="all">Include private</option>
            </select>
          )}
          <Button
            size="sm"
            variant={autoRefresh ? "primary" : "secondary"}
            onClick={() => setAutoRefresh((v) => !v)}
          >
            Auto 30s
          </Button>
          <Button
            size="sm"
            variant={discordPreviews ? "primary" : "secondary"}
            onClick={() => setDiscordPreviews((v) => !v)}
          >
            {enrichLoading ? "Loading…" : "Discord live"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => refresh()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={view === "grid" ? "primary" : "secondary"}
            onClick={() => setView("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={view === "list" ? "primary" : "secondary"}
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={groupByType ? "primary" : "secondary"}
            onClick={() => setGroupByType((v) => !v)}
          >
            Group by type
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]">
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
          {queue}
          {pageCount > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted">
                Page {state.page} / {pageCount}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={state.page <= 1}
                  onClick={() => setParams({ page: state.page - 1 })}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={state.page >= pageCount}
                  onClick={() => setParams({ page: state.page + 1 })}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:block sticky top-4 max-h-[calc(100vh-200px)]">
          <TicketDetailDrawer
            embedded
            channelId={selectedId}
            onClose={() => setSelectedId(null)}
            userTier={userTier}
            onClosed={() => {
              refresh();
              setSelectedId(null);
            }}
          />
        </div>
      </div>

      {mobileDrawer && selectedId && (
        <TicketDetailDrawer
          channelId={selectedId}
          onClose={() => setMobileDrawer(false)}
          userTier={userTier}
          onClosed={() => {
            refresh();
            setMobileDrawer(false);
            setSelectedId(null);
          }}
        />
      )}
    </div>
  );
}
