"use client";

import {
  AnalyticsDataTable,
  AnalyticsTable,
} from "@/components/analytics/AnalyticsDataTable";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
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

function staffActivityTotal(r: StaffLeaderboardRow): number {
  return r.ticketsClosed + r.messages + r.warnings + r.screenshares;
}

export function StaffAnalyticsSection({ data }: StaffAnalyticsSectionProps) {
  const { totals, totalsPeriod, totalsAllTime } = data;
  const overviewLimit = useAnalyticsTableRowLimit(12);
  const overviewRows = [...data.leaderboard]
    .sort((a, b) => staffActivityTotal(b) - staffActivityTotal(a))
    .slice(0, 12);
  const visibleOverview = overviewLimit.slice(overviewRows);

  return (
    <div className="space-y-6">
      <AnalyticsKpiGrid
        items={[
          { label: "Staff tracked", value: totals.staffCount },
          {
            label: "Tickets closed (period)",
            value: formatNumber(totalsPeriod.ticketsClosed),
          },
          {
            label: "Tickets closed (all time)",
            value: formatNumber(
              totalsAllTime?.ticketsClosed ?? totals.ticketsClosed
            ),
          },
          {
            label: "Messages (period)",
            value: formatNumber(totalsPeriod.messages),
          },
          {
            label: "Messages (all time)",
            value: formatNumber(totalsAllTime?.messages ?? totals.messages),
          },
          {
            label: "Warnings (all time)",
            value: formatNumber(totalsAllTime?.warnings ?? totals.warnings),
          },
          {
            label: "Screenshares (all time)",
            value: formatNumber(
              totalsAllTime?.screenshares ?? totals.screenshares
            ),
          },
          {
            label: "Strike reports (total)",
            value:
              data.strikeReportsTotal != null
                ? formatNumber(data.strikeReportsTotal)
                : "N/A",
          },
        ]}
      />

      {overviewRows.length > 0 && (
        <AnalyticsDataTable
          title="All-time activity by staff"
          headers={[
            "userId",
            "ticketsClosed",
            "messages",
            "warnings",
            "screenshares",
            "total",
          ]}
          exportFilename="staff-all-time-overview.csv"
          exportRows={overviewRows.map((r) => ({
            userId: r.userId,
            ticketsClosed: r.ticketsClosed,
            messages: r.messages,
            warnings: r.warnings,
            screenshares: r.screenshares,
            total: staffActivityTotal(r),
          }))}
          tableRowLimit={overviewLimit.tableRowLimit}
        >
          <p className="px-4 pt-3 text-xs text-muted">
            Lifetime counts per active staff member from{" "}
            <code className="text-[11px]">total_statistics</code> (not reset by
            /wipe). Staff with all zeros in the current{" "}
            <code className="text-[11px]">statistics</code> period are excluded
            (departed).
          </p>
          <AnalyticsTable>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Staff</th>
                <th className="px-4 py-2">Tickets</th>
                <th className="px-4 py-2">Messages</th>
                <th className="px-4 py-2">Warnings</th>
                <th className="px-4 py-2">Screenshares</th>
                <th className="px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {visibleOverview.map((r, i) => (
                <tr key={r.userId} className="border-b border-border/50">
                  <td className="px-4 py-2 text-muted">{i + 1}</td>
                  <td className="px-4 py-2">
                    <DiscordUserChip userId={r.userId} />
                  </td>
                  <td className="px-4 py-2">{formatNumber(r.ticketsClosed)}</td>
                  <td className="px-4 py-2">{formatNumber(r.messages)}</td>
                  <td className="px-4 py-2">{formatNumber(r.warnings)}</td>
                  <td className="px-4 py-2">{formatNumber(r.screenshares)}</td>
                  <td className="px-4 py-2 font-medium text-white">
                    {formatNumber(staffActivityTotal(r))}
                  </td>
                </tr>
              ))}
            </tbody>
          </AnalyticsTable>
        </AnalyticsDataTable>
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
    </div>
  );
}
