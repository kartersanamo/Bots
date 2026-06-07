"use client";

import {
  AnalyticsDataTable,
  AnalyticsTable,
} from "@/components/analytics/AnalyticsDataTable";
import { AnalyticsChartCard } from "@/components/analytics/AnalyticsChartCard";
import {
  chartHint,
  chartHintFromTimestamps,
  kpi,
} from "@/components/analytics/bind-metric-hints";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { MemberMessagesBackfillBanner } from "@/components/analytics/MemberMessagesBackfillBanner";
import { AnalyticsUserCountTable } from "@/components/analytics/AnalyticsUserCountTable";
import {
  DailyLineChart,
  DailyPercentChart,
  DualDailyLineChart,
  DualNamedBarChart,
  NamedBarChart,
} from "@/components/analytics/charts";
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

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="pt-2">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-muted">{description}</p>
      ) : null}
    </div>
  );
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
  if (!ready.snapshots) missing.push("server snapshots");
  if (!ready.onlineSamples) missing.push("online hourly samples");
  if (!missing.length) return null;
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      <p className="font-medium">Tracking tables not fully deployed</p>
      <p className="mt-1 text-amber-200/80">
        Apply the required database schema and restart bots so new metrics
        populate. Missing: {missing.join(", ")}.
      </p>
    </div>
  );
}

function formatSigned(n: number): string {
  if (n > 0) return `+${formatNumber(n)}`;
  return formatNumber(n);
}

