"use client";

import { OpenTicketCard } from "@/components/analytics/open-tickets/OpenTicketCard";
import { TicketStatsBar } from "@/components/tickets/TicketStatsBar";
import { TicketDetailDrawer } from "@/components/tickets/TicketDetailDrawer";
import { Button } from "@/components/ui/Button";
import { useOpenTicketsQueue } from "@/hooks/useOpenTicketsQueue";
import { useTicketEnrichment } from "@/hooks/useTicketEnrichment";
import type { TicketEnrichment } from "@/lib/discord/tickets";
import type { TicketRow } from "@/lib/tickets/types";
import { can, type PermissionTier } from "@/lib/permissions";
import { cn, formatRelativeTime } from "@/lib/utils";
import { formatAgeLabel, ticketAgeHours } from "@/lib/tickets/age";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface OpenTicketsWorkspaceProps {
  userTier: PermissionTier;
}

interface GuildChannelLite {
  id: string;
  name: string;
}

type TicketLayout = "cards" | "list" | "detailed";

type TicketViewMode =
  | "all"
  | "newUnder1h"
  | "aging12h"
  | "urgent24h"
  | "stale72h"
  | "awaitingUser"
  | "ownerResponded"
  | "hasOwnerPreview"
  | "missingPreview"
  | "publicOnly"
  | "privateOnly"
  | "appeals"
  | "factions"
  | "storePayments"
  | "applications";

const VIEW_OPTIONS: { value: TicketViewMode; label: string }[] = [
  { value: "all", label: "All open tickets" },
  { value: "newUnder1h", label: "New (< 1 hour)" },
  { value: "aging12h", label: "Aging (12+ hours)" },
  { value: "urgent24h", label: "Urgent (24+ hours)" },
  { value: "stale72h", label: "Stale (72+ hours)" },
  { value: "awaitingUser", label: "Awaiting user reply" },
  { value: "ownerResponded", label: "Owner responded recently" },
  { value: "hasOwnerPreview", label: "Has owner message preview" },
  { value: "missingPreview", label: "Missing live preview/enrichment" },
  { value: "publicOnly", label: "Public only" },
  { value: "privateOnly", label: "Private only" },
  { value: "appeals", label: "Appeals / punishment" },
  { value: "factions", label: "Factions / Kitmap / SMP" },
  { value: "storePayments", label: "Store / payments / purchases" },
  { value: "applications", label: "Applications / reports" },
];

