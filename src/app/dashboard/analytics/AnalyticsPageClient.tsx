"use client";

import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { AnalyticsRangeSelector } from "@/components/analytics/AnalyticsRangeSelector";
import {
  LazyAuditAnalyticsSection,
  LazyEngagementAnalyticsSection,
  LazyGamesAnalyticsSection,
  LazyModerationAnalyticsSection,
  LazyOverviewAnalyticsSection,
  LazyStaffAnalyticsSection,
  LazyTicketsAnalytics,
} from "@/components/analytics/lazy-sections";
import { GamesDiscordUsersProvider } from "@/components/games/GamesDiscordUsersProvider";
import type { AnalyticsBundle } from "@/lib/analytics/bundle";
import type { AnalyticsTab } from "@/lib/analytics/bundle";
import {
  readAnalyticsCache,
  writeAnalyticsCache,
} from "@/lib/analytics/client-cache";
import { parseAnalyticsRange } from "@/lib/analytics/range";
import type { AnalyticsRange, AnalyticsSummary } from "@/lib/analytics/types";
import { can, type PermissionTier } from "@/lib/permissions";
import { cn, formatNumber } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type TabId =
  | "overview"
  | "metrics"
  | "games"
  | "staff"
  | "moderation"
  | "audit"
  | "engagement";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "engagement", label: "Engagement" },
  { id: "metrics", label: "Ticket metrics" },
  { id: "games", label: "Games" },
  { id: "staff", label: "Staff" },
  { id: "moderation", label: "Moderation" },
  { id: "audit", label: "Dashboard audit" },
];

/** API tabs loaded per UI tab (overview uses a small subset, not all six). */
function tabsForUiTab(uiTab: TabId): AnalyticsTab[] {
  if (uiTab === "overview") return ["metrics", "games", "staff", "audit"];
  return [uiTab];
}

interface AnalyticsPageClientProps {
  userTier: PermissionTier;
}

