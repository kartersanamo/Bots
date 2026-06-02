"use client";

import { AnalyticsChartCard } from "@/components/analytics/AnalyticsChartCard";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { AnalyticsUserCountTable } from "@/components/analytics/AnalyticsUserCountTable";
import { DailyLineChart, NamedBarChart } from "@/components/analytics/charts";
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

  return (
    <div className="space-y-6">
      <AnalyticsKpiGrid
        items={[
          { label: "Active bans", value: kpis.activeBans },
          { label: "Blacklist entries", value: kpis.totalBlacklists },
          {
            label: "Blacklists with expiry",
            value: kpis.blacklistsWithExpiry,
          },
          { label: "Media entries", value: kpis.mediaEntries },
        ]}
      />

      <div className="grid gap-4">
        <AnalyticsChartCard
          title="Blacklist expirations by date"
          exportHeaders={["date", "count"]}
          exportFilename={`blacklists-expiry-${range}.csv`}
          exportRows={data.blacklistsPerDay.map((r) => ({
            date: r.date,
            count: r.count,
          }))}
        >
          <p className="mb-2 text-xs text-muted">
            Buckets by scheduled unblacklist time (whenToUnbl), not necessarily
            when the entry was created.
          </p>
          <DailyLineChart data={data.blacklistsPerDay} color="#ef4444" />
        </AnalyticsChartCard>
      </div>

      {data.blacklistsByStaff.length > 0 && (
        <>
          <AnalyticsUserCountTable
            title="Blacklists by staff member"
            rows={data.blacklistsByStaff}
            exportFilename="blacklists-by-staff.csv"
            countLabel="Entries"
          />
          <AnalyticsChartCard
            title="Blacklists issued by staff"
            exportHeaders={["staffId", "count"]}
            exportFilename="blacklists-by-staff-chart.csv"
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
        </>
      )}
    </div>
  );
}