function isPrivateTicket(privated: string): boolean {
  const v = String(privated ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "admin" || v === "management";
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

function matchesView(
  viewMode: TicketViewMode,
  ticket: TicketRow,
  enrichment?: TicketEnrichment
): boolean {
  const hours = ticketAgeHours(ticket.opened_at);
  const lowerType = String(ticket.type ?? "").toLowerCase();
  const isPrivate = isPrivateTicket(ticket.privated);

  switch (viewMode) {
    case "all":
      return true;
    case "newUnder1h":
      return hours < 1;
    case "aging12h":
      return hours >= 12;
    case "urgent24h":
      return hours >= 24;
    case "stale72h":
      return hours >= 72;
    case "awaitingUser":
      return enrichment?.awaitingUser === true;
    case "ownerResponded":
      return enrichment?.awaitingUser === false;
    case "hasOwnerPreview":
      return Boolean(enrichment?.lastOwnerMessage?.content?.trim());
    case "missingPreview":
      return !enrichment || Boolean(enrichment.enrichmentError);
    case "publicOnly":
      return !isPrivate;
    case "privateOnly":
      return isPrivate;
    case "appeals":
      return includesAny(lowerType, [
        "appeal",
        "punish",
        "ban",
        "mute",
        "blacklist",
      ]);
    case "factions":
      return includesAny(lowerType, ["faction", "kitmap", "smp"]);
    case "storePayments":
      return includesAny(lowerType, ["store", "payment", "purchase", "buy", "billing"]);
    case "applications":
      return includesAny(lowerType, ["application", "apply", "report"]);
  }
}

export function OpenTicketsWorkspace({ userTier }: OpenTicketsWorkspaceProps) {
  const searchParams = useSearchParams();
  const openChannelId = searchParams.get("openChannelId") || "";
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

  const [layout, setLayout] = useState<TicketLayout>("cards");
  const [groupByType, setGroupByType] = useState(true);
  const [viewMode, setViewMode] = useState<TicketViewMode>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [discordPreviews, setDiscordPreviews] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTicketView, setShowTicketView] = useState(false);
  const [channelNames, setChannelNames] = useState<Record<string, string>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const autoOpenConsumedRef = useRef(false);

  const enrichEnabled = discordPreviews && tickets.length > 0;
  const { enrichments, loading: enrichLoading, refresh: refreshEnrich } =
    useTicketEnrichment(tickets, enrichEnabled);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/server/info?channels=all")
      .then((r) => r.json())
      .then((payload) => {
        if (cancelled || !Array.isArray(payload?.channels)) return;
        const next = (payload.channels as GuildChannelLite[]).reduce<
          Record<string, string>
        >((acc, c) => {
          const id = String(c.id ?? "");
          const name = String(c.name ?? "").trim();
          if (id && name) acc[id] = name;
          return acc;
        }, {});
        setChannelNames(next);
      })
      .catch(() => {
        /* ignore channel name lookup failures */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => {
      refresh();
      if (discordPreviews) refreshEnrich();
    }, 30_000);
    return () => clearInterval(t);
  }, [autoRefresh, discordPreviews, refresh, refreshEnrich]);

  /** All open tickets from API (search/type filters only — not View preset). */
  const queueTickets = tickets;

  const visibleTickets = useMemo(
    () =>
      tickets.filter((t) => matchesView(viewMode, t, enrichments[t.channelID])),
    [tickets, viewMode, enrichments]
  );

  /** Full queue for list + prev/next while in ticket detail view. */
  const listTickets = showTicketView ? queueTickets : visibleTickets;

  useEffect(() => {
    if (!openChannelId || autoOpenConsumedRef.current) return;
    const exists = queueTickets.find((t) => t.channelID === openChannelId);
    if (!exists) return;
    autoOpenConsumedRef.current = true;
    setSelectedId(openChannelId);
    setShowTicketView(true);
  }, [openChannelId, queueTickets]);

  useEffect(() => {
    if (queueTickets.length && !selectedId) {
      setSelectedId(queueTickets[0].channelID);
    }
    if (selectedId && !queueTickets.find((t) => t.channelID === selectedId)) {
      setSelectedId(queueTickets[0]?.channelID ?? null);
    }
    if (!queueTickets.length) {
      setShowTicketView(false);
    }
  }, [queueTickets, selectedId]);

  const selectedIndex = useMemo(
    () => listTickets.findIndex((t) => t.channelID === selectedId),
    [listTickets, selectedId]
  );
  const prevTicket = selectedIndex > 0 ? listTickets[selectedIndex - 1] : null;
  const nextTicket =
    selectedIndex >= 0 && selectedIndex < listTickets.length - 1
      ? listTickets[selectedIndex + 1]
      : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName;
      const isTypingField =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        active?.isContentEditable === true;

      if (e.key === "/" && !isTypingField) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (isTypingField) return;
      if (!showTicketView || !listTickets.length) {
        if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;
        if (!visibleTickets.length) return;
        const idx = visibleTickets.findIndex((t) => t.channelID === selectedId);
        const next =
          e.key === "ArrowDown"
            ? Math.min(visibleTickets.length - 1, idx + 1)
            : Math.max(0, idx - 1);
        setSelectedId(visibleTickets[next].channelID);
        return;
      }
      if (e.key === "ArrowLeft" && prevTicket) {
        e.preventDefault();
        setSelectedId(prevTicket.channelID);
      }
      if (e.key === "ArrowRight" && nextTicket) {
        e.preventDefault();
        setSelectedId(nextTicket.channelID);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showTicketView, listTickets, visibleTickets, selectedId, prevTicket, nextTicket]);

  const oldestHours = useMemo(() => {
    if (!visibleTickets.length) return null;
    return Math.max(...visibleTickets.map((t) => ticketAgeHours(t.opened_at)));
  }, [visibleTickets]);

  const grouped = useMemo(() => {
    if (!groupByType) return null;
    const map = new Map<string, TicketRow[]>();
    for (const t of listTickets) {
      const list = map.get(t.type) ?? [];
      list.push(t);
      map.set(t.type, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [listTickets, groupByType]);

  const selectTicket = (t: TicketRow) => {
    setSelectedId(t.channelID);
    setShowTicketView(true);
  };

  const queueEmptyMessage =
    tickets.length === 0
      ? "No open tickets in queue."
      : showTicketView
        ? "No open tickets match your filters."
        : "No tickets match this View preset.";

  const queue = (
    <div className="space-y-3">
      {loading &&
        [...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-border bg-surface"
          />
        ))}

      {!loading && !listTickets.length && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted">{queueEmptyMessage}</p>
          <Button className="mt-4" variant="secondary" onClick={refresh}>
            Refresh
          </Button>
        </div>
      )}

      {!loading &&
        !groupByType &&
        layout === "cards" &&
        listTickets.map((t) => (
          <OpenTicketCard
            key={t.channelID}
            ticket={t}
            enrichment={enrichments[t.channelID]}
            channelName={channelNames[t.channelID]}
            selected={selectedId === t.channelID}
            onSelect={() => selectTicket(t)}
          />
        ))}

      {!loading &&
        !groupByType &&
        layout === "list" &&
        listTickets.map((t) => (
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
        !groupByType &&
        layout === "detailed" &&
        listTickets.map((t) => {
          const hours = ticketAgeHours(t.opened_at);
          const enrichment = enrichments[t.channelID];
          return (
            <button
              key={t.channelID}
              type="button"
              onClick={() => selectTicket(t)}
              className={cn(
                "w-full rounded-lg border border-border bg-surface p-4 text-left hover:bg-surface-hover",
                selectedId === t.channelID && "border-accent ring-2 ring-accent/30"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-white">#{t.number}</span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-white/90">
                    {t.type}
                  </span>
                  {isPrivateTicket(t.privated) && (
                    <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
                      Private
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted">{formatAgeLabel(hours)}</span>
              </div>
              <div className="mt-2 grid gap-1 text-xs text-muted sm:grid-cols-2">
                <span>Channel: {t.channelID}</span>
                <span>Owner: {t.ownerID}</span>
                <span>Opened: {formatRelativeTime(new Date(Number(t.opened_at) * 1000))}</span>
                <span>{enrichment?.awaitingUser ? "Awaiting user reply" : "User replied"}</span>
              </div>
              {enrichment?.lastOwnerMessage?.content && (
                <p className="mt-2 line-clamp-2 text-sm text-white/85">
                  {enrichment.lastOwnerMessage.content}
                </p>
              )}
            </button>
          );
        })}

      {!loading &&
        groupByType &&
        grouped?.map(([type, list]) => (
          <details key={type} open className="rounded-lg border border-border">
            <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-white">
              {type} ({list.length})
            </summary>
            <div className="space-y-2 p-2">
              {layout === "cards" &&
                list.map((t) => (
                  <OpenTicketCard
                    key={t.channelID}
                    ticket={t}
                    enrichment={enrichments[t.channelID]}
                    channelName={channelNames[t.channelID]}
                    selected={selectedId === t.channelID}
                    onSelect={() => selectTicket(t)}
                  />
                ))}
              {layout === "list" &&
                list.map((t) => (
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
                      {channelNames[t.channelID] || t.channelID} · {t.type}
                    </span>
                    <span className="text-xs text-muted">{t.ownerID}</span>
                  </button>
                ))}
              {layout === "detailed" &&
                list.map((t) => {
                  const hours = ticketAgeHours(t.opened_at);
                  const enrichment = enrichments[t.channelID];
                  return (
                    <button
                      key={t.channelID}
                      type="button"
                      onClick={() => selectTicket(t)}
                      className={cn(
                        "w-full rounded-lg border border-border bg-surface p-4 text-left hover:bg-surface-hover",
                        selectedId === t.channelID && "border-accent ring-2 ring-accent/30"
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold text-white">
                            {channelNames[t.channelID] || t.channelID}
                          </span>
                          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-white/90">
                            {t.type}
                          </span>
                          {isPrivateTicket(t.privated) && (
                            <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
                              Private
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted">{formatAgeLabel(hours)}</span>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs text-muted sm:grid-cols-2">
                        <span>Channel: {t.channelID}</span>
                        <span>Owner: {t.ownerID}</span>
                        <span>Opened: {formatRelativeTime(new Date(Number(t.opened_at) * 1000))}</span>
                        <span>{enrichment?.awaitingUser ? "Awaiting user reply" : "User replied"}</span>
                      </div>
                      {enrichment?.lastOwnerMessage?.content && (
                        <p className="mt-2 line-clamp-2 text-sm text-white/85">
                          {enrichment.lastOwnerMessage.content}
                        </p>
                      )}
                    </button>
                  );
                })}
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
              Oldest in view: {Math.round(oldestHours)}h · {visibleTickets.length} in
              view · {total} total open
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
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as TicketViewMode)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-white"
          >
            {VIEW_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                View: {opt.label}
              </option>
            ))}
          </select>
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
          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value as TicketLayout)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-white"
          >
            <option value="cards">View: Cards</option>
            <option value="list">View: List</option>
            <option value="detailed">View: Detailed</option>
          </select>
          <Button
            size="sm"
            variant={groupByType ? "primary" : "secondary"}
            onClick={() => setGroupByType((v) => !v)}
          >
            Group by type
          </Button>
        </div>
      </div>

      {showTicketView && selectedId && (
        <div className="space-y-3">
          <div className="flex items-stretch gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 self-center px-2"
              disabled={!prevTicket}
              onClick={() => prevTicket && selectTicket(prevTicket)}
              aria-label="Previous ticket"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="min-h-[calc(100vh-250px)] min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs text-muted">
                  Ticket {selectedIndex + 1} of {listTickets.length}
                  {listTickets.length < total && total > listTickets.length
                    ? ` (${total} open total)`
                    : ""}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted"
                  onClick={() => setShowTicketView(false)}
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Close
                </Button>
              </div>
              <TicketDetailDrawer
                embedded
                channelId={selectedId}
                onClose={() => setShowTicketView(false)}
                userTier={userTier}
                onClosed={() => {
                  refresh();
                  setShowTicketView(false);
                  setSelectedId(null);
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 self-center px-2"
              disabled={!nextTicket}
              onClick={() => nextTicket && selectTicket(nextTicket)}
              aria-label="Next ticket"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}

      <div>
        {showTicketView && listTickets.length > 0 && (
          <p className="mb-2 text-sm font-medium text-white">Open tickets</p>
        )}
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
      </div>
    </div>
  );
}
