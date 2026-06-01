"use client";

import {
  AnalyticsDataTable,
  AnalyticsTable,
} from "@/components/analytics/AnalyticsDataTable";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import type { StaffAnalytics } from "@/lib/analytics/types";
import { formatNumber } from "@/lib/utils";

interface StaffAnalyticsSectionProps {
  data: StaffAnalytics;
}

export function StaffAnalyticsSection({ data }: StaffAnalyticsSectionProps) {
  return (
    <div className="space-y-6">
      <AnalyticsKpiGrid
        items={[
          {
            label: "Strike reports (total)",
            value:
              data.strikeReportsTotal != null
                ? formatNumber(data.strikeReportsTotal)
                : "N/A",
          },
          {
            label: "Duplicate statistics rows",
            value: data.duplicateStatisticsUsers.length,
          },
        ]}
      />

      <AnalyticsDataTable
        title="Staff leaderboard (tickets closed)"
        headers={[
          "userId",
          "ticketsClosed",
          "messages",
          "warnings",
          "screenshares",
        ]}
        exportFilename="staff-leaderboard.csv"
        exportRows={data.leaderboard.map((r) => ({
          userId: r.userId,
          ticketsClosed: r.ticketsClosed,
          messages: r.messages,
          warnings: r.warnings,
          screenshares: r.screenshares,
        }))}
      >
        <AnalyticsTable>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Staff</th>
              <th className="px-4 py-2">Tickets closed</th>
              <th className="px-4 py-2">Messages</th>
              <th className="px-4 py-2">Warnings</th>
              <th className="px-4 py-2">Screenshares</th>
            </tr>
          </thead>
          <tbody>
            {data.leaderboard.map((r, i) => (
              <tr key={r.userId} className="border-b border-border/50">
                <td className="px-4 py-2 text-muted">{i + 1}</td>
                <td className="px-4 py-2">
                  <DiscordUserChip userId={r.userId} />
                </td>
                <td className="px-4 py-2 text-white">
                  {formatNumber(r.ticketsClosed)}
                </td>
                <td className="px-4 py-2 text-white">
                  {formatNumber(r.messages)}
                </td>
                <td className="px-4 py-2 text-white">
                  {formatNumber(r.warnings)}
                </td>
                <td className="px-4 py-2 text-white">
                  {formatNumber(r.screenshares)}
                </td>
              </tr>
            ))}
          </tbody>
        </AnalyticsTable>
      </AnalyticsDataTable>

      {data.duplicateStatisticsUsers.length > 0 && (
        <AnalyticsDataTable
          title="Duplicate statistics entries"
          headers={["userId", "count"]}
          exportFilename="staff-statistics-duplicates.csv"
          exportRows={data.duplicateStatisticsUsers.map((r) => ({
            userId: r.userId,
            count: r.count,
          }))}
        >
          <AnalyticsTable>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Rows</th>
              </tr>
            </thead>
            <tbody>
              {data.duplicateStatisticsUsers.map((r) => (
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
