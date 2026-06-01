"use client";

import { AnalyticsChartCard } from "@/components/analytics/AnalyticsChartCard";
import {
  AnalyticsDataTable,
  AnalyticsTable,
} from "@/components/analytics/AnalyticsDataTable";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { AnalyticsUserCountTable } from "@/components/analytics/AnalyticsUserCountTable";
import { DailyLineChart, NamedBarChart } from "@/components/analytics/charts";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
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
  const retentionPct =
    kpis.everPlayed > 0
      ? Math.round((kpis.activePlayers / kpis.everPlayed) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <AnalyticsKpiGrid
        items={[
          { label: "Active players", value: kpis.activePlayers },
          { label: "Ever played", value: kpis.everPlayed },
          {
            label: "Retention (active / ever)",
            value: `${retentionPct}%`,
          },
          { label: "Open game sessions", value: kpis.openSessions },
          {
            label: "XP awarded (range)",
            value: formatNumber(kpis.totalXpInRange),
          },
          { label: "XP log events (range)", value: kpis.xpLogEventsInRange },
          { label: "Avg XP per event", value: formatNumber(kpis.avgXpPerEvent) },
          {
            label: "Achievements (all time)",
            value: kpis.totalAchievements,
          },
          {
            label: "Achievements (range)",
            value: kpis.achievementsInRange,
          },
          { label: "Daily claim users", value: kpis.dailyClaimUsers },
          { label: "Claims in range", value: kpis.claimsInRange },
          { label: "Counting participants", value: kpis.countingUsers },
          {
            label: "Counting numbers posted",
            value: formatNumber(kpis.countingTotalCounts),
          },
          { label: "Counting mistakes", value: kpis.countingMistakes },
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
          title="Daily reward claims per day"
          exportHeaders={["date", "claims"]}
          exportFilename={`games-daily-claims-${range}.csv`}
          exportRows={data.dailyClaimsPerDay.map((r) => ({
            date: r.date,
            claims: r.count,
          }))}
        >
          <DailyLineChart data={data.dailyClaimsPerDay} color="#f59e0b" />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Achievements earned per day"
          exportHeaders={["date", "achievements"]}
          exportFilename={`games-achievements-${range}.csv`}
          exportRows={data.achievementsPerDay.map((r) => ({
            date: r.date,
            achievements: r.count,
          }))}
        >
          <DailyLineChart data={data.achievementsPerDay} color="#10b981" />
        </AnalyticsChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Top XP sources (events)"
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
          title="Sessions by game"
          exportHeaders={["game", "sessions"]}
          exportFilename={`games-by-name-${range}.csv`}
          exportRows={data.sessionsByGame.map((r) => ({
            game: r.name,
            sessions: r.count,
          }))}
        >
          <NamedBarChart data={data.sessionsByGame} color="#06b6d4" />
        </AnalyticsChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Player level distribution"
          exportHeaders={["bracket", "players"]}
          exportFilename="games-level-distribution.csv"
          exportRows={data.levelDistribution.map((r) => ({
            bracket: r.name,
            players: r.count,
          }))}
        >
          <NamedBarChart data={data.levelDistribution} color="#8b5cf6" />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="DM vs channel sessions"
          exportHeaders={["mode", "sessions"]}
          exportFilename={`games-session-mode-${range}.csv`}
          exportRows={data.sessionModeSplit.map((r) => ({
            mode: r.name,
            sessions: r.count,
          }))}
        >
          <NamedBarChart data={data.sessionModeSplit} color="#6366f1" />
        </AnalyticsChartCard>
      </div>

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

      <AnalyticsUserCountTable
        title="Top XP earners (range)"
        rows={data.topXpEarners.map((r) => ({
          userId: r.userId,
          count: r.value,
        }))}
        exportFilename={`games-top-earners-${range}.csv`}
        countLabel="XP"
        valueKey="xp"
      />

      {data.topStreaks.length > 0 && (
        <AnalyticsDataTable
          title="Longest daily reward streaks"
          headers={["userId", "streak"]}
          exportFilename="games-top-streaks.csv"
          exportRows={data.topStreaks.map((r) => ({
            userId: r.userId,
            streak: r.streak,
          }))}
        >
          <AnalyticsTable>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Player</th>
                <th className="px-4 py-2">Streak</th>
              </tr>
            </thead>
            <tbody>
              {data.topStreaks.map((r, i) => (
                <tr key={r.userId} className="border-b border-border/50">
                  <td className="px-4 py-2 text-muted">{i + 1}</td>
                  <td className="px-4 py-2">
                    <DiscordUserChip userId={r.userId} />
                  </td>
                  <td className="px-4 py-2 font-medium text-white">
                    {r.streak} days
                  </td>
                </tr>
              ))}
            </tbody>
          </AnalyticsTable>
        </AnalyticsDataTable>
      )}
    </div>
  );
}
