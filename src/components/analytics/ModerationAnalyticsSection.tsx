"use client";

import { AnalyticsChartCard } from "@/components/analytics/AnalyticsChartCard";
import { chartHint, kpi } from "@/components/analytics/bind-metric-hints";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { AnalyticsUserCountTable } from "@/components/analytics/AnalyticsUserCountTable";
import { DailyLineChart, NamedBarChart } from "@/components/analytics/charts";
import { ActiveGuildBansTable } from "@/components/analytics/ActiveGuildBansTable";
import { ActiveGuildTimeoutsTable } from "@/components/analytics/ActiveGuildTimeoutsTable";
import { GamesDiscordUsersProvider } from "@/components/games/GamesDiscordUsersProvider";
import type { AnalyticsRange, ModerationAnalytics } from "@/lib/analytics/types";

interface ModerationAnalyticsSectionProps {
  data: ModerationAnalytics;
  range: AnalyticsRange;
}

export function ModerationAnalyticsSection({
  data,
  range,
}: ModerationAnalyticsSectionProps) {
  const { kpis } = data;

  const snapshotBars = [
    { name: "Active bans", count: kpis.activeBans },
    { name: "Active timeouts", count: kpis.activeTimeouts },
    { name: "Ticket blacklists", count: kpis.totalBlacklists },
    { name: "Media queue", count: kpis.mediaEntries },
  ].filter((r) => r.count > 0 || r.name === "Active bans");

  return (
    <GamesDiscordUsersProvider>
      <div className="space-y-6">
        <AnalyticsKpiGrid
          items={[
            kpi("Active bans", kpis.activeBans, "moderation.activeBans"),
            kpi(
              "Active timeouts",
              kpis.activeTimeouts,
              "moderation.activeTimeouts"
            ),
            kpi("Blacklist entries", kpis.totalBlacklists, "moderation.blacklists"),
            kpi(
              "Blacklists with expiry",
              kpis.blacklistsWithExpiry,
              "moderation.blacklistsExpiry",
              { hintSeries: data.blacklistsPerDay }
            ),
            kpi("Media queue rows", kpis.mediaEntries, "moderation.media"),
            ...(data.trackingModActions
              ? [
                  kpi(
                    "Dashboard mod actions (range)",
                    data.modActionsInRange,
                    "moderation.modActionsInRange",
                    { hintSeries: data.modActionsPerDay }
                  ),
                ]
              : []),
          ]}
        />

        <AnalyticsChartCard
          title="Moderation snapshot (current)"
          dataHint={chartHint("moderation.chart.snapshot", data.blacklistsPerDay)}
          exportHeaders={["category", "count"]}
          exportFilename={`moderation-snapshot-${range}.csv`}
          exportRows={snapshotBars.map((r) => ({
            category: r.name,
            count: r.count,
          }))}
        >
          <NamedBarChart data={snapshotBars} color="#f97316" />
        </AnalyticsChartCard>

        {data.trackingModActions && data.modActionsPerDay.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            <AnalyticsChartCard
              title="Dashboard moderation actions over time"
              dataHint={chartHint(
                "moderation.chart.modActions",
                data.modActionsPerDay
              )}
              exportHeaders={["date", "count"]}
              exportFilename={`mod-actions-${range}.csv`}
              exportRows={data.modActionsPerDay.map((r) => ({
                date: r.date,
                count: r.count,
              }))}
            >
              <DailyLineChart data={data.modActionsPerDay} color="#a855f7" />
            </AnalyticsChartCard>

            {data.modActionsByType.length > 0 && (
              <AnalyticsChartCard
                title="Actions by type (range)"
                dataHint={chartHint(
                  "moderation.chart.modActionsByType",
                  data.modActionsPerDay
                )}
                exportHeaders={["action", "count"]}
                exportFilename={`mod-actions-by-type-${range}.csv`}
                exportRows={data.modActionsByType.map((r) => ({
                  action: r.name,
                  count: r.count,
                }))}
              >
                <NamedBarChart data={data.modActionsByType} color="#8b5cf6" />
              </AnalyticsChartCard>
            )}
          </div>
        )}

        {!data.trackingModActions && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <p className="font-medium">Mod action history not available</p>
            <p className="mt-1 text-amber-200/80">
              Deploy the <code className="text-xs">analytics_mod_actions</code>{" "}
              table to chart dashboard bans, timeouts, and kicks over time.
            </p>
          </div>
        )}

        <ActiveGuildBansTable variant="analytics" />

        <ActiveGuildTimeoutsTable variant="analytics" />

        <div className="grid gap-4 lg:grid-cols-2">
          <AnalyticsChartCard
            title="Ticket blacklist expirations by date"
            dataHint={chartHint("moderation.chart.expiry", data.blacklistsPerDay)}
            exportHeaders={["date", "count"]}
            exportFilename={`blacklists-expiry-${range}.csv`}
            exportRows={data.blacklistsPerDay.map((r) => ({
              date: r.date,
              count: r.count,
            }))}
          >
            <DailyLineChart data={data.blacklistsPerDay} color="#ef4444" />
          </AnalyticsChartCard>

          {data.blacklistsByStaff.length > 0 && (
            <AnalyticsChartCard
              title="Blacklists issued by staff (all time)"
              dataHint={chartHint("moderation.chart.byStaff", data.blacklistsPerDay)}
              exportHeaders={["staffId", "count"]}
              exportFilename={`blacklists-by-staff-chart-${range}.csv`}
              exportRows={data.blacklistsByStaff.map((r) => ({
                staffId: r.userId,
                count: r.count,
              }))}
            >
              <NamedBarChart
                data={data.blacklistsByStaff.map((r) => ({
                  name: r.userId.slice(-6),
                  count: r.count,
                }))}
                color="#ef4444"
              />
            </AnalyticsChartCard>
          )}
        </div>

        {data.blacklistsByStaff.length > 0 && (
          <AnalyticsUserCountTable
            title="Blacklists by staff member"
            dataHint={chartHint("moderation.table.byStaff", data.blacklistsPerDay)}
            rows={data.blacklistsByStaff}
            exportFilename="blacklists-by-staff.csv"
            countLabel="Entries"
          />
        )}
      </div>
    </GamesDiscordUsersProvider>
  );
}
