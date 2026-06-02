"use client";

import { AnalyticsChartCard } from "@/components/analytics/AnalyticsChartCard";
import { chartHint, kpi } from "@/components/analytics/bind-metric-hints";
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
          kpi("Active staff", totals.staffCount, "staffTotal.activeStaff"),
          kpi(
            "Tickets closed (all time)",
            formatNumber(totals.ticketsClosed),
            "staffTotal.tickets"
          ),
          kpi(
            "Messages (all time)",
            formatNumber(totals.messages),
            "staffTotal.messages"
          ),
          kpi(
            "Warnings (all time)",
            formatNumber(totals.warnings),
            "staffTotal.warnings"
          ),
          kpi(
            "Screenshares (all time)",
            formatNumber(totals.screenshares),
            "staffTotal.screenshares"
          ),
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title={chartTitleWithPeriod("Staff messages (tracked)", groupBy)}
          dataHint={chartHint("staffTotal.chart.messages", data.messagesPerDay)}
          exportHeaders={["date", "messages"]}
          exportFilename={`staff-total-messages-${range}.csv`}
          exportRows={data.messagesPerDay.map((d) => ({
            date: d.date,
            messages: d.count,
          }))}
        >
          <DailyLineChart data={data.messagesPerDay} color="#38bdf8" />
        </AnalyticsChartCard>

        {data.topStaffByMessagesInRange.length > 0 && (
          <AnalyticsUserCountTable
            title="Top staff by messages (range)"
            dataHint={chartHint(
              "staffTotal.table.messagesLeaders",
              data.messagesPerDay
            )}
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
        dataHint={chartHint("staffTotal.table.overview", data.messagesPerDay)}
      />

      <StaffLeaderboardPanels
        data={data}
        filePrefix="staff-total"
        hintScope="staffTotal"
        hintSeries={data.messagesPerDay}
      />
    </div>
  );
}
