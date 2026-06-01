"use client";

import {
  AnalyticsDataTable,
  AnalyticsTable,
} from "@/components/analytics/AnalyticsDataTable";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { formatNumber } from "@/lib/utils";

interface AnalyticsUserCountTableProps {
  title: string;
  rows: { userId: string; count: number }[];
  exportFilename: string;
  countLabel?: string;
  valueKey?: string;
  formatValue?: (n: number) => string;
}

export function AnalyticsUserCountTable({
  title,
  rows,
  exportFilename,
  countLabel = "Count",
  valueKey = "count",
  formatValue = formatNumber,
}: AnalyticsUserCountTableProps) {
  if (!rows.length) return null;

  return (
    <AnalyticsDataTable
      title={title}
      headers={["rank", "userId", valueKey]}
      exportFilename={exportFilename}
      exportRows={rows.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        [valueKey]: r.count,
      }))}
    >
      <AnalyticsTable>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">User</th>
            <th className="px-4 py-2">{countLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.userId} className="border-b border-border/50">
              <td className="px-4 py-2 text-muted">{i + 1}</td>
              <td className="px-4 py-2">
                <DiscordUserChip userId={r.userId} />
              </td>
              <td className="px-4 py-2 font-medium text-white">
                {formatValue(r.count)}
              </td>
            </tr>
          ))}
        </tbody>
      </AnalyticsTable>
    </AnalyticsDataTable>
  );
}
