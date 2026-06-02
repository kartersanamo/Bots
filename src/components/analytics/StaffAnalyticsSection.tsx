"use client";

import {
  AnalyticsDataTable,
  AnalyticsTable,
} from "@/components/analytics/AnalyticsDataTable";
import { AnalyticsChartCard } from "@/components/analytics/AnalyticsChartCard";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { NamedBarChart } from "@/components/analytics/charts";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { useAnalyticsTableRowLimit } from "@/components/analytics/table-row-limit";
import type { StaffAnalytics, StaffLeaderboardRow } from "@/lib/analytics/types";
import { formatNumber } from "@/lib/utils";

interface StaffAnalyticsSectionProps {
  data: StaffAnalytics;
}

function StaffTable({
  title,
  rows,
  filename,
  highlight,
}: {
  title: string;
  rows: StaffLeaderboardRow[];
  filename: string;
  highlight: keyof Pick<
    StaffLeaderboardRow,
    "ticketsClosed" | "messages" | "warnings" | "screenshares"
  >;
}) {
  const labels = {
    ticketsClosed: "Tickets closed",
    messages: "Messages",
    warnings: "Warnings",
    screenshares: "Screenshares",
  };
  const { slice, tableRowLimit } = useAnalyticsTableRowLimit(8);
  const visibleRows = slice(rows);

  return (
    <AnalyticsDataTable
      title={title}
      headers={["userId", highlight]}
      exportFilename={filename}
      exportRows={rows.map((r) => ({
        userId: r.userId,
        [highlight]: r[highlight],
      }))}
      tableRowLimit={tableRowLimit}
    >
      <AnalyticsTable>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">Staff</th>
            <th className="px-4 py-2">{labels[highlight]}</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((r, i) => (
            <tr key={r.userId} className="border-b border-border/50">
              <td className="px-4 py-2 text-muted">{i + 1}</td>
              <td className="px-4 py-2">
                <DiscordUserChip userId={r.userId} />
              </td>
              <td className="px-4 py-2 font-medium text-white">
                {formatNumber(r[highlight])}
              </td>
            </tr>
          ))}
        </tbody>
      </AnalyticsTable>
    </AnalyticsDataTable>
  );
}

export function StaffAnalyticsSection({ data }: StaffAnalyticsSectionProps) {
  const { totals } = data;
  const duplicatesLimit = useAnalyticsTableRowLimit(8);
  const visibleDuplicates = duplicatesLimit.slice(data.duplicateStatisticsUsers);
  const activityBars = data.leaderboard.slice(0, 12).map((r) => ({
    name: r.userId.slice(-6),
    count: r.ticketsClosed + r.messages + r.warnings + r.screenshares,
  }));

  return (
    <div className="space-y-6">
      <AnalyticsKpiGrid
        items={[
          { label: "Staff tracked", value: totals.staffCount },
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
          {
            label: "Strike reports (total)",
            value:
              data.strikeReportsTotal != null
                ? formatNumber(data.strikeReportsTotal)
                : "N/A",
          },
          {
            label: "Duplicate stat rows",
            value: data.duplicateStatisticsUsers.length,
          },
        ]}
      />

      {activityBars.length > 0 && (
        <AnalyticsChartCard
          title="Combined staff activity score (top 12)"
          exportHeaders={["staffSuffix", "score"]}
          exportFilename="staff-activity-score.csv"
          exportRows={activityBars.map((r) => ({
            staffSuffix: r.name,
            score: r.count,
          }))}
        >
          <p className="mb-2 text-xs text-muted">
            Sum of tickets closed + messages + warnings + screenshares from the
            statistics table.
          </p>
          <NamedBarChart data={activityBars} color="#38bdf8" />
        </AnalyticsChartCard>
      )}

      <StaffTable
        title="Leaderboard — tickets closed"
        rows={data.leaderboard}
        filename="staff-leaderboard-tickets.csv"
        highlight="ticketsClosed"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <StaffTable
          title="Leaderboard — messages"
          rows={data.topByMessages}
          filename="staff-leaderboard-messages.csv"
          highlight="messages"
        />
        <StaffTable
          title="Leaderboard — warnings issued"
          rows={data.topByWarnings}
          filename="staff-leaderboard-warnings.csv"
          highlight="warnings"
        />
      </div>

      <StaffTable
        title="Leaderboard — screenshares"
        rows={data.topByScreenshares}
        filename="staff-leaderboard-screenshares.csv"
        highlight="screenshares"
      />

      {data.duplicateStatisticsUsers.length > 0 && (
        <AnalyticsDataTable
          title="Duplicate statistics entries"
          headers={["userId", "count"]}
          exportFilename="staff-statistics-duplicates.csv"
          exportRows={data.duplicateStatisticsUsers.map((r) => ({
            userId: r.userId,
            count: r.count,
          }))}
          tableRowLimit={duplicatesLimit.tableRowLimit}
        >
          <AnalyticsTable>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Rows</th>
              </tr>
            </thead>
            <tbody>
              {visibleDuplicates.map((r) => (
                <tr key={r.userId} className="border-b border-border/50">
                  <td className="px-4 py-2">
                    <DiscordUserChip userId={r.userId} />
                  </td>
                  <td className="px-4 py-2 text-white">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </AnalyticsTable>
        </AnalyticsDataTable>
      )}
    </div>
  );
}
