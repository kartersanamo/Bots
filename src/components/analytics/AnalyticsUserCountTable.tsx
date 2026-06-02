"use client";

import {
  AnalyticsDataTable,
  AnalyticsTable,
} from "@/components/analytics/AnalyticsDataTable";
import { useAnalyticsTableRowLimit } from "@/components/analytics/table-row-limit";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import type { AnalyticsDataMeta } from "@/lib/analytics/hint";
import { formatNumber } from "@/lib/utils";

interface AnalyticsUserCountTableProps {
  title: string;
  dataHint?: AnalyticsDataMeta | string;
  rows: { userId: string; count: number }[];
  exportFilename: string;
  countLabel?: string;
  valueKey?: string;
  formatValue?: (n: number) => string;
  defaultRowLimit?: number;
}

export function AnalyticsUserCountTable({
  title,
  dataHint,
  rows,
  exportFilename,
  countLabel = "Count",
  valueKey = "count",
  formatValue = formatNumber,
  defaultRowLimit = 8,
}: AnalyticsUserCountTableProps) {
  const { slice, tableRowLimit } = useAnalyticsTableRowLimit(defaultRowLimit);
  const visibleRows = slice(rows);

  if (!rows.length) return null;

  return (
    <AnalyticsDataTable
      title={title}
      dataHint={dataHint}
      headers={["rank", "userId", valueKey]}
      exportFilename={exportFilename}
      exportRows={rows.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        [valueKey]: r.count,
      }))}
      tableRowLimit={tableRowLimit}
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
          {visibleRows.map((r, i) => (
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
