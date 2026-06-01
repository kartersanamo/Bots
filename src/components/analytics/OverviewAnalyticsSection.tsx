"use client";

import { AnalyticsChartCard } from "@/components/analytics/AnalyticsChartCard";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { AnalyticsUserCountTable } from "@/components/analytics/AnalyticsUserCountTable";
import { DailyLineChart, DualDailyLineChart, NamedBarChart } from "@/components/analytics/charts";
import { chartTitleWithPeriod } from "@/lib/analytics/chart-period";
import type { AnalyticsBundle } from "@/lib/analytics/bundle";
import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import type { AnalyticsRange } from "@/lib/analytics/types";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";

interface OverviewAnalyticsSectionProps {
  bundle: AnalyticsBundle;
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
}

export function OverviewAnalyticsSection({
  bundle,
  range,
  groupBy,
}: OverviewAnalyticsSectionProps) {
  const { summary, metrics, games, staff, audit } = bundle;

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-accent/20 bg-gradient-to-br from-accent/10 via-transparent to-cyan-500/5 p-5">
        <h2 className="text-lg font-semibold text-white">Command center</h2>
        <p className="mt-1 text-sm text-muted">
          Cross-system snapshot for the selected period. Drill into each tab for
          full detail, tables, and CSV exports.
        </p>
      </div>

      <AnalyticsKpiGrid
        className="xl:grid-cols-6"
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
          { label: "XP events", value: summary.games.xpEventsInRange },
          { label: "Active bans", value: summary.moderation.activeBans },
          { label: "Blacklists", value: summary.moderation.blacklists },
          { label: "Polls", value: summary.moderation.polls },
          {
            label: "Staff tickets closed",
            value: summary.staff.totalTicketsClosed,
          },
          { label: "Staff messages", value: summary.staff.totalMessages },
          { label: "Dashboard actions", value: summary.audit.actionsInRange },
          { label: "Fleet restarts", value: summary.audit.fleetRestarts },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {metrics && (
          <AnalyticsChartCard
            title="Ticket flow"
            exportHeaders={["date", "opened", "closed"]}
            exportFilename={`overview-tickets-${range}.csv`}
            exportRows={metrics.openedPerDay.map((r) => {
              const closed =
                metrics.closedPerDay.find((c) => c.date === r.date)?.count ?? 0;
              return { date: r.date, opened: r.count, closed };
            })}
          >
            <DualDailyLineChart
              opened={metrics.openedPerDay}
              closed={metrics.closedPerDay}
            />
            <p className="mt-2 text-center">
              <Link
                href="/dashboard/analytics?tab=metrics"
                className="text-xs text-accent hover:underline"
              >
                Full ticket metrics →
              </Link>
            </p>
          </AnalyticsChartCard>
        )}

        {games && (
          <AnalyticsChartCard
            title={chartTitleWithPeriod("XP awarded", groupBy)}
            exportHeaders={["date", "xp"]}
            exportFilename={`overview-xp-${range}.csv`}
            exportRows={games.xpPerDay.map((r) => ({ date: r.date, xp: r.count }))}
          >
            <DailyLineChart data={games.xpPerDay} color="#a855f7" />
            <p className="mt-2 text-center">
              <Link
                href="/dashboard/analytics?tab=games"
                className="text-xs text-accent hover:underline"
              >
                Full games analytics →
              </Link>
            </p>
          </AnalyticsChartCard>
        )}

        {audit && (
          <AnalyticsChartCard
            title="Dashboard activity"
            exportHeaders={["date", "actions"]}
            exportFilename={`overview-audit-${range}.csv`}
            exportRows={audit.actionsPerDay.map((r) => ({
              date: r.date,
              actions: r.count,
            }))}
          >
            <DailyLineChart data={audit.actionsPerDay} color="#64748b" />
            <p className="mt-2 text-center">
              <Link
                href="/dashboard/analytics?tab=audit"
                className="text-xs text-accent hover:underline"
              >
                Full audit log analytics →
              </Link>
            </p>
          </AnalyticsChartCard>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {metrics && metrics.byType.length > 0 && (
          <AnalyticsChartCard
            title="Tickets by type"
            exportHeaders={["type", "count"]}
            exportFilename={`overview-ticket-types-${range}.csv`}
            exportRows={metrics.byType.map((r) => ({
              type: r.name,
              count: r.count,
            }))}
          >
            <NamedBarChart data={metrics.byType} color="#f97316" />
          </AnalyticsChartCard>
        )}

        {games && games.topXpSources.length > 0 && (
          <AnalyticsChartCard
            title="Top XP sources"
            exportHeaders={["source", "events"]}
            exportFilename={`overview-xp-sources-${range}.csv`}
            exportRows={games.topXpSources.map((r) => ({
              source: r.name,
              events: r.count,
            }))}
          >
            <NamedBarChart data={games.topXpSources} color="#a855f7" />
          </AnalyticsChartCard>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {metrics && (
          <AnalyticsUserCountTable
            title="Top ticket closers (range)"
            rows={metrics.topClosersInRange.slice(0, 8)}
            exportFilename={`overview-closers-${range}.csv`}
            countLabel="Closed"
          />
        )}
        {games && (
          <AnalyticsUserCountTable
            title="Top XP earners (range)"
            rows={games.topXpEarners.slice(0, 8).map((r) => ({
              userId: r.userId,
              count: r.value,
            }))}
            exportFilename={`overview-xp-leaders-${range}.csv`}
            countLabel="XP"
            valueKey="xp"
          />
        )}
        {staff && (
          <AnalyticsUserCountTable
            title="Staff — tickets closed"
            rows={staff.leaderboard.slice(0, 8).map((r) => ({
              userId: r.userId,
              count: r.ticketsClosed,
            }))}
            exportFilename="overview-staff-tickets.csv"
            countLabel="Closed"
          />
        )}
      </div>
    </div>
  );
}
