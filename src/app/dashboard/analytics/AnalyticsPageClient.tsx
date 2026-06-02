"use client";

import { AnalyticsControls } from "@/components/analytics/AnalyticsControls";
import { AnalyticsHintProvider } from "@/components/analytics/AnalyticsHint";
import { AnalyticsTabPanels } from "@/components/analytics/AnalyticsTabPanels";
import { GamesDiscordUsersProvider } from "@/components/games/GamesDiscordUsersProvider";
import type { AnalyticsBundle } from "@/lib/analytics/bundle";
import type { AnalyticsTab } from "@/lib/analytics/bundle";
import {
  readAnalyticsCache,
  writeAnalyticsCache,
} from "@/lib/analytics/client-cache";
import {
  parseAnalyticsGroupBy,
  type AnalyticsGroupBy,
} from "@/lib/analytics/group-by";
import { parseAnalyticsRange } from "@/lib/analytics/range";
import type { AnalyticsRange, AnalyticsSummary } from "@/lib/analytics/types";
import { can, type PermissionTier } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type TabId =
  | "overview"
  | "metrics"
  | "games"
  | "staff-recent"
  | "staff-total"
  | "moderation"
  | "audit"
  | "engagement";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "engagement", label: "Engagement" },
  { id: "metrics", label: "Ticket metrics" },
  { id: "games", label: "Games" },
  { id: "staff-recent", label: "Staff (Recent)" },
  { id: "staff-total", label: "Staff (Total)" },
  { id: "moderation", label: "Moderation" },
  { id: "audit", label: "Dashboard audit" },
];

function tabsForUiTab(uiTab: TabId): AnalyticsTab[] {
  if (uiTab === "overview") return ["metrics", "games", "staff-total", "audit"];
  return [uiTab];
}

function tabUsesRangeControls(uiTab: TabId): boolean {
  return uiTab !== "staff-recent";
}

interface AnalyticsPageClientProps {
  userTier: PermissionTier;
}

