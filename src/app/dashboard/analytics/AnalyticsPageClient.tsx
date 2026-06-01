"use client";

import { AuditAnalyticsSection } from "@/components/analytics/AuditAnalyticsSection";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { AnalyticsRangeSelector } from "@/components/analytics/AnalyticsRangeSelector";
import { GamesAnalyticsSection } from "@/components/analytics/GamesAnalyticsSection";
import { ModerationAnalyticsSection } from "@/components/analytics/ModerationAnalyticsSection";
import { StaffAnalyticsSection } from "@/components/analytics/StaffAnalyticsSection";
import { EngagementAnalyticsSection } from "@/components/analytics/EngagementAnalyticsSection";
import { OverviewAnalyticsSection } from "@/components/analytics/OverviewAnalyticsSection";
import { TicketsAnalytics } from "@/components/analytics/TicketsAnalytics";
import { GamesDiscordUsersProvider } from "@/components/games/GamesDiscordUsersProvider";
import type { AnalyticsBundle } from "@/lib/analytics/bundle";
import {
  readAnalyticsCache,
  writeAnalyticsCache,
} from "@/lib/analytics/client-cache";
import { parseAnalyticsRange } from "@/lib/analytics/range";
import type { AnalyticsRange } from "@/lib/analytics/types";
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

const BUNDLE_TABS = "metrics,games,staff,moderation,audit,engagement";

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
  const [hydrated, setHydrated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cacheKey = `bundle:${range}`;

  const applyBundle = useCallback((data: AnalyticsBundle) => {
    setBundle(data);
    setHydrated(true);
  }, []);

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
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const cached = readAnalyticsCache<AnalyticsBundle>(cacheKey);
    if (cached) {
      applyBundle(cached);
      setRefreshing(true);
    } else {
      setHydrated(false);
      setRefreshing(true);
    }
    setError(null);

    fetch(`/api/analytics/bundle?range=${range}&tabs=${BUNDLE_TABS}`, {
      signal: ac.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ??
              `Request failed (${res.status})`
          );
        }
        return res.json() as Promise<AnalyticsBundle & { configured?: boolean }>;
      })
      .then((data) => {
        if (ac.signal.aborted) return;
        const { configured, ...rest } = data;
        void configured;
        applyBundle(rest as AnalyticsBundle);
        writeAnalyticsCache(cacheKey, rest as AnalyticsBundle);
      })
      .catch((e) => {
        if (ac.signal.aborted || (e as Error).name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load analytics");
      })
      .finally(() => {
        if (!ac.signal.aborted) setRefreshing(false);
      });

    return () => ac.abort();
  }, [range, cacheKey, applyBundle]);

  const summary = bundle?.summary;
  const showSkeleton = !hydrated && refreshing;

  return (
    <GamesDiscordUsersProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <AnalyticsRangeSelector value={range} onChange={setRange} />
          <p className="text-xs text-muted">
            Private tickets{" "}
            {can(userTier, "tickets.view_private") ? "included" : "excluded"}
            {refreshing && hydrated ? " · updating…" : ""}
            {!refreshing && hydrated ? " · cached" : ""}
          </p>
        </div>

        {showSkeleton ? (
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
              { label: "XP in range", value: formatNumber(summary.games.xpInRange) },
              { label: "Active bans", value: summary.moderation.activeBans },
              { label: "Dashboard actions", value: summary.audit.actionsInRange },
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

        {showSkeleton ? (
          <div className="space-y-4">
            <div className="h-64 animate-pulse rounded-lg border border-border bg-surface" />
          </div>
        ) : (
          <>
            {tab === "overview" && bundle && (
              <OverviewAnalyticsSection bundle={bundle} range={range} />
            )}
            {tab === "metrics" && bundle?.metrics && (
              <TicketsAnalytics data={bundle.metrics} range={range} />
            )}
            {tab === "metrics" && hydrated && !bundle?.metrics && (
              <p className="text-muted">No metrics data available.</p>
            )}
            {tab === "games" && bundle?.games && (
              <GamesAnalyticsSection data={bundle.games} range={range} />
            )}
            {tab === "games" && hydrated && !bundle?.games && (
              <p className="text-muted">No games data available.</p>
            )}
            {tab === "staff" && bundle?.staff && (
              <StaffAnalyticsSection data={bundle.staff} />
            )}
            {tab === "staff" && hydrated && !bundle?.staff && (
              <p className="text-muted">No staff statistics available.</p>
            )}
            {tab === "moderation" && bundle?.moderation && (
              <ModerationAnalyticsSection
                data={bundle.moderation}
                range={range}
              />
            )}
            {tab === "moderation" && hydrated && !bundle?.moderation && (
              <p className="text-muted">No moderation data available.</p>
            )}
            {tab === "audit" && bundle?.audit && (
              <AuditAnalyticsSection data={bundle.audit} range={range} />
            )}
            {tab === "engagement" && bundle?.engagement && (
              <EngagementAnalyticsSection
                data={bundle.engagement}
                range={range}
              />
            )}
            {tab === "engagement" && hydrated && !bundle?.engagement && (
              <p className="text-muted">
                Engagement tracking tables are not available yet. Run the analytics
                migration and restart bots.
              </p>
            )}
          </>
        )}
      </div>
    </GamesDiscordUsersProvider>
  );
}
