"use client";

import { AnalyticsChartCard } from "@/components/analytics/AnalyticsChartCard";
import { kpi } from "@/components/analytics/bind-metric-hints";
import {
  AnalyticsDataTable,
  AnalyticsTable,
} from "@/components/analytics/AnalyticsDataTable";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { AnalyticsUserCountTable } from "@/components/analytics/AnalyticsUserCountTable";
import {
  DailyLineChart,
  DailyPercentChart,
  DualDailyLineChart,
  NamedBarChart,
} from "@/components/analytics/charts";
import type { DailyCount } from "@/lib/analytics/types";
import { useMemo } from "react";
import { useAnalyticsTableRowLimit } from "@/components/analytics/table-row-limit";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { chartTitleWithPeriod } from "@/lib/analytics/chart-period";
import { formatDurationSeconds } from "@/lib/analytics/format";
import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import type { AnalyticsRange, TicketAnalytics } from "@/lib/analytics/types";
import { formatNumber, formatUnixTimestamp } from "@/lib/utils";
import Link from "next/link";

interface TicketsAnalyticsProps {
  data: TicketAnalytics;
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
}

export function TicketsAnalytics({
  data,
  range,
  groupBy,
}: TicketsAnalyticsProps) {
  const { kpis } = data;
  const closeRatePerDay = useMemo(
    () => computeCloseRatePerDay(data.openedPerDay, data.closedPerDay),
    [data.openedPerDay, data.closedPerDay]
  );
  const closeTimeByTypeLimit = useAnalyticsTableRowLimit(8);
  const mostTicketsOneDayLimit = useAnalyticsTableRowLimit(8);
  const longestOpenLimit = useAnalyticsTableRowLimit(8);

  return (
    <div className="space-y-6">
      <AnalyticsKpiGrid
        items={[
          kpi(
            "Avg tickets / day",
            kpis.avgTicketsPerDay.toFixed(2),
            "tickets.avgPerDay"
          ),
          kpi("Opened in range", kpis.openedInRange, "tickets.openedRange"),
          kpi("Closed in range", kpis.closedInRange, "tickets.closedRange"),
          kpi("Currently open", kpis.openCount, "tickets.openNow"),
          kpi(
            "Avg time between tickets",
            kpis.avgTimeBetweenTicketsSeconds != null
              ? formatDurationSeconds(kpis.avgTimeBetweenTicketsSeconds)
              : "—",
            "tickets.avgBetween",
            {
              subtitle:
                range === "365d" || range === "all"
                  ? "Sampled for long ranges"
                  : undefined,
            }
          ),
          kpi(
            "Longest gap (no ticket)",
            kpis.longestGapSeconds != null
              ? formatDurationSeconds(kpis.longestGapSeconds)
              : "—",
            "tickets.longestGap",
            {
              subtitle:
                range === "365d" || range === "all"
                  ? "Sampled for long ranges"
                  : undefined,
            }
          ),
          kpi(
            "Median time to close",
            kpis.medianCloseSeconds != null
              ? formatDurationSeconds(kpis.medianCloseSeconds)
              : "—",
            "tickets.medianClose"
          ),
          kpi(
            "P90 time to close",
            kpis.p90CloseSeconds != null
              ? formatDurationSeconds(kpis.p90CloseSeconds)
              : "—",
            "tickets.p90Close"
          ),
          kpi(
            "Close rate",
            kpis.closeRatePercent != null ? `${kpis.closeRatePercent}%` : "—",
            "tickets.closeRate"
          ),
          kpi("Net backlog (opened − closed)", kpis.backlogDelta, "tickets.backlog", {
            subtitle: "Positive = queue grew in range",
          }),
          kpi("Transcripts saved", kpis.withTranscriptCount, "tickets.transcripts"),
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title={chartTitleWithPeriod("Tickets opened & closed", groupBy)}
          dataHint="tickets.chart.flow"
          exportHeaders={["date", "opened", "closed"]}
          exportFilename={`tickets-daily-${range}.csv`}
          exportRows={mergeDailyExport(data.openedPerDay, data.closedPerDay)}
        >
          <DualDailyLineChart
            opened={data.openedPerDay}
            closed={data.closedPerDay}
          />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={chartTitleWithPeriod("Opened", groupBy)}
          dataHint="tickets.chart.opened"
          exportHeaders={["date", "count"]}
          exportFilename={`tickets-opened-${range}.csv`}
          exportRows={data.openedPerDay.map((r) => ({
            date: r.date,
            count: r.count,
          }))}
        >
          <DailyLineChart data={data.openedPerDay} />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={chartTitleWithPeriod("Net queue change", groupBy)}
          dataHint="tickets.chart.netQueue"
          exportHeaders={["date", "netChange"]}
          exportFilename={`tickets-net-queue-${range}.csv`}
          exportRows={data.netQueuePerDay.map((r) => ({
            date: r.date,
            netChange: r.count,
          }))}
        >
          <p className="mb-2 text-xs text-muted">
            Positive bars = more opened than closed in that period.
          </p>
          <DailyLineChart data={data.netQueuePerDay} color="#eab308" />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={chartTitleWithPeriod("Close rate", groupBy)}
          dataHint="tickets.chart.closeRate"
          exportHeaders={["date", "opened", "closed", "closeRatePercent"]}
          exportFilename={`tickets-close-rate-${range}.csv`}
          exportRows={closeRatePerDay.map((r) => {
            const opened =
              data.openedPerDay.find((o) => o.date === r.date)?.count ?? 0;
            const closed =
              data.closedPerDay.find((c) => c.date === r.date)?.count ?? 0;
            return {
              date: r.date,
              opened,
              closed,
              closeRatePercent: r.count,
            };
          })}
        >
          <p className="mb-2 text-xs text-muted">
            Closed ÷ opened in the same period. Above 100% means the team closed
            more than arrived (working down backlog).
          </p>
          <DailyPercentChart
            data={closeRatePerDay}
            color="#a78bfa"
            valueLabel="Close rate"
          />
        </AnalyticsChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="By ticket type"
          dataHint="tickets.chart.byType"
          exportHeaders={["type", "count"]}
          exportFilename={`tickets-by-type-${range}.csv`}
          exportRows={data.byType.map((r) => ({ type: r.name, count: r.count }))}
        >
          <NamedBarChart data={data.byType} color="#f97316" />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Closed by type"
          dataHint="tickets.chart.byTypeClosed"
          exportHeaders={["type", "count"]}
          exportFilename={`tickets-closed-by-type-${range}.csv`}
          exportRows={data.byTypeClosed.map((r) => ({
            type: r.name,
            count: r.count,
          }))}
        >
          <NamedBarChart data={data.byTypeClosed} color="#fb923c" />
        </AnalyticsChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="By hour of day — opened (combined)"
          dataHint="tickets.chart.hourOpened"
          exportHeaders={["hour", "totalTickets"]}
          exportFilename={`tickets-by-hour-${range}.csv`}
          exportRows={data.byHour.map((r) => ({
            hour: r.name,
            totalTickets: r.count,
          }))}
        >
          <p className="mb-2 text-xs text-muted">
            Totals at each hour across all days in the selected period (e.g. every
            5am summed together).
          </p>
          <NamedBarChart data={data.byHour} compactLabels />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="By hour of day — closed (combined)"
          dataHint="tickets.chart.hourClosed"
          exportHeaders={["hour", "totalTickets"]}
          exportFilename={`tickets-closed-by-hour-${range}.csv`}
          exportRows={data.byHourClosed.map((r) => ({
            hour: r.name,
            totalTickets: r.count,
          }))}
        >
          <NamedBarChart data={data.byHourClosed} compactLabels color="#22d3ee" />
        </AnalyticsChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="By day of week — opened (combined)"
          dataHint="tickets.chart.dowOpened"
          exportHeaders={["weekday", "totalTickets"]}
          exportFilename={`tickets-by-dow-${range}.csv`}
          exportRows={data.byDayOfWeek.map((r) => ({
            weekday: r.name,
            totalTickets: r.count,
          }))}
        >
          <p className="mb-2 text-xs text-muted">
            Totals for each weekday across the selected period (e.g. all Sundays
            summed together).
          </p>
          <NamedBarChart data={data.byDayOfWeek} color="#10b981" />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="By day of week — closed (combined)"
          dataHint="tickets.chart.dowClosed"
          exportHeaders={["weekday", "totalTickets"]}
          exportFilename={`tickets-closed-by-dow-${range}.csv`}
          exportRows={data.byDayOfWeekClosed.map((r) => ({
            weekday: r.name,
            totalTickets: r.count,
          }))}
        >
          <NamedBarChart data={data.byDayOfWeekClosed} color="#14b8a6" />
        </AnalyticsChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {data.visibilitySplit.length > 0 && (
          <AnalyticsChartCard
            title="Tickets by privacy (opened in range)"
            dataHint="tickets.chart.privacy"
            exportHeaders={["privacy", "count"]}
            exportFilename={`tickets-privacy-${range}.csv`}
            exportRows={data.visibilitySplit.map((r) => ({
              privacy: r.name,
              count: r.count,
            }))}
          >
            <p className="mb-2 text-xs text-muted">
              From the ticket <code className="rounded bg-black/30 px-1">privated</code>{" "}
              column: Admin-only, Management-only, or normal (unprivated) channels.
            </p>
            <NamedBarChart data={data.visibilitySplit} color="#c084fc" />
          </AnalyticsChartCard>
        )}

        {data.topCloseReasons.length > 0 && (
          <AnalyticsChartCard
            title="Top close reasons"
            dataHint="tickets.chart.closeReasons"
            exportHeaders={["reason", "count"]}
            exportFilename={`tickets-close-reasons-${range}.csv`}
            exportRows={data.topCloseReasons.map((r) => ({
              reason: r.name,
              count: r.count,
            }))}
          >
            <NamedBarChart data={data.topCloseReasons} color="#f472b6" />
          </AnalyticsChartCard>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OpenerTable
          title={`Top ticket openers (${range})`}
          dataHint="tickets.table.topOpenersRange"
          rows={data.topOpenersInRange}
          filename={`top-openers-${range}.csv`}
        />
        <OpenerTable
          title="Top ticket openers (all time)"
          dataHint="tickets.table.topOpenersAll"
          rows={data.topOpenersAllTime}
          filename="top-openers-all-time.csv"
        />
      </div>

      <AnalyticsUserCountTable
        title="Top staff — tickets closed (range)"
        dataHint="tickets.table.topStaffClosed"
        rows={data.topClosersInRange}
        exportFilename={`top-closers-${range}.csv`}
        countLabel="Closed"
      />

      {data.closeTimeByType.length > 0 && (
        <AnalyticsDataTable
          title="Median time to close by ticket type"
          dataHint="tickets.table.closeByType"
          headers={["type", "medianSeconds", "count"]}
          exportFilename={`close-time-by-type-${range}.csv`}
          exportRows={data.closeTimeByType.map((r) => ({
            type: r.type,
            medianSeconds: r.medianSeconds,
            count: r.count,
          }))}
          tableRowLimit={closeTimeByTypeLimit.tableRowLimit}
        >
          <AnalyticsTable>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Median close time</th>
                <th className="px-4 py-2">Sample size</th>
              </tr>
            </thead>
            <tbody>
              {closeTimeByTypeLimit.slice(data.closeTimeByType).map((r) => (
                <tr key={r.type} className="border-b border-border/50">
                  <td className="px-4 py-2 text-white">{r.type}</td>
                  <td className="px-4 py-2 text-white">
                    {formatDurationSeconds(r.medianSeconds)}
                  </td>
                  <td className="px-4 py-2 text-muted">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </AnalyticsTable>
        </AnalyticsDataTable>
      )}

      <AnalyticsDataTable
        title="Most tickets opened in a single day"
        dataHint="tickets.table.mostOneDay"
        headers={["ownerId", "date", "count"]}
        exportFilename={`most-tickets-one-day.csv`}
        exportRows={data.mostTicketsInOneDay.map((r) => ({
          ownerId: r.ownerId,
          date: r.date,
          count: r.count,
        }))}
        tableRowLimit={mostTicketsOneDayLimit.tableRowLimit}
      >
        <AnalyticsTable>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Tickets</th>
            </tr>
          </thead>
          <tbody>
            {mostTicketsOneDayLimit.slice(data.mostTicketsInOneDay).map((r, i) => (
              <tr key={`${r.ownerId}-${r.date}`} className="border-b border-border/50">
                <td className="px-4 py-2 text-muted">{i + 1}</td>
                <td className="px-4 py-2">
                  <DiscordUserChip userId={r.ownerId} />
                </td>
                <td className="px-4 py-2 text-white">{r.date}</td>
                <td className="px-4 py-2 font-medium text-white">
                  {formatNumber(r.count)}
                </td>
              </tr>
            ))}
          </tbody>
        </AnalyticsTable>
      </AnalyticsDataTable>

      <AnalyticsDataTable
        title="Top 5 longest open tickets"
        dataHint="tickets.table.longestOpen"
        headers={[
          "channelId",
          "ownerId",
          "type",
          "number",
          "durationSeconds",
        ]}
        exportFilename="longest-open-tickets.csv"
        exportRows={data.longestOpenTickets.map((r) => ({
          channelId: r.channelId,
          ownerId: r.ownerId,
          type: r.type,
          number: r.number,
          durationSeconds: r.durationSeconds,
        }))}
        tableRowLimit={longestOpenLimit.tableRowLimit}
      >
        <AnalyticsTable>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Owner</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Duration</th>
              <th className="px-4 py-2">Ticket</th>
            </tr>
          </thead>
          <tbody>
            {longestOpenLimit.slice(data.longestOpenTickets).map((r, i) => (
              <tr key={r.channelId} className="border-b border-border/50">
                <td className="px-4 py-2 text-muted">{i + 1}</td>
                <td className="px-4 py-2">
                  <DiscordUserChip userId={r.ownerId} />
                </td>
                <td className="px-4 py-2 text-white">{r.type}</td>
                <td className="px-4 py-2 text-white">
                  {formatDurationSeconds(r.durationSeconds)}
                </td>
                <td className="px-4 py-2">
                  <Link
                    href="/dashboard/tickets"
                    className="text-accent hover:underline"
                  >
                    #{r.number}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </AnalyticsTable>
      </AnalyticsDataTable>

      {data.longestGap && (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm">
          <h3 className="font-medium text-white">Longest gap without a ticket</h3>
          <p className="mt-2 text-muted">
            {formatDurationSeconds(data.longestGap.gapSeconds)} between tickets
          </p>
          <ul className="mt-2 space-y-1 text-white">
            <li>
              Previous: channel {data.longestGap.previousChannelId} · opened{" "}
              {formatUnixTimestamp(data.longestGap.previousOpenedAt)}
            </li>
            <li>
              Next: channel {data.longestGap.currentChannelId} · opened{" "}
              {formatUnixTimestamp(data.longestGap.currentOpenedAt)}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function OpenerTable({
  title,
  dataHint,
  rows,
  filename,
}: {
  title: string;
  dataHint: string;
  rows: { ownerId: string; count: number }[];
  filename: string;
}) {
  const { slice, tableRowLimit } = useAnalyticsTableRowLimit(8);
  const visibleRows = slice(rows);

  return (
    <AnalyticsDataTable
      title={title}
      dataHint={dataHint}
      headers={["rank", "ownerId", "tickets"]}
      exportFilename={filename}
      exportRows={rows.map((r, i) => ({
        rank: i + 1,
        ownerId: r.ownerId,
        tickets: r.count,
      }))}
      tableRowLimit={tableRowLimit}
    >
      <AnalyticsTable>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">User</th>
            <th className="px-4 py-2">Tickets</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((r, i) => (
            <tr key={r.ownerId} className="border-b border-border/50">
              <td className="px-4 py-2 text-muted">{i + 1}</td>
              <td className="px-4 py-2">
                <DiscordUserChip userId={r.ownerId} />
              </td>
              <td className="px-4 py-2 font-medium text-white">
                {formatNumber(r.count)}
              </td>
            </tr>
          ))}
        </tbody>
      </AnalyticsTable>
    </AnalyticsDataTable>
  );
}

function computeCloseRatePerDay(
  opened: DailyCount[],
  closed: DailyCount[]
): DailyCount[] {
  const map = new Map<string, { opened: number; closed: number }>();
  for (const r of opened) {
    map.set(r.date, { opened: r.count, closed: 0 });
  }
  for (const r of closed) {
    const cur = map.get(r.date) ?? { opened: 0, closed: 0 };
    cur.closed = r.count;
    map.set(r.date, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { opened: o, closed: c }]) => ({
      date,
      count:
        o > 0
          ? Math.round((c / o) * 1000) / 10
          : c > 0
            ? 100
            : 0,
    }));
}

function mergeDailyExport(
  opened: { date: string; count: number }[],
  closed: { date: string; count: number }[]
): Record<string, unknown>[] {
  const map = new Map<string, { date: string; opened: number; closed: number }>();
  for (const r of opened) {
    map.set(r.date, { date: r.date, opened: r.count, closed: 0 });
  }
  for (const r of closed) {
    const cur = map.get(r.date) ?? { date: r.date, opened: 0, closed: 0 };
    cur.closed = r.count;
    map.set(r.date, cur);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}
