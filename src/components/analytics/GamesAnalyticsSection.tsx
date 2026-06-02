"use client";

import { AnalyticsChartCard } from "@/components/analytics/AnalyticsChartCard";
import { GamesLeaderboardsPanel } from "@/components/analytics/GamesLeaderboardsPanel";
import { chartHint, kpi } from "@/components/analytics/bind-metric-hints";
import {
  AnalyticsDataTable,
  AnalyticsTable,
} from "@/components/analytics/AnalyticsDataTable";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { AnalyticsUserCountTable } from "@/components/analytics/AnalyticsUserCountTable";
import { DailyLineChart, NamedBarChart } from "@/components/analytics/charts";
import { useAnalyticsTableRowLimit } from "@/components/analytics/table-row-limit";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { chartTitleWithPeriod } from "@/lib/analytics/chart-period";
import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import type { AnalyticsRange, GamesAnalytics } from "@/lib/analytics/types";
import { formatNumber, formatPercentRatio } from "@/lib/utils";

interface GamesAnalyticsSectionProps {
  data: GamesAnalytics;
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
}

export function GamesAnalyticsSection({
  data,
  range,
  groupBy,
}: GamesAnalyticsSectionProps) {
  const topStreaksLimit = useAnalyticsTableRowLimit(8);
  const topCountersLimit = useAnalyticsTableRowLimit(10);

  const { kpis } = data;

  return (
    <div className="space-y-6">
      <AnalyticsKpiGrid
        items={[
          kpi("Leveling users", kpis.activePlayers, "games.levelingUsers"),
          kpi("Ever played", kpis.everPlayed, "games.everPlayed"),
          kpi(
            "Retention (active / ever)",
            formatPercentRatio(kpis.activePlayers, kpis.everPlayed),
            "games.retention",
            {
              subtitle:
                kpis.everPlayed > 0
                  ? `${formatNumber(kpis.activePlayers)} / ${formatNumber(kpis.everPlayed)}`
                  : undefined,
            }
          ),
          kpi("Total game sessions", kpis.openSessions, "games.sessions"),
          kpi(
            "XP awarded (range)",
            formatNumber(kpis.totalXpInRange),
            "games.xpRange",
            { hintSeries: data.xpPerDay }
          ),
          kpi("XP log events (range)", kpis.xpLogEventsInRange, "games.xpEvents", {
            hintSeries: data.xpPerDay,
          }),
          kpi("Avg XP per event", formatNumber(kpis.avgXpPerEvent), "games.avgXp"),
          kpi(
            "Achievements (all time)",
            kpis.totalAchievements,
            "games.achievementsAll"
          ),
          kpi(
            "Achievements (range)",
            kpis.achievementsInRange,
            "games.achievementsRange",
            { hintSeries: data.achievementsPerDay }
          ),
          kpi("Daily claim users", kpis.dailyClaimUsers, "games.dailyClaimUsers", {
            subtitle: "All-time players with a /daily record",
          }),
          kpi(
            "Claims in range",
            formatNumber(kpis.claimsInRange),
            "games.claimsRange",
            {
              hintSeries: data.dailyClaimsPerDay,
              subtitle:
                kpis.dailyClaimUsersInRange > 0
                  ? `${formatNumber(kpis.dailyClaimUsersInRange)} players · ${(
                      kpis.claimsInRange / kpis.dailyClaimUsersInRange
                    ).toFixed(1)} claims/player avg`
                  : undefined,
            }
          ),
          kpi(
            "Current count",
            kpis.countingCurrentCount != null
              ? formatNumber(kpis.countingCurrentCount)
              : "—",
            "games.countingCurrent",
            { subtitle: "Last number in the counting channel" }
          ),
          kpi(
            "Highest count",
            kpis.countingHighestCount != null
              ? formatNumber(kpis.countingHighestCount)
              : "—",
            "games.countingHighest",
            { subtitle: "Best streak on the server" }
          ),
          kpi("Counting participants", kpis.countingUsers, "games.countingUsers"),
          kpi("Counting mistakes", kpis.countingMistakes, "games.countingMistakes"),
        ]}
      />

      <GamesLeaderboardsPanel leaderboards={data.leaderboards} />

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title={chartTitleWithPeriod("XP awarded", groupBy)}
          dataHint={chartHint("games.chart.xp", data.xpPerDay)}
          exportHeaders={["date", "xp"]}
          exportFilename={`games-xp-${range}.csv`}
          exportRows={data.xpPerDay.map((r) => ({ date: r.date, xp: r.count }))}
        >
          <DailyLineChart data={data.xpPerDay} color="#a855f7" />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={chartTitleWithPeriod("Game sessions", groupBy)}
          dataHint={chartHint("games.chart.sessions", data.sessionsPerDay)}
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
          title={chartTitleWithPeriod("Daily reward claims", groupBy)}
          dataHint={chartHint("games.chart.dailyClaims", data.dailyClaimsPerDay)}
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
          title={chartTitleWithPeriod("Achievements earned", groupBy)}
          dataHint={chartHint("games.chart.achievements", data.achievementsPerDay)}
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
          dataHint={chartHint("games.chart.xpSourcesEvents", data.xpPerDay)}
          exportHeaders={["source", "events"]}
          exportFilename={`games-xp-sources-events-${range}.csv`}
          exportRows={data.topXpSources.map((r) => ({
            source: r.name,
            events: r.count,
          }))}
        >
          <NamedBarChart data={data.topXpSources} color="#a855f7" />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Top XP sources (xp)"
          dataHint={chartHint("games.chart.xpSourcesXp", data.xpPerDay)}
          exportHeaders={["source", "xp"]}
          exportFilename={`games-xp-sources-xp-${range}.csv`}
          exportRows={data.topXpSourcesByXp.map((r) => ({
            source: r.name,
            xp: r.count,
          }))}
        >
          <NamedBarChart data={data.topXpSourcesByXp} color="#c084fc" />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Sessions by game"
          dataHint={chartHint("games.chart.sessionsByGame", data.sessionsPerDay)}
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
          dataHint={chartHint("games.chart.levelDist", data.xpPerDay)}
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
          dataHint={chartHint("games.chart.sessionMode", data.sessionsPerDay)}
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
        title={`${chartTitleWithPeriod("New players", groupBy)} (first XP)`}
        dataHint={chartHint("games.chart.newPlayers", data.newPlayersPerDay)}
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
        dataHint={chartHint("games.table.topXp", data.xpPerDay)}
        rows={data.topXpEarners.map((r) => ({
          userId: r.userId,
          count: r.value,
        }))}
        exportFilename={`games-top-earners-${range}.csv`}
        countLabel="XP"
        valueKey="xp"
      />

      {data.topCounters.length > 0 && (
        <AnalyticsDataTable
          title="Top counters"
          dataHint={chartHint("games.table.topCounters", data.xpPerDay)}
          headers={["userId", "totalCounts", "highestCount", "mistakes"]}
          exportFilename="games-top-counters.csv"
          exportRows={data.topCounters.map((r) => ({
            userId: r.userId,
            totalCounts: r.totalCounts,
            highestCount: r.highestCount,
            mistakes: r.mistakes,
          }))}
          tableRowLimit={topCountersLimit.tableRowLimit}
        >
          <AnalyticsTable>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Player</th>
                <th className="px-4 py-2">Counts</th>
                <th className="px-4 py-2">Personal best</th>
                <th className="px-4 py-2">Mistakes</th>
              </tr>
            </thead>
            <tbody>
              {topCountersLimit.slice(data.topCounters).map((r, i) => (
                <tr key={r.userId} className="border-b border-border/50">
                  <td className="px-4 py-2 text-muted">{i + 1}</td>
                  <td className="px-4 py-2">
                    <DiscordUserChip userId={r.userId} />
                  </td>
                  <td className="px-4 py-2 font-medium text-white">
                    {formatNumber(r.totalCounts)}
                  </td>
                  <td className="px-4 py-2">{formatNumber(r.highestCount)}</td>
                  <td className="px-4 py-2">{r.mistakes}</td>
                </tr>
              ))}
            </tbody>
          </AnalyticsTable>
        </AnalyticsDataTable>
      )}

      {data.topStreaks.length > 0 && (
        <AnalyticsDataTable
          title="Longest daily reward streaks"
          dataHint={chartHint("games.table.streaks", data.dailyClaimsPerDay)}
          headers={["userId", "streak"]}
          exportFilename="games-top-streaks.csv"
          exportRows={data.topStreaks.map((r) => ({
            userId: r.userId,
            streak: r.streak,
          }))}
          tableRowLimit={topStreaksLimit.tableRowLimit}
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
              {topStreaksLimit.slice(data.topStreaks).map((r, i) => (
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