export function AnalyticsPageClient({ userTier }: AnalyticsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const range = parseAnalyticsRange(searchParams.get("range"));
  const groupBy = parseAnalyticsGroupBy(searchParams.get("group"), range);
  const tabParam = searchParams.get("tab");

  useEffect(() => {
    if (tabParam === "tickets") {
      router.replace("/dashboard/tickets");
    } else if (tabParam === "ticketlogs") {
      router.replace("/dashboard/ticketlogs");
    } else if (tabParam === "staff") {
      const p = new URLSearchParams(searchParams.toString());
      p.set("tab", "staff-recent");
      router.replace(`/dashboard/analytics?${p.toString()}`);
    }
  }, [tabParam, router, searchParams]);

  const tab: TabId =
    tabParam === "overview" ||
    tabParam === "metrics" ||
    tabParam === "games" ||
    tabParam === "staff-recent" ||
    tabParam === "staff-total" ||
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
  const [chunkLoadFailed, setChunkLoadFailed] = useState(false);
  const [dataFetchedAt, setDataFetchedAt] = useState(() => Date.now());
  const summaryAbortRef = useRef<AbortController | null>(null);
  const tabAbortRef = useRef<AbortController | null>(null);
  const loadedTabsRef = useRef<string>("");

  const summaryCacheKey = `summary:${range}`;
  const tabCacheKey =
    tab === "staff-recent"
      ? "tab:staff-recent"
      : `tab:${range}:${groupBy}:${tab}`;

  const mergeBundle = useCallback(
    (patch: Partial<AnalyticsBundle> & { range: AnalyticsRange }) => {
      setBundle((prev) => ({
        range: patch.range,
        groupBy: patch.groupBy ?? prev?.groupBy ?? groupBy,
        summary: patch.summary ?? prev?.summary ?? emptySummary(patch.range),
        metrics: patch.metrics !== undefined ? patch.metrics : prev?.metrics,
        games: patch.games !== undefined ? patch.games : prev?.games,
        staffRecent:
          patch.staffRecent !== undefined ? patch.staffRecent : prev?.staffRecent,
        staffTotal:
          patch.staffTotal !== undefined ? patch.staffTotal : prev?.staffTotal,
        moderation:
          patch.moderation !== undefined ? patch.moderation : prev?.moderation,
        audit: patch.audit !== undefined ? patch.audit : prev?.audit,
        engagement:
          patch.engagement !== undefined ? patch.engagement : prev?.engagement,
      }));
    },
    [groupBy]
  );

  const updateParams = useCallback(
    (updates: { range?: AnalyticsRange; group?: string; tab?: TabId }) => {
      const p = new URLSearchParams(searchParams.toString());
      if (updates.range != null) p.set("range", updates.range);
      if (updates.group != null) p.set("group", updates.group);
      if (updates.tab != null) p.set("tab", updates.tab);
      router.replace(`/dashboard/analytics?${p.toString()}`);
    },
    [router, searchParams]
  );

  const setRange = (r: AnalyticsRange) => {
    const nextGroup = parseAnalyticsGroupBy(groupBy, r);
    updateParams({ range: r, group: nextGroup });
  };

  const setGroupBy = (g: AnalyticsGroupBy) => {
    updateParams({ group: g });
  };

  const setTab = (t: TabId) => {
    updateParams({ tab: t });
  };

  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      const msg = String(
        (event.reason as Error)?.message ?? event.reason ?? ""
      );
      if (
        /chunk|dynamically imported module|Failed to fetch/i.test(msg) ||
        /ERR_QUIC|QUIC_PROTOCOL/i.test(msg)
      ) {
        setChunkLoadFailed(true);
      }
    };
    const onScriptError = (event: Event) => {
      const el = event.target;
      if (
        el instanceof HTMLScriptElement &&
        el.src.includes("/_next/static/")
      ) {
        setChunkLoadFailed(true);
      }
    };
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onScriptError, true);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onScriptError, true);
    };
  }, []);

  useEffect(() => {
    loadedTabsRef.current = "";
    setBundle(null);
    setChunkLoadFailed(false);
    summaryAbortRef.current?.abort();
    const ac = new AbortController();
    summaryAbortRef.current = ac;

    const cachedSummary = readAnalyticsCache<AnalyticsSummary>(summaryCacheKey);
    if (cachedSummary) {
      mergeBundle({ range, groupBy, summary: cachedSummary });
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
        mergeBundle({ range, groupBy, summary });
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
  }, [range, groupBy, summaryCacheKey, mergeBundle]);

  useEffect(() => {
    if (!summaryReady) return;

    const apiTabs = tabsForUiTab(tab);
    const loadKey =
      tab === "staff-recent" ? "staff-recent" : `${range}:${groupBy}:${tab}`;
    if (loadedTabsRef.current === loadKey) {
      setTabReady(true);
      return;
    }

    tabAbortRef.current?.abort();
    const ac = new AbortController();
    tabAbortRef.current = ac;

    const cachedTab = readAnalyticsCache<Partial<AnalyticsBundle>>(tabCacheKey);
    if (cachedTab) {
      mergeBundle({ range, groupBy, ...cachedTab });
      setTabReady(true);
      setRefreshing(true);
    } else {
      setTabReady(false);
      setRefreshing(true);
    }

    const tabsParam = apiTabs.join(",");
    fetch(
      `/api/analytics/bundle?range=${range}&group=${groupBy}&tabs=${tabsParam}&summary=0`,
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
        const { range: _r, groupBy: _g, ...tabData } = patch;
        void _r;
        void _g;
        writeAnalyticsCache(tabCacheKey, tabData);
        loadedTabsRef.current = loadKey;
        setTabReady(true);
        setDataFetchedAt(Date.now());
      })
      .catch((e) => {
        if (ac.signal.aborted || (e as Error).name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load analytics");
      })
      .finally(() => {
        if (!ac.signal.aborted) setRefreshing(false);
      });

    return () => ac.abort();
  }, [range, groupBy, tab, summaryReady, tabCacheKey, mergeBundle]);

  useEffect(() => {
    if (summaryReady) setDataFetchedAt(Date.now());
  }, [summaryReady, summaryCacheKey]);

  const showTabSkeleton = summaryReady && !tabReady && refreshing;

  return (
    <GamesDiscordUsersProvider>
      <AnalyticsHintProvider
        range={range}
        groupBy={groupBy}
        fetchedAt={dataFetchedAt}
        rangeApplies={tabUsesRangeControls(tab)}
      >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {tabUsesRangeControls(tab) ? (
            <AnalyticsControls
              range={range}
              groupBy={groupBy}
              onRangeChange={setRange}
              onGroupByChange={setGroupBy}
            />
          ) : (
            <p className="text-sm text-muted">
              This tab shows the current manager period only — range and group
              controls do not apply.
            </p>
          )}
          <p className="text-xs text-muted sm:pt-8">
            Private tickets{" "}
            {can(userTier, "tickets.view_private") ? "included" : "excluded"}
            {refreshing && summaryReady ? " · updating…" : ""}
            {!refreshing && summaryReady && tabReady ? " · cached" : ""}
          </p>
        </div>

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

        {chunkLoadFailed && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <p>Part of the page failed to load (network or cache mismatch).</p>
            <button
              type="button"
              className="mt-2 text-accent underline hover:no-underline"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        )}

        {showTabSkeleton ? (
          <div className="space-y-4">
            <div className="h-64 animate-pulse rounded-lg border border-border bg-surface" />
          </div>
        ) : (
          bundle && (
            <AnalyticsTabPanels
              tab={tab}
              bundle={bundle}
              range={range}
              groupBy={groupBy}
              tabReady={tabReady}
            />
          )
        )}
      </div>
      </AnalyticsHintProvider>
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
    moderation: { activeBans: 0, activeTimeouts: 0, blacklists: 0 },
    staff: { totalMessages: 0, totalTicketsClosed: 0 },
    audit: { actionsInRange: 0, fleetRestarts: 0 },
  };
}
