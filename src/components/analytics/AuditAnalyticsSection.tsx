"use client";

import { AnalyticsChartCard } from "@/components/analytics/AnalyticsChartCard";
import { chartHint, kpi } from "@/components/analytics/bind-metric-hints";
import {
  AnalyticsDataTable,
  AnalyticsTable,
} from "@/components/analytics/AnalyticsDataTable";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { DailyLineChart, NamedBarChart } from "@/components/analytics/charts";
import { useAnalyticsTableRowLimit } from "@/components/analytics/table-row-limit";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { chartTitleWithPeriod } from "@/lib/analytics/chart-period";
import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import type { AnalyticsRange, AuditAnalytics } from "@/lib/analytics/types";
import { formatNumber } from "@/lib/utils";

interface AuditAnalyticsSectionProps {
  data: AuditAnalytics;
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
}

export function AuditAnalyticsSection({
  data,
  range,
  groupBy,
}: AuditAnalyticsSectionProps) {
  const topActorsLimit = useAnalyticsTableRowLimit(8);

  return (
    <div className="space-y-6">
      <AnalyticsKpiGrid
        items={[
          kpi("Dashboard actions (range)", data.totalInRange, "audit.actions", {
            hintSeries: data.actionsPerDay,
          }),
          kpi("Fleet restarts (range)", data.fleetRestarts, "audit.restarts", {
            hintSeries: data.actionsPerDay,
          }),
          kpi("Failed actions", data.failedActions, "audit.failed", {
            hintSeries: data.actionsPerDay,
          }),
          kpi("Success rate", `${data.successRatePercent}%`, "audit.successRate", {
            hintSeries: data.actionsPerDay,
          }),
        ]}
      />

      <AnalyticsChartCard
        title={chartTitleWithPeriod("Dashboard actions", groupBy)}
        dataHint={chartHint("audit.chart.actions", data.actionsPerDay)}
        exportHeaders={["date", "count"]}
        exportFilename={`audit-actions-${range}.csv`}
        exportRows={data.actionsPerDay.map((r) => ({
          date: r.date,
          count: r.count,
        }))}
      >
        <DailyLineChart data={data.actionsPerDay} color="#64748b" />
      </AnalyticsChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Actions by hour (UTC, combined)"
          dataHint={chartHint("audit.chart.byHour", data.actionsPerDay)}
          exportHeaders={["hour", "actions"]}
          exportFilename={`audit-by-hour-${range}.csv`}
          exportRows={data.byHour.map((r) => ({
            hour: r.name,
            actions: r.count,
          }))}
        >
          <NamedBarChart data={data.byHour} compactLabels color="#94a3b8" />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Top action types"
          dataHint={chartHint("audit.chart.topTypes", data.actionsPerDay)}
          exportHeaders={["action", "count"]}
          exportFilename={`audit-actions-types-${range}.csv`}
          exportRows={data.topActions.map((r) => ({
            action: r.name,
            count: r.count,
          }))}
        >
          <NamedBarChart data={data.topActions} />
        </AnalyticsChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsDataTable
          title="Top dashboard actors"
          dataHint={chartHint("audit.table.actors", data.actionsPerDay)}
          headers={["actorId", "count"]}
          exportFilename={`audit-actors-${range}.csv`}
          exportRows={data.topActors.map((r) => ({
            actorId: r.actorId,
            count: r.count,
          }))}
          tableRowLimit={topActorsLimit.tableRowLimit}
        >
          <AnalyticsTable>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Actor</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {topActorsLimit.slice(data.topActors).map((r, i) => (
                <tr key={r.actorId} className="border-b border-border/50">
                  <td className="px-4 py-2 text-muted">{i + 1}</td>
                  <td className="px-4 py-2">
                    <DiscordUserChip userId={r.actorId} />
                  </td>
                  <td className="px-4 py-2 text-white">
                    {formatNumber(r.count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </AnalyticsTable>
        </AnalyticsDataTable>

        {data.topTargets.length > 0 && (
          <AnalyticsChartCard
            title="Most acted-on targets"
            dataHint={chartHint("audit.chart.resources", data.actionsPerDay)}
            exportHeaders={["label", "category", "actions", "rawTarget", "detail"]}
            exportFilename={`audit-targets-${range}.csv`}
            exportRows={data.topTargets.map((r) => ({
              label: r.name,
              category: r.category,
              actions: r.count,
              rawTarget: r.raw,
              detail: r.detail,
            }))}
          >
            <p className="mb-3 px-1 text-xs text-muted">
              Each bar is what staff clicked or changed in the dashboard audit log:
              ticket channels, Discord users, bots, game sessions, or config files.
              Hover a bar for the full ID or path.
            </p>
            <NamedBarChart data={data.topTargets} color="#475569" />
          </AnalyticsChartCard>
        )}
      </div>
    </div>
  );
}
