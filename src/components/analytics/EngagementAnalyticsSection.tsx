"use client";

import { AnalyticsChartCard } from "@/components/analytics/AnalyticsChartCard";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { AnalyticsUserCountTable } from "@/components/analytics/AnalyticsUserCountTable";
import { DailyLineChart } from "@/components/analytics/charts";
import { chartTitleWithPeriod } from "@/lib/analytics/chart-period";
import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import type { AnalyticsRange, EngagementAnalytics } from "@/lib/analytics/types";
import { formatNumber } from "@/lib/utils";

interface EngagementAnalyticsSectionProps {
  data: EngagementAnalytics;
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
}

function MigrationNotice({
  ready,
}: {
  ready: EngagementAnalytics["tablesReady"];
}) {
  const missing: string[] = [];
  if (!ready.memberMessages) missing.push("member messages");
  if (!ready.ticketMessages) missing.push("ticket messages");
  if (!missing.length) return null;
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      <p className="font-medium">Tracking tables not fully deployed</p>
      <p className="mt-1 text-amber-200/80">
        Run{" "}
        <code className="rounded bg-black/30 px-1">
          node scripts/apply-analytics-migration.mjs
        </code>{" "}
        and restart bots so new metrics populate. Missing:{" "}
        {missing.join(", ")}.
      </p>
    </div>
  );
}

export function EngagementAnalyticsSection({
  data,
  range,
  groupBy,
}: EngagementAnalyticsSectionProps) {
  const { kpis, tablesReady } = data;

  return (
    <div className="space-y-6">
      <MigrationNotice ready={tablesReady} />

      <p className="text-sm text-muted">
        Total staff messages count any guild message from users on the staff
        roster (<code className="text-xs">statistics</code>). Staff messages are
        staff replies in channels with an active ticket.
      </p>

      <AnalyticsKpiGrid
        items={[
          {
            label: "Total staff messages",
            value: formatNumber(kpis.totalStaffMessagesInRange),
          },
          {
            label: "Staff messages",
            value: formatNumber(kpis.staffMessagesInRange),
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title={chartTitleWithPeriod("Total staff messages", groupBy)}
          exportHeaders={["date", "messages"]}
          exportFilename={`engagement-total-staff-msgs-${range}.csv`}
          exportRows={data.totalStaffMessagesPerDay.map((r) => ({
            date: r.date,
            messages: r.count,
          }))}
        >
          <DailyLineChart
            data={data.totalStaffMessagesPerDay}
            color="#38bdf8"
          />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={chartTitleWithPeriod("Staff messages (active tickets)", groupBy)}
          exportHeaders={["date", "messages"]}
          exportFilename={`engagement-ticket-staff-msgs-${range}.csv`}
          exportRows={data.staffMessagesPerDay.map((r) => ({
            date: r.date,
            messages: r.count,
          }))}
        >
          <DailyLineChart data={data.staffMessagesPerDay} color="#34d399" />
        </AnalyticsChartCard>
      </div>

      <AnalyticsUserCountTable
        title="Staff by total messages (range)"
        rows={data.topStaffByTotalMessages}
        exportFilename={`engagement-total-staff-by-user-${range}.csv`}
        countLabel="Messages"
      />
    </div>
  );
}
