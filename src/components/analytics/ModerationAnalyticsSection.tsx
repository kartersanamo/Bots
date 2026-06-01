"use client";

import { AnalyticsChartCard } from "@/components/analytics/AnalyticsChartCard";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { DailyLineChart } from "@/components/analytics/charts";
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
          { label: "Active polls", value: kpis.activePolls },
          { label: "Total polls", value: kpis.totalPolls },
        ]}
      />

      <AnalyticsChartCard
        title="Blacklists by expiry date (bucketed)"
        exportHeaders={["date", "count"]}
        exportFilename={`blacklists-${range}.csv`}
        exportRows={data.blacklistsPerDay.map((r) => ({
          date: r.date,
          count: r.count,
        }))}
      >
        <DailyLineChart data={data.blacklistsPerDay} color="#ef4444" />
      </AnalyticsChartCard>
    </div>
  );
}
