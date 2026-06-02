"use client";

import {
  AnalyticsDataTable,
  AnalyticsTable,
} from "@/components/analytics/AnalyticsDataTable";
import { AnalyticsChartCard } from "@/components/analytics/AnalyticsChartCard";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { AnalyticsUserCountTable } from "@/components/analytics/AnalyticsUserCountTable";
import { DailyLineChart } from "@/components/analytics/charts";
import { useAnalyticsTableRowLimit } from "@/components/analytics/table-row-limit";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { cn, formatUnixTimestamp } from "@/lib/utils";
import { chartTitleWithPeriod } from "@/lib/analytics/chart-period";
import { formatDurationSeconds } from "@/lib/analytics/format";
import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import type { AnalyticsRange, EngagementAnalytics } from "@/lib/analytics/types";
import { formatNumber } from "@/lib/utils";

interface EngagementAnalyticsSectionProps {
  data: EngagementAnalytics;
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
}

function MigrationNotice({
  ready,
}: {
  ready: EngagementAnalytics["tablesReady"];
}) {
  const missing: string[] = [];
  if (!ready.memberMessages) missing.push("member messages");
  if (!ready.ticketMessages) missing.push("ticket messages");
  if (!ready.games) missing.push("games");
  if (!ready.voice) missing.push("voice");
  if (!ready.memberEvents) missing.push("member events");
  if (!missing.length) return null;
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      <p className="font-medium">Tracking tables not fully deployed</p>
      <p className="mt-1 text-amber-200/80">
        Run{" "}
        <code className="rounded bg-black/30 px-1">
          node scripts/apply-analytics-migration.mjs
        </code>{" "}
        and restart bots so new metrics populate. Missing:{" "}
        {missing.join(", ")}.
      </p>
    </div>
  );
}

export function EngagementAnalyticsSection({
  data,
  range,
  groupBy,
}: EngagementAnalyticsSectionProps) {
  const { kpis, tablesReady } = data;
  const joinLeavesLimit = useAnalyticsTableRowLimit(25);

  return (
    <div className="space-y-6">
      <MigrationNotice ready={tablesReady} />

      <p className="text-sm text-muted">
        Total staff messages count any guild message from users on the staff
        roster (<code className="text-xs">statistics</code>). Staff messages are
        staff replies in channels with an active ticket. Total games are rows in
        the <code className="text-xs">games</code> table (test sessions excluded).
        Voice time updates about every 30 seconds while you are connected.
      </p>

      <AnalyticsKpiGrid
        items={[
          {
            label: "Total staff messages",
            value: formatNumber(kpis.totalStaffMessagesInRange),
          },
          {
            label: "Staff messages",
            value: formatNumber(kpis.staffMessagesInRange),
          },
          {
            label: "Total games",
            value: formatNumber(kpis.totalGamesInRange),
          },
          {
            label: "Voice time",
            value: formatDurationSeconds(kpis.voiceSecondsInRange),
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title={chartTitleWithPeriod("Total staff messages", groupBy)}
          exportHeaders={["date", "messages"]}
          exportFilename={`engagement-total-staff-msgs-${range}.csv`}
          exportRows={data.totalStaffMessagesPerDay.map((r) => ({
            date: r.date,
            messages: r.count,
          }))}
        >
          <DailyLineChart
            data={data.totalStaffMessagesPerDay}
            color="#38bdf8"
          />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={chartTitleWithPeriod("Staff messages (active tickets)", groupBy)}
          exportHeaders={["date", "messages"]}
          exportFilename={`engagement-ticket-staff-msgs-${range}.csv`}
          exportRows={data.staffMessagesPerDay.map((r) => ({
            date: r.date,
            messages: r.count,
          }))}
        >
          <DailyLineChart data={data.staffMessagesPerDay} color="#34d399" />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={chartTitleWithPeriod("Total games", groupBy)}
          exportHeaders={["date", "games"]}
          exportFilename={`engagement-total-games-${range}.csv`}
          exportRows={data.totalGamesPerDay.map((r) => ({
            date: r.date,
            games: r.count,
          }))}
        >
          <DailyLineChart data={data.totalGamesPerDay} color="#fb923c" />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={chartTitleWithPeriod("Voice time", groupBy)}
          exportHeaders={["date", "seconds"]}
          exportFilename={`engagement-voice-${range}.csv`}
          exportRows={data.voiceSecondsPerDay.map((r) => ({
            date: r.date,
            seconds: r.count,
          }))}
        >
          <DailyLineChart data={data.voiceSecondsPerDay} color="#2dd4bf" />
        </AnalyticsChartCard>
      </div>

      {data.topVoiceUsers.length > 0 && (
        <AnalyticsUserCountTable
          title="Top voice users (range)"
          rows={data.topVoiceUsers}
          exportFilename={`engagement-voice-users-${range}.csv`}
          countLabel="Time"
          formatValue={(n) => formatDurationSeconds(n)}
        />
      )}

      <AnalyticsUserCountTable
        title="Staff by total messages (range)"
        rows={data.topStaffByTotalMessages}
        exportFilename={`engagement-total-staff-by-user-${range}.csv`}
        countLabel="Messages"
      />

      {data.recentJoinLeaves.length > 0 && (
        <AnalyticsDataTable
          title="Recent join / leaves"
          headers={[
            "event",
            "userId",
            "when",
            "inviteCode",
            "accountAgeDays",
          ]}
          exportFilename={`engagement-join-leaves-${range}.csv`}
          exportRows={data.recentJoinLeaves.map((r) => ({
            event: r.eventType,
            userId: r.userId,
            when: r.createdAt,
            inviteCode: r.inviteCode ?? "",
            accountAgeDays: r.accountAgeDays ?? "",
          }))}
          tableRowLimit={joinLeavesLimit.tableRowLimit}
        >
          <AnalyticsTable>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Member</th>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Invite</th>
                <th className="px-4 py-2">Account age</th>
              </tr>
            </thead>
            <tbody>
              {joinLeavesLimit.slice(data.recentJoinLeaves).map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-4 py-2">
                    <span
                      className={cn(
                        "inline-flex rounded px-2 py-0.5 text-xs font-medium",
                        r.eventType === "join"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-red-500/15 text-red-300"
                      )}
                    >
                      {r.eventType === "join" ? "Joined" : "Left"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <DiscordUserChip userId={r.userId} />
                  </td>
                  <td className="px-4 py-2 text-muted whitespace-nowrap">
                    {formatUnixTimestamp(r.createdAt)}
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {r.inviteCode ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {r.accountAgeDays != null
                      ? `${r.accountAgeDays}d`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </AnalyticsTable>
        </AnalyticsDataTable>
      )}
    </div>
  );
}
