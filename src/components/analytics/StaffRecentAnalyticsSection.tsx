"use client";

import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { kpi } from "@/components/analytics/bind-metric-hints";
import {
  StaffLeaderboardPanels,
  StaffOverviewTable,
} from "@/components/analytics/StaffLeaderboardPanels";
import type { StaffRecentAnalytics } from "@/lib/analytics/types";
import { formatNumber } from "@/lib/utils";

function formatWipeDate(unix: number | null): string {
  if (unix == null) return "Unknown (not recorded yet)";
  return new Date(unix * 1000).toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  });
}

export function StaffRecentAnalyticsSection({
  data,
}: {
  data: StaffRecentAnalytics;
}) {
  const { totals } = data;

  return (
    <div className="space-y-6">
      <div
        role="alert"
        className="rounded-lg border-2 border-amber-500/50 bg-amber-500/10 px-5 py-4"
      >
        <p className="text-base font-semibold text-amber-100">
          Manager tracking only — resets frequently
        </p>
        <p className="mt-2 text-sm leading-relaxed text-amber-100/90">
          These numbers come from the current{" "}
          <code className="rounded bg-black/20 px-1 text-xs">statistics</code>{" "}
          period. A manager runs <strong>/wipe</strong>  on MinecadiaStaff about
          every two weeks, which clears everyone&apos;s period counters to zero.
          Do not use this tab for long-term or historical reporting — use{" "}
          <strong>Staff (Total)</strong> instead.
        </p>
        <p className="mt-3 text-sm font-medium text-amber-50">
          Last statistics wipe: {formatWipeDate(data.lastWipedAt)}
        </p>
      </div>

      <AnalyticsKpiGrid
        items={[
          kpi("Active staff (period)", totals.staffCount, "staffRecent.activeStaff"),
          kpi(
            "Tickets closed (this period)",
            formatNumber(totals.ticketsClosed),
            "staffRecent.tickets"
          ),
          kpi(
            "Messages (this period)",
            formatNumber(totals.messages),
            "staffRecent.messages"
          ),
          kpi(
            "Warnings (this period)",
            formatNumber(totals.warnings),
            "staffRecent.warnings"
          ),
          kpi(
            "Screenshares (this period)",
            formatNumber(totals.screenshares),
            "staffRecent.screenshares"
          ),
          kpi(
            "Strike reports (total)",
            data.strikeReportsTotal != null
              ? formatNumber(data.strikeReportsTotal)
              : "N/A",
            "staffRecent.strikes",
            { subtitle: "All-time table; not reset by /wipe" }
          ),
        ]}
      />

      <StaffOverviewTable
        title="Current period by staff"
        description="Counts since the last /wipe from the statistics table. Departed staff (all zeros in statistics) are excluded."
        rows={data.leaderboard}
        exportFilename="staff-recent-overview.csv"
        dataHint="staffRecent.table.overview"
      />

      <StaffLeaderboardPanels
        data={data}
        filePrefix="staff-recent"
        hintScope="staffRecent"
      />
    </div>
  );
}
