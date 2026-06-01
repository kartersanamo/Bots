"use client";

import { AuditAnalyticsSection } from "@/components/analytics/AuditAnalyticsSection";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { AnalyticsRangeSelector } from "@/components/analytics/AnalyticsRangeSelector";
import { GamesAnalyticsSection } from "@/components/analytics/GamesAnalyticsSection";
import { ModerationAnalyticsSection } from "@/components/analytics/ModerationAnalyticsSection";
import { StaffAnalyticsSection } from "@/components/analytics/StaffAnalyticsSection";
import { TicketsAnalytics } from "@/components/analytics/TicketsAnalytics";
import { GamesDiscordUsersProvider } from "@/components/games/GamesDiscordUsersProvider";
import { parseAnalyticsRange } from "@/lib/analytics/range";
import type {
  AnalyticsRange,
  AnalyticsSummary,
  AuditAnalytics,
  GamesAnalytics,
  ModerationAnalytics,
  StaffAnalytics,
  TicketAnalytics,
} from "@/lib/analytics/types";
import { can, type PermissionTier } from "@/lib/permissions";
import { cn, formatNumber } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type TabId = "tickets" | "games" | "staff" | "moderation" | "audit";

const TABS: { id: TabId; label: string }[] = [
  { id: "tickets", label: "Tickets" },
  { id: "games", label: "Games" },
  { id: "staff", label: "Staff" },
  { id: "moderation", label: "Moderation" },
  { id: "audit", label: "Dashboard audit" },
];

interface AnalyticsPageClientProps {
  userTier: PermissionTier;
}

export function AnalyticsPageClient({ userTier }: AnalyticsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const range = parseAnalyticsRange(searchParams.get("range"));
  const tab = (searchParams.get("tab") as TabId) || "tickets";

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [tickets, setTickets] = useState<TicketAnalytics | null>(null);
  const [games, setGames] = useState<GamesAnalytics | null>(null);
  const [staff, setStaff] = useState<StaffAnalytics | null>(null);
  const [moderation, setModeration] = useState<ModerationAnalytics | null>(null);
  const [audit, setAudit] = useState<AuditAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const fetchJson = useCallback(async <T,>(url: string): Promise<T | null> => {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as { error?: string }).error ?? `Request failed (${res.status})`
      );
    }
    return res.json() as Promise<T>;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchJson<AnalyticsSummary>(`/api/analytics/summary?range=${range}`)
      .then((data) => {
        if (!cancelled && data) setSummary(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, fetchJson]);

  useEffect(() => {
    let cancelled = false;
    setTabLoading(true);
    setError(null);

    const load = async () => {
      try {
        if (tab === "tickets") {
          const res = await fetchJson<{ data: TicketAnalytics | null }>(
            `/api/analytics/tickets?range=${range}`
          );
          if (!cancelled) setTickets(res?.data ?? null);
        } else if (tab === "games") {
          const res = await fetchJson<{ data: GamesAnalytics | null }>(
            `/api/analytics/games?range=${range}`
          );
          if (!cancelled) setGames(res?.data ?? null);
        } else if (tab === "staff") {
          const res = await fetchJson<{ data: StaffAnalytics | null }>(
            `/api/analytics/staff`
          );
          if (!cancelled) setStaff(res?.data ?? null);
        } else if (tab === "moderation") {
          const res = await fetchJson<{ data: ModerationAnalytics | null }>(
            `/api/analytics/moderation?range=${range}`
          );
          if (!cancelled) setModeration(res?.data ?? null);
        } else if (tab === "audit") {
          const res = await fetchJson<{ data: AuditAnalytics }>(
            `/api/analytics/audit?range=${range}`
          );
          if (!cancelled) setAudit(res?.data ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load tab");
        }
      } finally {
        if (!cancelled) setTabLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [tab, range, fetchJson]);

  return (
    <GamesDiscordUsersProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <AnalyticsRangeSelector value={range} onChange={setRange} />
          <p className="text-xs text-muted">
            Private tickets {can(userTier, "tickets.view_private") ? "included" : "excluded"} · data cached ~60s
          </p>
        </div>

        {loading && !summary ? (
          <div className="animate-pulse text-muted">Loading summary…</div>
        ) : summary ? (
          <AnalyticsKpiGrid
            items={[
              {
                label: "Open tickets",
                value: summary.tickets.openCount,
              },
              {
                label: "Opened (range)",
                value: summary.tickets.openedInRange,
              },
              {
                label: "Avg tickets / day",
                value: summary.tickets.avgPerDay.toFixed(2),
              },
              {
                label: "Active game players",
                value: summary.games.activePlayers,
              },
              {
                label: "XP in range",
                value: formatNumber(summary.games.xpInRange),
              },
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

        {tabLoading ? (
          <div className="animate-pulse text-muted">Loading {tab}…</div>
        ) : (
          <>
            {tab === "tickets" && tickets && (
              <TicketsAnalytics data={tickets} range={range} />
            )}
            {tab === "tickets" && !tickets && !tabLoading && (
              <p className="text-muted">No ticket data (database not configured?).</p>
            )}
            {tab === "games" && games && (
              <GamesAnalyticsSection data={games} range={range} />
            )}
            {tab === "games" && !games && !tabLoading && (
              <p className="text-muted">No games data available.</p>
            )}
            {tab === "staff" && staff && <StaffAnalyticsSection data={staff} />}
            {tab === "staff" && !staff && !tabLoading && (
              <p className="text-muted">No staff statistics available.</p>
            )}
            {tab === "moderation" && moderation && (
              <ModerationAnalyticsSection data={moderation} range={range} />
            )}
            {tab === "moderation" && !moderation && !tabLoading && (
              <p className="text-muted">No moderation data available.</p>
            )}
            {tab === "audit" && audit && (
              <AuditAnalyticsSection data={audit} range={range} />
            )}
          </>
        )}
      </div>
    </GamesDiscordUsersProvider>
  );
}
