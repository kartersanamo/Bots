"use client";

import { AnalyticsChartCard } from "@/components/analytics/AnalyticsChartCard";
import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { AnalyticsUserCountTable } from "@/components/analytics/AnalyticsUserCountTable";
import { DailyLineChart, DualDailyLineChart, NamedBarChart } from "@/components/analytics/charts";
import { formatDurationSeconds } from "@/lib/analytics/format";
import type { AnalyticsRange, EngagementAnalytics } from "@/lib/analytics/types";
import { formatNumber } from "@/lib/utils";

interface EngagementAnalyticsSectionProps {
  data: EngagementAnalytics;
  range: AnalyticsRange;
}

function MigrationNotice({ ready }: { ready: Record<string, boolean> }) {
  const missing = Object.entries(ready).filter(([, v]) => !v);
  if (!missing.length) return null;
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      <p className="font-medium">Tracking tables not fully deployed</p>
      <p className="mt-1 text-amber-200/80">
        Run{" "}
        <code className="rounded bg-black/30 px-1">node scripts/apply-analytics-migration.mjs</code>{" "}
        and restart bots so new metrics populate. Missing:{" "}
        {missing.map(([k]) => k).join(", ")}.
      </p>
    </div>
  );
}

export function EngagementAnalyticsSection({
  data,
  range,
}: EngagementAnalyticsSectionProps) {
  const { kpis, tablesReady } = data;

  const memberFlow = data.memberJoinsPerDay.map((r) => {
    const leaves =
      data.memberLeavesPerDay.find((l) => l.date === r.date)?.count ?? 0;
    return { date: r.date, opened: r.count, closed: leaves };
  });

  return (
    <div className="space-y-6">
      <MigrationNotice ready={tablesReady} />

      <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-4">
        <h2 className="text-lg font-semibold text-white">Community & engagement</h2>
        <p className="mt-1 text-sm text-muted">
          Newly tracked metrics: staff messages, ticket replies, joins/leaves, voice,
          commands, moderation actions, poll votes, game outcomes, and daily server
          snapshots.
        </p>
      </div>

      <AnalyticsKpiGrid
        items={[
          { label: "Staff messages", value: kpis.staffMessagesInRange },
          { label: "Ticket staff msgs", value: kpis.ticketStaffMessages },
          { label: "Ticket owner msgs", value: kpis.ticketOwnerMessages },
          { label: "Member joins", value: kpis.memberJoins },
          { label: "Member leaves", value: kpis.memberLeaves },
          {
            label: "Voice time",
            value: formatDurationSeconds(kpis.voiceSecondsInRange),
          },
          { label: "Command uses", value: kpis.commandInvocations },
          { label: "Mod actions", value: kpis.modActions },
          { label: "Poll votes", value: kpis.pollVotes },
          { label: "Games finished", value: kpis.gameSessionsEnded },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Staff messages per day"
          exportHeaders={["date", "messages"]}
          exportFilename={`engagement-staff-msgs-${range}.csv`}
          exportRows={data.staffMessagesPerDay.map((r) => ({
            date: r.date,
            messages: r.count,
          }))}
        >
          <DailyLineChart data={data.staffMessagesPerDay} color="#34d399" />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Ticket messages (staff vs owner)"
          exportHeaders={["date", "staff", "owner"]}
          exportFilename={`engagement-ticket-msgs-${range}.csv`}
          exportRows={data.ticketStaffMessagesPerDay.map((r) => ({
            date: r.date,
            staff: r.count,
            owner:
              data.ticketOwnerMessagesPerDay.find((o) => o.date === r.date)
                ?.count ?? 0,
          }))}
        >
          <DualDailyLineChart
            opened={data.ticketStaffMessagesPerDay}
            closed={data.ticketOwnerMessagesPerDay}
          />
        </AnalyticsChartCard>
      </div>

      <AnalyticsUserCountTable
        title="Top staff by messages (range)"
        rows={data.topStaffByMessages}
        exportFilename={`engagement-top-staff-${range}.csv`}
        countLabel="Messages"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Member joins vs leaves"
          exportHeaders={["date", "joins", "leaves"]}
          exportFilename={`engagement-members-${range}.csv`}
          exportRows={memberFlow.map((r) => ({
            date: r.date,
            joins: r.opened,
            leaves: r.closed,
          }))}
        >
          <DualDailyLineChart
            opened={data.memberJoinsPerDay}
            closed={data.memberLeavesPerDay}
          />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Voice time per day (seconds)"
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

      <AnalyticsUserCountTable
        title="Top voice users (range)"
        rows={data.topVoiceUsers}
        exportFilename={`engagement-voice-users-${range}.csv`}
        countLabel="Seconds"
        formatValue={(n) => formatDurationSeconds(n)}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Slash command usage per day"
          exportHeaders={["date", "invocations"]}
          exportFilename={`engagement-commands-${range}.csv`}
          exportRows={data.commandsPerDay.map((r) => ({
            date: r.date,
            invocations: r.count,
          }))}
        >
          <DailyLineChart data={data.commandsPerDay} color="#818cf8" />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Top commands"
          exportHeaders={["command", "count"]}
          exportFilename={`engagement-top-commands-${range}.csv`}
          exportRows={data.topCommands.map((r) => ({
            command: r.name,
            count: r.count,
          }))}
        >
          <NamedBarChart data={data.topCommands} color="#818cf8" />
        </AnalyticsChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Moderation actions per day"
          exportHeaders={["date", "actions"]}
          exportFilename={`engagement-mod-${range}.csv`}
          exportRows={data.modActionsPerDay.map((r) => ({
            date: r.date,
            actions: r.count,
          }))}
        >
          <DailyLineChart data={data.modActionsPerDay} color="#f87171" />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Moderation by action type"
          exportHeaders={["type", "count"]}
          exportFilename={`engagement-mod-types-${range}.csv`}
          exportRows={data.modActionsByType.map((r) => ({
            type: r.name,
            count: r.count,
          }))}
        >
          <NamedBarChart data={data.modActionsByType} color="#f87171" />
        </AnalyticsChartCard>
      </div>

      <AnalyticsUserCountTable
        title="Top moderators (dashboard + bot actions logged)"
        rows={data.topModActors}
        exportFilename={`engagement-mod-actors-${range}.csv`}
        countLabel="Actions"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Poll votes per day"
          exportHeaders={["date", "votes"]}
          exportFilename={`engagement-poll-votes-${range}.csv`}
          exportRows={data.pollVotesPerDay.map((r) => ({
            date: r.date,
            votes: r.count,
          }))}
        >
          <DailyLineChart data={data.pollVotesPerDay} color="#c084fc" />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Game sessions ended per day"
          exportHeaders={["date", "sessions"]}
          exportFilename={`engagement-games-ended-${range}.csv`}
          exportRows={data.gameOutcomesPerDay.map((r) => ({
            date: r.date,
            sessions: r.count,
          }))}
        >
          <DailyLineChart data={data.gameOutcomesPerDay} color="#fb923c" />
        </AnalyticsChartCard>
      </div>

      {data.gameOutcomesByType.length > 0 && (
        <AnalyticsChartCard
          title="Game outcomes by type"
          exportHeaders={["outcome", "count"]}
          exportFilename={`engagement-game-outcomes-${range}.csv`}
          exportRows={data.gameOutcomesByType.map((r) => ({
            outcome: r.name,
            count: r.count,
          }))}
        >
          <NamedBarChart data={data.gameOutcomesByType} color="#fb923c" />
        </AnalyticsChartCard>
      )}

      {data.blacklistsCreatedPerDay.length > 0 && (
        <AnalyticsChartCard
          title="Blacklists created per day"
          exportHeaders={["date", "count"]}
          exportFilename={`engagement-blacklists-created-${range}.csv`}
          exportRows={data.blacklistsCreatedPerDay.map((r) => ({
            date: r.date,
            count: r.count,
          }))}
        >
          <DailyLineChart data={data.blacklistsCreatedPerDay} color="#ef4444" />
        </AnalyticsChartCard>
      )}

      {data.serverSnapshots.length > 0 && (
        <AnalyticsChartCard
          title="Server size & online (daily snapshots)"
          exportHeaders={["date", "members", "online", "boostTier"]}
          exportFilename={`engagement-server-snapshots.csv`}
          exportRows={data.serverSnapshots.map((r) => ({
            date: r.date,
            members: r.members,
            online: r.online,
            boostTier: r.boostTier,
          }))}
        >
          <DailyLineChart
            data={data.serverSnapshots.map((r) => ({
              date: r.date,
              count: r.members,
            }))}
            color="#38bdf8"
          />
          <p className="mt-2 text-xs text-muted">
            Latest online:{" "}
            {formatNumber(
              data.serverSnapshots[data.serverSnapshots.length - 1]?.online ?? 0
            )}{" "}
            · Members:{" "}
            {formatNumber(
              data.serverSnapshots[data.serverSnapshots.length - 1]?.members ?? 0
            )}
          </p>
        </AnalyticsChartCard>
      )}
    </div>
  );
}
