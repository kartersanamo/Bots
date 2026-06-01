"use client";

import { AnalyticsChartCard } from "@/components/analytics/AnalyticsChartCard";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { DailyLineChart, NamedBarChart } from "@/components/analytics/charts";
import type { AnalyticsRange, GamesAnalytics } from "@/lib/analytics/types";
import { formatNumber } from "@/lib/utils";

interface GamesAnalyticsSectionProps {
  data: GamesAnalytics;
  range: AnalyticsRange;
}

export function GamesAnalyticsSection({
  data,
  range,
}: GamesAnalyticsSectionProps) {
  const { kpis } = data;

  return (
    <div className="space-y-6">
      <AnalyticsKpiGrid
        items={[
          { label: "Active players", value: kpis.activePlayers },
          { label: "Ever played", value: kpis.everPlayed },
          { label: "Open game sessions", value: kpis.openSessions },
          {
            label: "XP awarded (range)",
            value: formatNumber(kpis.totalXpInRange),
          },
          {
            label: "XP log events (range)",
            value: kpis.xpLogEventsInRange,
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="XP awarded per day"
          exportHeaders={["date", "xp"]}
          exportFilename={`games-xp-${range}.csv`}
          exportRows={data.xpPerDay.map((r) => ({ date: r.date, xp: r.count }))}
        >
          <DailyLineChart data={data.xpPerDay} color="#a855f7" />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Game sessions per day"
          exportHeaders={["date", "sessions"]}
          exportFilename={`games-sessions-${range}.csv`}
          exportRows={data.sessionsPerDay.map((r) => ({
            date: r.date,
            sessions: r.count,
          }))}
        >
          <DailyLineChart data={data.sessionsPerDay} color="#06b6d4" />
        </AnalyticsChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Top XP sources"
          exportHeaders={["source", "count"]}
          exportFilename={`games-xp-sources-${range}.csv`}
          exportRows={data.topXpSources.map((r) => ({
            source: r.name,
            count: r.count,
          }))}
        >
          <NamedBarChart data={data.topXpSources} color="#a855f7" />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="New players per day (first XP)"
          exportHeaders={["date", "players"]}
          exportFilename={`games-new-players-${range}.csv`}
          exportRows={data.newPlayersPerDay.map((r) => ({
            date: r.date,
            players: r.count,
          }))}
        >
          <DailyLineChart data={data.newPlayersPerDay} color="#10b981" />
        </AnalyticsChartCard>
      </div>
    </div>
  );
}
