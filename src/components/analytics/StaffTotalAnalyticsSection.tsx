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
import { STAFF_STAT_FIELDS } from "@/lib/analytics/staff-stat-fields";
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

      <AnalyticsKpiGrid
        className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        items={[
          kpi("Active staff", totals.staffCount, "staffTotal.activeStaff"),
          ...STAFF_STAT_FIELDS.map((f) =>
            kpi(
              `${f.label} (all time)`,
              formatNumber(totals[f.key]),
              `staffTotal.${f.hintId}`
            )
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
        description="Lifetime counts per active staff member from total_statistics. Departed staff (every counter zero in the current statistics period) are excluded."
        rows={data.staffRows}
        exportFilename="staff-total-overview.csv"
        dataHint="staffTotal.table.overview"
        variant="full"
      />

      <StaffLeaderboardPanels
        data={data}
        filePrefix="staff-total"
        hintScope="staffTotal"
        hintSeries={data.messagesPerDay}
        showAllStats
      />
    </div>
  );
}