export function AnalyticsPageClient({ userTier }: AnalyticsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const range = parseAnalyticsRange(searchParams.get("range"));
  const tabParam = searchParams.get("tab");

  useEffect(() => {
    if (tabParam === "tickets") {
      router.replace("/dashboard/tickets");
    } else if (tabParam === "ticketlogs") {
      router.replace("/dashboard/ticketlogs");
    }
  }, [tabParam, router]);

  const tab: TabId =
    tabParam === "overview" ||
    tabParam === "metrics" ||
    tabParam === "games" ||
    tabParam === "staff" ||
    tabParam === "moderation" ||
    tabParam === "audit" ||
    tabParam === "engagement"
      ? tabParam
      : "overview";

  const [bundle, setBundle] = useState<AnalyticsBundle | null>(null);
  const [summaryReady, setSummaryReady] = useState(false);
  const [tabReady, setTabReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const summaryAbortRef = useRef<AbortController | null>(null);
  const tabAbortRef = useRef<AbortController | null>(null);
  const loadedTabsRef = useRef<string>("");

  const summaryCacheKey = `summary:${range}`;
  const tabCacheKey = `tab:${range}:${tab}`;

  const mergeBundle = useCallback(
    (patch: Partial<AnalyticsBundle> & { range: AnalyticsRange }) => {
      setBundle((prev) => ({
        range: patch.range,
        summary: patch.summary ?? prev?.summary ?? emptySummary(patch.range),
        metrics: patch.metrics !== undefined ? patch.metrics : prev?.metrics,
        games: patch.games !== undefined ? patch.games : prev?.games,
        staff: patch.staff !== undefined ? patch.staff : prev?.staff,
        moderation:
          patch.moderation !== undefined ? patch.moderation : prev?.moderation,
        audit: patch.audit !== undefined ? patch.audit : prev?.audit,
        engagement:
          patch.engagement !== undefined ? patch.engagement : prev?.engagement,
      }));
    },
    []
  );

  const setRange = (r: AnalyticsRange) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("range", r);
    router.replace(`/dashboard/analytics?${p.toString()}`);
  };

  const setTab = (t: TabId) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", t);
    router.replace(`/dashboard/analytics?${p.toString()}`);
  };

  useEffect(() => {
    loadedTabsRef.current = "";
    setBundle(null);
    summaryAbortRef.current?.abort();
    const ac = new AbortController();
    summaryAbortRef.current = ac;

    const cachedSummary = readAnalyticsCache<AnalyticsSummary>(summaryCacheKey);
    if (cachedSummary) {
      mergeBundle({ range, summary: cachedSummary });
      setSummaryReady(true);
      setRefreshing(true);
    } else {
      setSummaryReady(false);
      setRefreshing(true);
    }
    setTabReady(false);
    setError(null);

    fetch(`/api/analytics/summary?range=${range}`, { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ??
              `Summary failed (${res.status})`
          );
        }
        return res.json() as Promise<AnalyticsSummary & { configured?: boolean }>;
      })
      .then((data) => {
        if (ac.signal.aborted) return;
        const { configured, ...summary } = data;
        void configured;
        mergeBundle({ range, summary });
        writeAnalyticsCache(summaryCacheKey, summary);
        setSummaryReady(true);
      })
      .catch((e) => {
        if (ac.signal.aborted || (e as Error).name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load summary");
      })
      .finally(() => {
        if (!ac.signal.aborted) setRefreshing(false);
      });

    return () => ac.abort();
  }, [range, summaryCacheKey, mergeBundle]);

  useEffect(() => {
    if (!summaryReady) return;

    const apiTabs = tabsForUiTab(tab);
    const loadKey = `${range}:${tab}`;
    if (loadedTabsRef.current === loadKey) {
      setTabReady(true);
      return;
    }

    tabAbortRef.current?.abort();
    const ac = new AbortController();
    tabAbortRef.current = ac;

    const cachedTab = readAnalyticsCache<Partial<AnalyticsBundle>>(tabCacheKey);
    if (cachedTab) {
      mergeBundle({ range, ...cachedTab });
      setTabReady(true);
      setRefreshing(true);
    } else {
      setTabReady(false);
      setRefreshing(true);
    }

    const tabsParam = apiTabs.join(",");
    fetch(
      `/api/analytics/bundle?range=${range}&tabs=${tabsParam}&summary=0`,
      { signal: ac.signal }
    )
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ??
              `Analytics failed (${res.status})`
          );
        }
        return res.json() as Promise<AnalyticsBundle & { configured?: boolean }>;
      })
      .then((data) => {
        if (ac.signal.aborted) return;
        const { configured, summary: _ignored, ...patch } = data;
        void configured;
        void _ignored;
        mergeBundle(patch);
        const { range: _r, ...tabData } = patch;
        void _r;
        writeAnalyticsCache(tabCacheKey, tabData);
        loadedTabsRef.current = loadKey;
        setTabReady(true);
      })
      .catch((e) => {
        if (ac.signal.aborted || (e as Error).name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load analytics");
      })
      .finally(() => {
        if (!ac.signal.aborted) setRefreshing(false);
      });

    return () => ac.abort();
  }, [range, tab, summaryReady, tabCacheKey, mergeBundle]);

  const summary = bundle?.summary;
  const showSummarySkeleton = !summaryReady && refreshing;
  const showTabSkeleton = summaryReady && !tabReady && refreshing;

  return (
    <GamesDiscordUsersProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <AnalyticsRangeSelector value={range} onChange={setRange} />
          <p className="text-xs text-muted">
            Private tickets{" "}
            {can(userTier, "tickets.view_private") ? "included" : "excluded"}
            {refreshing && summaryReady ? " · updating…" : ""}
            {!refreshing && summaryReady && tabReady ? " · cached" : ""}
          </p>
        </div>

        {showSummarySkeleton ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg border border-border bg-surface"
              />
            ))}
          </div>
        ) : summary && tab !== "overview" ? (
          <AnalyticsKpiGrid
            items={[
              { label: "Open tickets", value: summary.tickets.openCount },
              { label: "Opened (range)", value: summary.tickets.openedInRange },
              { label: "Closed (range)", value: summary.tickets.closedInRange },
              {
                label: "Close rate",
                value:
                  summary.tickets.closeRatePercent != null
                    ? `${summary.tickets.closeRatePercent}%`
                    : "—",
              },
              { label: "Active players", value: summary.games.activePlayers },
              {
                label: "XP in range",
                value: formatNumber(summary.games.xpInRange),
              },
              { label: "Active bans", value: summary.moderation.activeBans },
              {
                label: "Dashboard actions",
                value: summary.audit.actionsInRange,
              },
            ]}
          />
        ) : null}

        <div className="flex flex-wrap gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "border-b-2 px-4 py-2 text-sm transition-colors",
                tab === t.id
                  ? "border-accent text-white"
                  : "border-transparent text-muted hover:text-white"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {showTabSkeleton ? (
          <div className="space-y-4">
            <div className="h-64 animate-pulse rounded-lg border border-border bg-surface" />
          </div>
        ) : (
          <>
            {tab === "overview" && bundle && tabReady && (
              <LazyOverviewAnalyticsSection bundle={bundle} range={range} />
            )}
            {tab === "metrics" && bundle?.metrics && tabReady && (
              <LazyTicketsAnalytics data={bundle.metrics} range={range} />
            )}
            {tab === "metrics" && tabReady && !bundle?.metrics && (
              <p className="text-muted">No metrics data available.</p>
            )}
            {tab === "games" && bundle?.games && tabReady && (
              <LazyGamesAnalyticsSection data={bundle.games} range={range} />
            )}
            {tab === "games" && tabReady && !bundle?.games && (
              <p className="text-muted">No games data available.</p>
            )}
            {tab === "staff" && bundle?.staff && tabReady && (
              <LazyStaffAnalyticsSection data={bundle.staff} />
            )}
            {tab === "staff" && tabReady && !bundle?.staff && (
              <p className="text-muted">No staff statistics available.</p>
            )}
            {tab === "moderation" && bundle?.moderation && tabReady && (
              <LazyModerationAnalyticsSection
                data={bundle.moderation}
                range={range}
              />
            )}
            {tab === "moderation" && tabReady && !bundle?.moderation && (
              <p className="text-muted">No moderation data available.</p>
            )}
            {tab === "audit" && bundle?.audit && tabReady && (
              <LazyAuditAnalyticsSection data={bundle.audit} range={range} />
            )}
            {tab === "engagement" && bundle?.engagement && tabReady && (
              <LazyEngagementAnalyticsSection
                data={bundle.engagement}
                range={range}
              />
            )}
            {tab === "engagement" && tabReady && !bundle?.engagement && (
              <p className="text-muted">
                Engagement tracking tables are not available yet. Run the
                analytics migration and restart bots.
              </p>
            )}
          </>
        )}
      </div>
    </GamesDiscordUsersProvider>
  );
}

function emptySummary(range: AnalyticsRange): AnalyticsSummary {
  return {
    range,
    tickets: {
      openCount: 0,
      openedInRange: 0,
      closedInRange: 0,
      avgPerDay: 0,
      closeRatePercent: null,
    },
    games: {
      activePlayers: 0,
      everPlayed: 0,
      xpInRange: 0,
      xpEventsInRange: 0,
    },
    moderation: { activeBans: 0, blacklists: 0, polls: 0 },
    staff: { totalMessages: 0, totalTicketsClosed: 0 },
    audit: { actionsInRange: 0, fleetRestarts: 0 },
  };
}