export function EngagementAnalyticsSection({
  data,
  range,
  groupBy,
}: EngagementAnalyticsSectionProps) {
  const { kpis, tablesReady } = data;
  const joinLeavesLimit = useAnalyticsTableRowLimit(50);
  const churnLimit = useAnalyticsTableRowLimit(15);
  const snapshotDaily = data.serverSnapshots.map((s) => ({
    date: s.date,
    count: s.members + s.online,
  }));

  const hasJoinLeaveData =
    data.joinsPerDay.some((r) => r.count > 0) ||
    data.leavesPerDay.some((r) => r.count > 0);

  return (
    <div className="space-y-8">
      <MigrationNotice ready={tablesReady} />
      {tablesReady.memberMessages && <MemberMessagesBackfillBanner />}

      <SectionHeading
        title="Member growth & retention"
        description="Joins, leaves, invite attribution, and how long members stay before leaving."
      />

      <AnalyticsKpiGrid
        items={[
          kpi(
            "Joins",
            formatNumber(kpis.joinsInRange),
            "engagement.joins",
            { hintSeries: data.joinsPerDay }
          ),
          kpi(
            "Leaves",
            formatNumber(kpis.leavesInRange),
            "engagement.leaves",
            { hintSeries: data.leavesPerDay }
          ),
          kpi(
            "Net change",
            formatSigned(kpis.netMemberChange),
            "engagement.netChange",
            { hintSeries: data.netMemberChangePerDay }
          ),
          kpi(
            "Leave rate",
            kpis.leaveRatePercent != null
              ? `${kpis.leaveRatePercent}%`
              : "—",
            "engagement.leaveRate"
          ),
          kpi(
            "Avg account age at join",
            kpis.avgAccountAgeAtJoinDays != null
              ? `${formatNumber(kpis.avgAccountAgeAtJoinDays)}d`
              : "—",
            "engagement.avgAccountAge"
          ),
          kpi(
            "Server size",
            kpis.latestMemberCount != null
              ? formatNumber(kpis.latestMemberCount)
              : "—",
            "engagement.serverSize",
            { hintSeries: snapshotDaily }
          ),
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {hasJoinLeaveData && (
          <AnalyticsChartCard
            title={chartTitleWithPeriod("Joins vs leaves", groupBy)}
            dataHint={chartHint("engagement.chart.joinsLeaves", data.joinsPerDay)}
            exportHeaders={["date", "joins", "leaves"]}
            exportFilename={`engagement-joins-leaves-${range}.csv`}
            exportRows={data.joinsPerDay.map((r, i) => ({
              date: r.date,
              joins: r.count,
              leaves: data.leavesPerDay[i]?.count ?? 0,
            }))}
          >
            <DualDailyLineChart
              opened={data.joinsPerDay}
              closed={data.leavesPerDay}
              openedLabel="Joins"
              closedLabel="Leaves"
            />
          </AnalyticsChartCard>
        )}

        {data.netMemberChangePerDay.some((r) => r.count !== 0) && (
          <AnalyticsChartCard
            title={chartTitleWithPeriod("Net member change", groupBy)}
            dataHint={chartHint(
              "engagement.chart.netChange",
              data.netMemberChangePerDay
            )}
            exportHeaders={["date", "netChange"]}
            exportFilename={`engagement-net-change-${range}.csv`}
            exportRows={data.netMemberChangePerDay.map((r) => ({
              date: r.date,
              netChange: r.count,
            }))}
          >
            <DailyLineChart
              data={data.netMemberChangePerDay}
              color="#a78bfa"
            />
          </AnalyticsChartCard>
        )}

        {(data.joinsByHour.some((r) => r.count > 0) ||
          data.leavesByHour.some((r) => r.count > 0)) && (
          <AnalyticsChartCard
            title="Join & leave hours"
            dataHint={chartHint("engagement.chart.joinLeaveHours", data.joinsPerDay)}
            exportHeaders={["hour", "joins", "leaves"]}
            exportFilename={`engagement-join-leave-hours-${range}.csv`}
            exportRows={data.joinsByHour.map((r, i) => ({
              hour: r.name,
              joins: r.count,
              leaves: data.leavesByHour[i]?.count ?? 0,
            }))}
          >
            <DualNamedBarChart
              primary={data.joinsByHour}
              secondary={data.leavesByHour}
              primaryLabel="Joins"
              secondaryLabel="Leaves"
            />
          </AnalyticsChartCard>
        )}

        {(data.joinsByDayOfWeek.some((r) => r.count > 0) ||
          data.leavesByDayOfWeek.some((r) => r.count > 0)) && (
          <AnalyticsChartCard
            title="Join & leave by weekday"
            dataHint={chartHint(
              "engagement.chart.joinLeaveWeekday",
              data.joinsPerDay
            )}
            exportHeaders={["day", "joins", "leaves"]}
            exportFilename={`engagement-join-leave-weekday-${range}.csv`}
            exportRows={data.joinsByDayOfWeek.map((r, i) => ({
              day: r.name,
              joins: r.count,
              leaves: data.leavesByDayOfWeek[i]?.count ?? 0,
            }))}
          >
            <DualNamedBarChart
              primary={data.joinsByDayOfWeek}
              secondary={data.leavesByDayOfWeek}
              primaryLabel="Joins"
              secondaryLabel="Leaves"
            />
          </AnalyticsChartCard>
        )}

        {data.accountAgeAtJoin.some((r) => r.count > 0) && (
          <AnalyticsChartCard
            title="Account age at join"
            dataHint={chartHint(
              "engagement.chart.accountAge",
              data.joinsPerDay
            )}
            exportHeaders={["bucket", "joins"]}
            exportFilename={`engagement-account-age-${range}.csv`}
            exportRows={data.accountAgeAtJoin.map((r) => ({
              bucket: r.name,
              joins: r.count,
            }))}
          >
            <NamedBarChart data={data.accountAgeAtJoin} color="#818cf8" />
          </AnalyticsChartCard>
        )}

        {data.topInviteCodes.some((r) => r.count > 0) && (
          <AnalyticsChartCard
            title="Top invite sources"
            dataHint={chartHint(
              "engagement.chart.inviteSources",
              data.joinsPerDay
            )}
            exportHeaders={["invite", "joins"]}
            exportFilename={`engagement-invite-sources-${range}.csv`}
            exportRows={data.topInviteCodes.map((r) => ({
              invite: r.name,
              joins: r.count,
            }))}
          >
            <NamedBarChart data={data.topInviteCodes} color="#34d399" />
          </AnalyticsChartCard>
        )}
      </div>

      {data.quickChurnMembers.length > 0 && (
        <AnalyticsDataTable
          title="Shortest memberships (joined then left in range)"
          dataHint={chartHintFromTimestamps(
            "engagement.table.quickChurn",
            data.quickChurnMembers.flatMap((r) => [r.joinedAt, r.leftAt])
          )}
          headers={["userId", "joinedAt", "leftAt", "timeMember"]}
          exportFilename={`engagement-quick-churn-${range}.csv`}
          exportRows={data.quickChurnMembers.map((r) => ({
            userId: r.userId,
            joinedAt: r.joinedAt,
            leftAt: r.leftAt,
            timeMember: r.secondsMember,
          }))}
          tableRowLimit={churnLimit.tableRowLimit}
        >
          <AnalyticsTable>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2">Member</th>
                <th className="px-4 py-2">Joined</th>
                <th className="px-4 py-2">Left</th>
                <th className="px-4 py-2">Time in server</th>
              </tr>
            </thead>
            <tbody>
              {churnLimit.slice(data.quickChurnMembers).map((r) => (
                <tr
                  key={r.userId}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-4 py-2">
                    <DiscordUserChip userId={r.userId} />
                  </td>
                  <td className="px-4 py-2 text-muted whitespace-nowrap">
                    {formatUnixTimestamp(r.joinedAt)}
                  </td>
                  <td className="px-4 py-2 text-muted whitespace-nowrap">
                    {formatUnixTimestamp(r.leftAt)}
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {formatDurationSeconds(r.secondsMember)}
                  </td>
                </tr>
              ))}
            </tbody>
          </AnalyticsTable>
        </AnalyticsDataTable>
      )}

      {data.repeatLeavers.length > 0 && (
        <AnalyticsUserCountTable
          title="Repeat leavers"
          dataHint={chartHint("engagement.table.repeatLeavers", data.leavesPerDay)}
          rows={data.repeatLeavers.map((r) => ({
            userId: r.userId,
            count: r.leaveCount,
          }))}
          exportFilename={`engagement-repeat-leavers-${range}.csv`}
          countLabel="Leaves"
        />
      )}

      {data.recentJoinLeaves.length > 0 && (
        <AnalyticsDataTable
          title="Recent join / leave events"
          dataHint={chartHintFromTimestamps(
            "engagement.table.joinLeaves",
            data.recentJoinLeaves.map((r) => r.createdAt)
          )}
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
                  <td className="px-4 py-2 text-muted font-mono text-xs">
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

      <SectionHeading
        title="Server presence & live activity"
        description="How many members are online, when they are active, and server boost trends."
      />

      <AnalyticsKpiGrid
        items={[
          kpi(
            "Avg online ratio",
            kpis.avgOnlineRatioPercent != null
              ? `${kpis.avgOnlineRatioPercent}%`
              : "—",
            "engagement.onlineRatio",
            { hintSeries: data.onlineRatioPerDay }
          ),
          kpi(
            "Server boosts",
            kpis.latestBoostCount != null
              ? formatNumber(kpis.latestBoostCount)
              : "—",
            "engagement.boostCount",
            { hintSeries: data.boostCountPerDay }
          ),
          kpi(
            "Unique messengers",
            formatNumber(kpis.uniqueMessengersInRange),
            "engagement.uniqueMessengers",
            { hintSeries: data.uniqueMessengersPerDay }
          ),
          kpi(
            "Characters sent",
            formatNumber(kpis.charactersInRange),
            "engagement.characters",
            { hintSeries: data.charactersPerDay }
          ),
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {data.serverSnapshots.length > 0 && (
          <AnalyticsChartCard
            title="Server size & online (daily snapshots)"
            dataHint={chartHint("engagement.chart.snapshots", snapshotDaily)}
            exportHeaders={["date", "total", "online"]}
            exportFilename={`engagement-server-snapshots-${range}.csv`}
            exportRows={data.serverSnapshots.map((r) => ({
              date: r.date,
              total: r.members,
              online: r.online,
            }))}
          >
            <DualDailyLineChart
              opened={data.serverSnapshots.map((r) => ({
                date: r.date,
                count: r.members,
              }))}
              closed={data.serverSnapshots.map((r) => ({
                date: r.date,
                count: r.online,
              }))}
              openedLabel="Total members"
              closedLabel="Online"
            />
          </AnalyticsChartCard>
        )}

        {data.onlineRatioPerDay.some((r) => r.count > 0) && (
          <AnalyticsChartCard
            title={chartTitleWithPeriod("Online ratio (% of members)", groupBy)}
            dataHint={chartHint(
              "engagement.chart.onlineRatio",
              data.onlineRatioPerDay
            )}
            exportHeaders={["date", "onlinePercent"]}
            exportFilename={`engagement-online-ratio-${range}.csv`}
            exportRows={data.onlineRatioPerDay.map((r) => ({
              date: r.date,
              onlinePercent: r.count,
            }))}
          >
            <DailyPercentChart
              data={data.onlineRatioPerDay}
              color="#38bdf8"
              valueLabel="Online %"
            />
          </AnalyticsChartCard>
        )}

        {data.boostCountPerDay.some((r) => r.count > 0) && (
          <AnalyticsChartCard
            title={chartTitleWithPeriod("Server boosts", groupBy)}
            dataHint={chartHint(
              "engagement.chart.boosts",
              data.boostCountPerDay
            )}
            exportHeaders={["date", "boosts"]}
            exportFilename={`engagement-boosts-${range}.csv`}
            exportRows={data.boostCountPerDay.map((r) => ({
              date: r.date,
              boosts: r.count,
            }))}
          >
            <DailyLineChart data={data.boostCountPerDay} color="#f472b6" />
          </AnalyticsChartCard>
        )}

        {(data.playersOnlineByHour.some((r) => r.count > 0) ||
          data.membersOnlineByHour.some((r) => r.count > 0)) && (
          <AnalyticsChartCard
            title="Peak hours — members & online"
            dataHint={chartHint("engagement.chart.peakOnline", snapshotDaily)}
            exportHeaders={["hour", "avgMembers", "avgOnline"]}
            exportFilename={`engagement-peak-hours-${range}.csv`}
            exportRows={data.membersOnlineByHour.map((r, i) => ({
              hour: r.name,
              avgMembers: r.count,
              avgOnline: data.playersOnlineByHour[i]?.count ?? 0,
            }))}
          >
            <DualNamedBarChart
              primary={data.membersOnlineByHour}
              secondary={data.playersOnlineByHour}
              primaryLabel="Total members"
              secondaryLabel="Online"
              primaryColor="#818cf8"
              secondaryColor="#38bdf8"
            />
          </AnalyticsChartCard>
        )}
      </div>

      <SectionHeading
        title="Message & channel engagement"
        description="Guild chat, ticket activity, games, and voice — how members interact day to day."
      />

      <AnalyticsKpiGrid
        items={[
          kpi(
            "Member messages",
            formatNumber(kpis.memberMessagesInRange),
            "engagement.memberMessages",
            { hintSeries: data.memberMessagesPerDay }
          ),
          kpi(
            "Total staff messages",
            formatNumber(kpis.totalStaffMessagesInRange),
            "engagement.totalStaffMessages",
            { hintSeries: data.totalStaffMessagesPerDay }
          ),
          kpi(
            "Ticket owner messages",
            formatNumber(kpis.ownerTicketMessagesInRange),
            "engagement.ownerTicketMessages",
            { hintSeries: data.ownerTicketMessagesPerDay }
          ),
          kpi(
            "Staff ticket messages",
            formatNumber(kpis.staffMessagesInRange),
            "engagement.staffTicketMessages",
            { hintSeries: data.staffMessagesPerDay }
          ),
          kpi(
            "Total games",
            formatNumber(kpis.totalGamesInRange),
            "engagement.totalGames",
            { hintSeries: data.totalGamesPerDay }
          ),
          kpi(
            "Voice time",
            formatDurationSeconds(kpis.voiceSecondsInRange),
            "engagement.voiceTime",
            { hintSeries: data.voiceSecondsPerDay }
          ),
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {data.memberMessagesPerDay.some((r) => r.count > 0) && (
          <AnalyticsChartCard
            title={chartTitleWithPeriod("Member messages (non-staff)", groupBy)}
            dataHint={chartHint(
              "engagement.chart.memberMessages",
              data.memberMessagesPerDay
            )}
            exportHeaders={["date", "messages"]}
            exportFilename={`engagement-member-msgs-${range}.csv`}
            exportRows={data.memberMessagesPerDay.map((r) => ({
              date: r.date,
              messages: r.count,
            }))}
          >
            <DailyLineChart data={data.memberMessagesPerDay} color="#a78bfa" />
          </AnalyticsChartCard>
        )}

        {data.uniqueMessengersPerDay.some((r) => r.count > 0) && (
          <AnalyticsChartCard
            title={chartTitleWithPeriod("Unique messengers per day", groupBy)}
            dataHint={chartHint(
              "engagement.chart.uniqueMessengers",
              data.uniqueMessengersPerDay
            )}
            exportHeaders={["date", "uniqueUsers"]}
            exportFilename={`engagement-unique-messengers-${range}.csv`}
            exportRows={data.uniqueMessengersPerDay.map((r) => ({
              date: r.date,
              uniqueUsers: r.count,
            }))}
          >
            <DailyLineChart
              data={data.uniqueMessengersPerDay}
              color="#c084fc"
            />
          </AnalyticsChartCard>
        )}

        {data.charactersPerDay.some((r) => r.count > 0) && (
          <AnalyticsChartCard
            title={chartTitleWithPeriod("Characters sent (non-staff)", groupBy)}
            dataHint={chartHint(
              "engagement.chart.characters",
              data.charactersPerDay
            )}
            exportHeaders={["date", "characters"]}
            exportFilename={`engagement-characters-${range}.csv`}
            exportRows={data.charactersPerDay.map((r) => ({
              date: r.date,
              characters: r.count,
            }))}
          >
            <DailyLineChart data={data.charactersPerDay} color="#e879f9" />
          </AnalyticsChartCard>
        )}

        <AnalyticsChartCard
          title={chartTitleWithPeriod("Total staff messages", groupBy)}
          dataHint={chartHint(
            "engagement.chart.totalStaffMessages",
            data.totalStaffMessagesPerDay
          )}
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

        {data.ownerTicketMessagesPerDay.some((r) => r.count > 0) && (
          <AnalyticsChartCard
            title={chartTitleWithPeriod("Ticket owner messages", groupBy)}
            dataHint={chartHint(
              "engagement.chart.ownerTicketMessages",
              data.ownerTicketMessagesPerDay
            )}
            exportHeaders={["date", "messages"]}
            exportFilename={`engagement-owner-ticket-msgs-${range}.csv`}
            exportRows={data.ownerTicketMessagesPerDay.map((r) => ({
              date: r.date,
              messages: r.count,
            }))}
          >
            <DailyLineChart
              data={data.ownerTicketMessagesPerDay}
              color="#fbbf24"
            />
          </AnalyticsChartCard>
        )}

        <AnalyticsChartCard
          title={chartTitleWithPeriod("Staff messages (active tickets)", groupBy)}
          dataHint={chartHint(
            "engagement.chart.staffTicketMessages",
            data.staffMessagesPerDay
          )}
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
          dataHint={chartHint("engagement.chart.games", data.totalGamesPerDay)}
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
          dataHint={chartHint("engagement.chart.voice", data.voiceSecondsPerDay)}
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

      <SectionHeading title="Leaderboards" />

      {data.topVoiceUsers.length > 0 && (
        <AnalyticsUserCountTable
          title="Top voice users (range)"
          dataHint={chartHint("engagement.table.topVoice", data.voiceSecondsPerDay)}
          rows={data.topVoiceUsers}
          exportFilename={`engagement-voice-users-${range}.csv`}
          countLabel="Time"
          formatValue={(n) => formatDurationSeconds(n)}
        />
      )}

      {data.topVoiceChannels.length > 0 && (
        <AnalyticsDataTable
          title="Top voice channels (range)"
          dataHint={chartHint("engagement.table.topVoiceChannels", data.voiceSecondsPerDay)}
          headers={["rank", "channelId", "seconds"]}
          exportFilename={`engagement-voice-channels-${range}.csv`}
          exportRows={data.topVoiceChannels.map((r, i) => ({
            rank: i + 1,
            channelId: r.channelId,
            seconds: r.seconds,
          }))}
        >
          <AnalyticsTable>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Channel ID</th>
                <th className="px-4 py-2">Voice time</th>
              </tr>
            </thead>
            <tbody>
              {data.topVoiceChannels.map((r, i) => (
                <tr
                  key={r.channelId}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-4 py-2 text-muted">{i + 1}</td>
                  <td className="px-4 py-2 font-mono text-xs text-white">
                    {r.channelId}
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {formatDurationSeconds(r.seconds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </AnalyticsTable>
        </AnalyticsDataTable>
      )}

      {data.topMembersByTotalMessages.length > 0 && (
        <AnalyticsUserCountTable
          title="Top members by messages (overall)"
          dataHint={chartHint(
            "engagement.table.topMembersOverall",
            data.memberMessagesPerDay
          )}
          rows={data.topMembersByTotalMessages}
          exportFilename="engagement-top-members-overall.csv"
          countLabel="Messages"
        />
      )}

      {data.topMembersByMessagesInRange.length > 0 && (
        <AnalyticsUserCountTable
          title="Top members by messages (range)"
          dataHint={chartHint(
            "engagement.table.topMembersRange",
            data.memberMessagesPerDay
          )}
          rows={data.topMembersByMessagesInRange}
          exportFilename={`engagement-top-members-${range}.csv`}
          countLabel="Messages"
        />
      )}

      <AnalyticsUserCountTable
        title="Staff by total messages (range)"
        dataHint={chartHint(
          "engagement.table.topStaffMessages",
          data.totalStaffMessagesPerDay
        )}
        rows={data.topStaffByTotalMessages}
        exportFilename={`engagement-total-staff-by-user-${range}.csv`}
        countLabel="Messages"
      />
    </div>
  );
}
