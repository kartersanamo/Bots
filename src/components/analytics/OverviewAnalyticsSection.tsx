"use client";

import { AnalyticsChartCard } from "@/components/analytics/AnalyticsChartCard";
import { kpi } from "@/components/analytics/bind-metric-hints";
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
  const { summary, metrics, games, staffTotal, audit } = bundle;

  return (
    <div className="space-y-8">

      <AnalyticsKpiGrid
        className="xl:grid-cols-6"
        items={[
          kpi("Open tickets", summary.tickets.openCount, "overview.openTickets"),
          kpi("Opened (range)", summary.tickets.openedInRange, "overview.openedRange"),
          kpi("Closed (range)", summary.tickets.closedInRange, "overview.closedRange"),
          kpi(
            "Close rate",
            summary.tickets.closeRatePercent != null
              ? `${summary.tickets.closeRatePercent}%`
              : "—",
            "overview.closeRate"
          ),
          kpi("Leveling users", summary.games.activePlayers, "overview.levelingUsers"),
          kpi("XP in range", formatNumber(summary.games.xpInRange), "overview.xpInRange"),
          kpi("XP events", summary.games.xpEventsInRange, "overview.xpEvents"),
          kpi("Active bans", summary.moderation.activeBans, "overview.activeBans"),
          kpi("Ticket blacklists", summary.moderation.blacklists, "overview.blacklists"),
          kpi(
            "Staff tickets closed",
            summary.staff.totalTicketsClosed,
            "overview.staffTicketsClosed"
          ),
          kpi("Staff messages", summary.staff.totalMessages, "overview.staffMessages"),
          kpi(
            "Dashboard actions",
            summary.audit.actionsInRange,
            "overview.auditActions"
          ),
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {metrics && (
          <AnalyticsChartCard
            title="Ticket flow"
            dataHint="overview.chart.ticketFlow"
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
            dataHint="overview.chart.xp"
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
            dataHint="overview.chart.audit"
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
            dataHint="overview.chart.ticketTypes"
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
            dataHint="overview.chart.xpSources"
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
            dataHint="overview.table.topClosers"
            rows={metrics.topClosersInRange}
            exportFilename={`overview-closers-${range}.csv`}
            countLabel="Closed"
          />
        )}
        {games && (
          <AnalyticsUserCountTable
            title="Top XP earners (range)"
            dataHint="overview.table.topXp"
            rows={games.topXpEarners.map((r) => ({
              userId: r.userId,
              count: r.value,
            }))}
            exportFilename={`overview-xp-leaders-${range}.csv`}
            countLabel="XP"
            valueKey="xp"
          />
        )}
        {staffTotal && (
          <AnalyticsUserCountTable
            title="Staff — tickets closed (all time)"
            dataHint="overview.table.staffTickets"
            rows={staffTotal.leaderboard.map((r) => ({
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
