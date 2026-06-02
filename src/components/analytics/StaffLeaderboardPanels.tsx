"use client";

import { chartHint } from "@/components/analytics/bind-metric-hints";
import {
  AnalyticsDataTable,
  AnalyticsTable,
} from "@/components/analytics/AnalyticsDataTable";
import type { AnalyticsDataMeta } from "@/lib/analytics/hint";
import {
  STAFF_STAT_FIELDS,
  staffActivityTotal,
  type StaffStatKey,
} from "@/lib/analytics/staff-stat-fields";
import type { DailyCount, StaffLeaderboardRow } from "@/lib/analytics/types";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { useAnalyticsTableRowLimit } from "@/components/analytics/table-row-limit";
import { formatNumber } from "@/lib/utils";

export { staffActivityTotal };

function StaffTable({
  title,
  rows,
  filename,
  statKey,
  label,
  dataHint,
}: {
  title: string;
  rows: StaffLeaderboardRow[];
  filename: string;
  statKey: StaffStatKey;
  label: string;
  dataHint: AnalyticsDataMeta | string;
}) {
  const { slice, tableRowLimit } = useAnalyticsTableRowLimit(8);
  const visibleRows = slice(rows);

  if (!rows.length) return null;

  return (
    <AnalyticsDataTable
      title={title}
      dataHint={dataHint}
      headers={["userId", statKey]}
      exportFilename={filename}
      exportRows={rows.map((r) => ({
        userId: r.userId,
        [statKey]: r[statKey],
      }))}
      tableRowLimit={tableRowLimit}
    >
      <AnalyticsTable>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">Staff</th>
            <th className="px-4 py-2">{label}</th>
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
                {formatNumber(r[statKey])}
              </td>
            </tr>
          ))}
        </tbody>
      </AnalyticsTable>
    </AnalyticsDataTable>
  );
}

export function StaffOverviewTable({
  title,
  description,
  rows,
  exportFilename,
  dataHint,
  variant = "compact",
}: {
  title: string;
  description: string;
  rows: StaffLeaderboardRow[];
  exportFilename: string;
  dataHint: AnalyticsDataMeta | string;
  variant?: "compact" | "full";
}) {
  const overviewLimit = useAnalyticsTableRowLimit(variant === "full" ? 15 : 12);
  const fields =
    variant === "full"
      ? STAFF_STAT_FIELDS
      : STAFF_STAT_FIELDS.filter((f) =>
          ["ticketsClosed", "messages", "warnings", "screenshares"].includes(
            f.key
          )
        );

  const overviewRows = [...rows]
    .sort((a, b) => staffActivityTotal(b) - staffActivityTotal(a))
    .slice(0, variant === "full" ? 15 : 12);
  const visibleOverview = overviewLimit.slice(overviewRows);

  if (overviewRows.length === 0) return null;

  const headers = ["userId", ...fields.map((f) => f.key), "total"];
  const exportRows = overviewRows.map((r) => {
    const row: Record<string, string | number> = {
      userId: r.userId,
      total: staffActivityTotal(r),
    };
    for (const f of fields) {
      row[f.key] = r[f.key];
    }
    return row;
  });

  return (
    <AnalyticsDataTable
      title={title}
      dataHint={dataHint}
      headers={headers}
      exportFilename={exportFilename}
      exportRows={exportRows}
      tableRowLimit={overviewLimit.tableRowLimit}
    >
      <p className="px-4 pt-3 text-xs text-muted">{description}</p>
      <div className="overflow-x-auto">
        <AnalyticsTable>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="sticky left-0 z-10 bg-surface px-4 py-2">#</th>
              <th className="sticky left-8 z-10 bg-surface px-4 py-2 whitespace-nowrap">
                Staff
              </th>
              {fields.map((f) => (
                <th key={f.key} className="px-3 py-2 whitespace-nowrap">
                  {f.label}
                </th>
              ))}
              <th className="px-4 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {visibleOverview.map((r, i) => (
              <tr key={r.userId} className="border-b border-border/50">
                <td className="sticky left-0 z-10 bg-surface px-4 py-2 text-muted">
                  {i + 1}
                </td>
                <td className="sticky left-8 z-10 bg-surface px-4 py-2 whitespace-nowrap">
                  <DiscordUserChip userId={r.userId} />
                </td>
                {fields.map((f) => (
                  <td key={f.key} className="px-3 py-2 text-muted">
                    {formatNumber(r[f.key])}
                  </td>
                ))}
                <td className="px-4 py-2 font-medium text-white">
                  {formatNumber(staffActivityTotal(r))}
                </td>
              </tr>
            ))}
          </tbody>
        </AnalyticsTable>
      </div>
    </AnalyticsDataTable>
  );
}

const COMPACT_LEADERBOARD_KEYS: StaffStatKey[] = [
  "ticketsClosed",
  "messages",
  "warnings",
  "screenshares",
];

export function StaffLeaderboardPanels({
  data,
  filePrefix,
  hintScope,
  hintSeries,
  showAllStats = false,
}: {
  data: {
    leaderboard: StaffLeaderboardRow[];
    topsByStat: Record<StaffStatKey, StaffLeaderboardRow[]>;
    topByMessages: StaffLeaderboardRow[];
    topByWarnings: StaffLeaderboardRow[];
    topByScreenshares: StaffLeaderboardRow[];
  };
  filePrefix: string;
  hintScope: "staffRecent" | "staffTotal";
  hintSeries?: DailyCount[];
  showAllStats?: boolean;
}) {
  const statFields = showAllStats
    ? STAFF_STAT_FIELDS
    : STAFF_STAT_FIELDS.filter((f) => COMPACT_LEADERBOARD_KEYS.includes(f.key));

  const hint = (hintId: string) =>
    hintSeries
      ? chartHint(`${hintScope}.leaderboard.${hintId}`, hintSeries)
      : `${hintScope}.leaderboard.${hintId}`;

  if (showAllStats) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {statFields.map((f) => (
          <StaffTable
            key={f.key}
            title={`Leaderboard — ${f.label.toLowerCase()}`}
            rows={data.topsByStat[f.key]}
            filename={`${filePrefix}-leaderboard-${f.hintId}.csv`}
            statKey={f.key}
            label={f.label}
            dataHint={hint(f.hintId)}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <StaffTable
        title="Leaderboard — tickets closed"
        rows={data.leaderboard}
        filename={`${filePrefix}-leaderboard-tickets.csv`}
        statKey="ticketsClosed"
        label="Tickets closed"
        dataHint={hint("tickets")}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <StaffTable
          title="Leaderboard — messages"
          rows={data.topByMessages}
          filename={`${filePrefix}-leaderboard-messages.csv`}
          statKey="messages"
          label="Messages"
          dataHint={hint("messages")}
        />
        <StaffTable
          title="Leaderboard — warnings issued"
          rows={data.topByWarnings}
          filename={`${filePrefix}-leaderboard-warnings.csv`}
          statKey="warnings"
          label="Warnings"
          dataHint={hint("warnings")}
        />
      </div>
      <StaffTable
        title="Leaderboard — screenshares"
        rows={data.topByScreenshares}
        filename={`${filePrefix}-leaderboard-screenshares.csv`}
        statKey="screenshares"
        label="Screenshares"
        dataHint={hint("screenshares")}
      />
    </>
  );
}
