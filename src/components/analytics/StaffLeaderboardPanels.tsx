"use client";

import {
  AnalyticsDataTable,
  AnalyticsTable,
} from "@/components/analytics/AnalyticsDataTable";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { useAnalyticsTableRowLimit } from "@/components/analytics/table-row-limit";
import type { StaffLeaderboardRow } from "@/lib/analytics/types";
import { formatNumber } from "@/lib/utils";

export function staffActivityTotal(r: StaffLeaderboardRow): number {
  return r.ticketsClosed + r.messages + r.warnings + r.screenshares;
}

function StaffTable({
  title,
  rows,
  filename,
  highlight,
  dataHint,
}: {
  title: string;
  rows: StaffLeaderboardRow[];
  filename: string;
  highlight: keyof Pick<
    StaffLeaderboardRow,
    "ticketsClosed" | "messages" | "warnings" | "screenshares"
  >;
  dataHint: string;
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
      dataHint={dataHint}
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

export function StaffOverviewTable({
  title,
  description,
  rows,
  exportFilename,
  dataHint,
}: {
  title: string;
  description: string;
  rows: StaffLeaderboardRow[];
  exportFilename: string;
  dataHint: string;
}) {
  const overviewLimit = useAnalyticsTableRowLimit(12);
  const overviewRows = [...rows]
    .sort((a, b) => staffActivityTotal(b) - staffActivityTotal(a))
    .slice(0, 12);
  const visibleOverview = overviewLimit.slice(overviewRows);

  if (overviewRows.length === 0) return null;

  return (
    <AnalyticsDataTable
      title={title}
      dataHint={dataHint}
      headers={[
        "userId",
        "ticketsClosed",
        "messages",
        "warnings",
        "screenshares",
        "total",
      ]}
      exportFilename={exportFilename}
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
      <p className="px-4 pt-3 text-xs text-muted">{description}</p>
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
  );
}

export function StaffLeaderboardPanels({
  data,
  filePrefix,
  hintScope,
}: {
  data: {
    leaderboard: StaffLeaderboardRow[];
    topByMessages: StaffLeaderboardRow[];
    topByWarnings: StaffLeaderboardRow[];
    topByScreenshares: StaffLeaderboardRow[];
  };
  filePrefix: string;
  hintScope: "staffRecent" | "staffTotal";
}) {
  const leaderboardHints = {
    ticketsClosed: `${hintScope}.leaderboard.tickets`,
    messages: `${hintScope}.leaderboard.messages`,
    warnings: `${hintScope}.leaderboard.warnings`,
    screenshares: `${hintScope}.leaderboard.screenshares`,
  } as const;

  return (
    <>
      <StaffTable
        title="Leaderboard — tickets closed"
        rows={data.leaderboard}
        filename={`${filePrefix}-leaderboard-tickets.csv`}
        highlight="ticketsClosed"
        dataHint={leaderboardHints.ticketsClosed}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <StaffTable
          title="Leaderboard — messages"
          rows={data.topByMessages}
          filename={`${filePrefix}-leaderboard-messages.csv`}
          highlight="messages"
          dataHint={leaderboardHints.messages}
        />
        <StaffTable
          title="Leaderboard — warnings issued"
          rows={data.topByWarnings}
          filename={`${filePrefix}-leaderboard-warnings.csv`}
          highlight="warnings"
          dataHint={leaderboardHints.warnings}
        />
      </div>
      <StaffTable
        title="Leaderboard — screenshares"
        rows={data.topByScreenshares}
        filename={`${filePrefix}-leaderboard-screenshares.csv`}
        highlight="screenshares"
        dataHint={leaderboardHints.screenshares}
      />
    </>
  );
}
