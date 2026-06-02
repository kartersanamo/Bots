"use client";

import { AnalyticsChartCard } from "@/components/analytics/AnalyticsChartCard";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { AnalyticsUserCountTable } from "@/components/analytics/AnalyticsUserCountTable";
import {
  StaffLeaderboardPanels,
  StaffOverviewTable,
} from "@/components/analytics/StaffLeaderboardPanels";
import { DailyLineChart } from "@/components/analytics/charts";
import { chartTitleWithPeriod } from "@/lib/analytics/chart-period";
import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import type { AnalyticsRange, StaffTotalAnalytics } from "@/lib/analytics/types";
import { formatNumber } from "@/lib/utils";

export function StaffTotalAnalyticsSection({
  data,
  range,
  groupBy,
}: {
  data: StaffTotalAnalytics;
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
}) {
  const { totals } = data;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Lifetime leaderboards use{" "}
        <code className="text-xs">total_statistics</code> (never reset by /wipe).
        Charts below use tracked staff messages in the selected range and group.
      </p>

      <AnalyticsKpiGrid
        items={[
          { label: "Active staff", value: totals.staffCount },
          {
            label: "Tickets closed (all time)",
            value: formatNumber(totals.ticketsClosed),
          },
          {
            label: "Messages (all time)",
            value: formatNumber(totals.messages),
          },
          {
            label: "Warnings (all time)",
            value: formatNumber(totals.warnings),
          },
          {
            label: "Screenshares (all time)",
            value: formatNumber(totals.screenshares),
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title={chartTitleWithPeriod("Staff messages (tracked)", groupBy)}
          exportHeaders={["date", "messages"]}
          exportFilename={`staff-total-messages-${range}.csv`}
          exportRows={data.messagesPerDay.map((d) => ({
            date: d.date,
            messages: d.count,
          }))}
        >
          <DailyLineChart
            data={data.messagesPerDay}
            color="#38bdf8"
            valueLabel="Messages"
          />
        </AnalyticsChartCard>

        {data.topStaffByMessagesInRange.length > 0 && (
          <AnalyticsUserCountTable
            title="Top staff by messages (range)"
            rows={data.topStaffByMessagesInRange}
            exportFilename={`staff-total-messages-leaders-${range}.csv`}
            countLabel="Messages"
            valueKey="messages"
          />
        )}
      </div>

      <StaffOverviewTable
        title="All-time activity by staff"
        description="Lifetime counts per active staff member from total_statistics. Departed staff (all zeros in the current statistics period) are excluded."
        rows={data.leaderboard}
        exportFilename="staff-total-overview.csv"
      />

      <StaffLeaderboardPanels data={data} filePrefix="staff-total" />
    </div>
  );
}
