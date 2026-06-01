"use client";

import { AnalyticsChartCard } from "@/components/analytics/AnalyticsChartCard";
import {
  AnalyticsDataTable,
  AnalyticsTable,
} from "@/components/analytics/AnalyticsDataTable";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { DailyLineChart, NamedBarChart } from "@/components/analytics/charts";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import type { AnalyticsRange, AuditAnalytics } from "@/lib/analytics/types";
import { formatNumber } from "@/lib/utils";

interface AuditAnalyticsSectionProps {
  data: AuditAnalytics;
  range: AnalyticsRange;
}

export function AuditAnalyticsSection({
  data,
  range,
}: AuditAnalyticsSectionProps) {
  return (
    <div className="space-y-6">
      <AnalyticsKpiGrid
        items={[
          { label: "Dashboard actions (range)", value: data.totalInRange },
          { label: "Fleet restarts (range)", value: data.fleetRestarts },
        ]}
      />

      <AnalyticsChartCard
        title="Dashboard actions per day"
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
          title="Top action types"
          exportHeaders={["action", "count"]}
          exportFilename={`audit-actions-types-${range}.csv`}
          exportRows={data.topActions.map((r) => ({
            action: r.name,
            count: r.count,
          }))}
        >
          <NamedBarChart data={data.topActions} />
        </AnalyticsChartCard>

        <AnalyticsDataTable
          title="Top dashboard actors"
          headers={["actorId", "count"]}
          exportFilename={`audit-actors-${range}.csv`}
          exportRows={data.topActors.map((r) => ({
            actorId: r.actorId,
            count: r.count,
          }))}
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
              {data.topActors.map((r, i) => (
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
      </div>
    </div>
  );
}
