import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import { rangeSinceUnix } from "@/lib/analytics/range";
import { getAnalyticsTrackingTableStatus } from "@/lib/analytics/table-check";
import {
  bucketKeySqlFromDate,
  bucketKeySqlFromUnix,
  buildTimeBucketSpec,
  normalizeTimeSeries,
} from "@/lib/analytics/time-buckets";
import type {
  AnalyticsRange,
  DailyCount,
  EngagementAnalytics,
} from "@/lib/analytics/types";
import { isDbConfigured, query, queryOne } from "@/lib/db/pool";

function thinSnapshotSeries(
  rows: {
    day: string;
    member_count: number;
    online_count: number;
    boost_tier: number;
  }[],
  maxPoints: number
) {
  const mapped = rows.map((r) => ({
    date: String(r.day).slice(0, 10),
    members: Number(r.member_count),
    online: Number(r.online_count),
    boostTier: Number(r.boost_tier),
  }));
  if (mapped.length <= maxPoints) return mapped;
  const step = Math.ceil(mapped.length / maxPoints);
  return mapped.filter((_, i) => i % step === 0).slice(0, maxPoints);
}

function mapDaily(rows: { date: string | Date; count: number }[]): DailyCount[] {
  return rows.map((r) => ({
    date:
      r.date instanceof Date
        ? r.date.toISOString().slice(0, 10)
        : String(r.date).slice(0, 10),
    count: Number(r.count),
  }));
}

export async function getEngagementAnalytics(
  range: AnalyticsRange,
  groupBy: AnalyticsGroupBy
): Promise<EngagementAnalytics | null> {
  if (!isDbConfigured()) return null;

  const since = rangeSinceUnix(range);
  const bucketSpec = buildTimeBucketSpec(range, groupBy);
  const dayBucket = bucketKeySqlFromDate("day", bucketSpec);
  const tsBucket = bucketKeySqlFromUnix("created_at", bucketSpec);
  const endedBucket = bucketKeySqlFromUnix("ended_at", bucketSpec);
  const blCreatedBucket = bucketKeySqlFromUnix("created_at", bucketSpec);
  const tsClause = since != null ? " AND created_at >= ?" : "";
  const tsParams = since != null ? [since] : [];
  const dayClause = since != null ? " AND day >= DATE(FROM_UNIXTIME(?))" : "";
  const dayParams = since != null ? [since] : [];

  try {
    const tableStatus = await getAnalyticsTrackingTableStatus();
    const hasStaff = tableStatus.staffMessages === true;
    const hasTickets = tableStatus.ticketMessages === true;
    const hasMembers = tableStatus.memberEvents === true;
    const hasVoice = tableStatus.voice === true;
    const hasCommands = tableStatus.commands === true;
    const hasMod = tableStatus.moderation === true;
    const hasGames = tableStatus.gameOutcomes === true;
    const hasSnapshots = tableStatus.snapshots === true;
    const hasMemberMessages = tableStatus.memberMessages === true;

    const [
      staffPerDay,
      topStaffMessages,
      ticketStaffPerDay,
      ticketOwnerPerDay,
      joinsPerDay,
      leavesPerDay,
      voicePerDay,
      topVoiceUsers,
      commandsPerDay,
      topCommands,
      modPerDay,
      modByType,
      topModActors,
      gameOutcomesPerDay,
      outcomesByType,
      snapshots,
      blacklistCreatedPerDay,
      memberMessagesPerDay,
      topMembersByMessages,
    ] = await Promise.all([
      hasStaff
        ? query<{ date: string; count: number }>(
            `SELECT ${dayBucket} AS date, SUM(message_count) AS count
             FROM analytics_staff_messages_daily WHERE 1=1${dayClause}
             GROUP BY date ORDER BY date`,
            dayParams
          )
        : [],
      hasStaff
        ? query<{ user_id: string; total: number }>(
            `SELECT user_id, SUM(message_count) AS total
             FROM analytics_staff_messages_daily WHERE 1=1${dayClause}
             GROUP BY user_id ORDER BY total DESC LIMIT 20`,
            dayParams
          )
        : [],
      hasTickets
        ? query<{ date: string; count: number }>(
            `SELECT ${dayBucket} AS date, SUM(staff_messages) AS count
             FROM analytics_ticket_messages_daily WHERE 1=1${dayClause}
             GROUP BY date ORDER BY date`,
            dayParams
          )
        : [],
      hasTickets
        ? query<{ date: string; count: number }>(
            `SELECT ${dayBucket} AS date, SUM(owner_messages) AS count
             FROM analytics_ticket_messages_daily WHERE 1=1${dayClause}
             GROUP BY day ORDER BY day`,
            dayParams
          )
        : [],
      hasMembers
        ? query<{ date: string; count: number }>(
            `SELECT ${tsBucket} AS date, COUNT(*) AS count
             FROM analytics_member_events WHERE event_type = 'join'${tsClause}
             GROUP BY date ORDER BY date`,
            tsParams
          )
        : [],
      hasMembers
        ? query<{ date: string; count: number }>(
            `SELECT ${tsBucket} AS date, COUNT(*) AS count
             FROM analytics_member_events WHERE event_type = 'leave'${tsClause}
             GROUP BY date ORDER BY date`,
            tsParams
          )
        : [],
      hasVoice
        ? query<{ date: string; count: number }>(
            `SELECT ${dayBucket} AS date, SUM(seconds) AS count
             FROM analytics_voice_daily WHERE 1=1${dayClause}
             GROUP BY date ORDER BY date`,
            dayParams
          )
        : [],
      hasVoice
        ? query<{ user_id: string; total: number }>(
            `SELECT user_id, SUM(seconds) AS total
             FROM analytics_voice_daily WHERE 1=1${dayClause}
             GROUP BY user_id ORDER BY total DESC LIMIT 15`,
            dayParams
          )
        : [],
      hasCommands
        ? query<{ date: string; count: number }>(
            `SELECT ${dayBucket} AS date, SUM(invocations) AS count
             FROM analytics_command_daily WHERE 1=1${dayClause}
             GROUP BY date ORDER BY date`,
            dayParams
          )
        : [],
      hasCommands
        ? query<{ name: string; count: number }>(
            `SELECT command_name AS name, SUM(invocations) AS count
             FROM analytics_command_daily WHERE 1=1${dayClause}
             GROUP BY command_name ORDER BY count DESC LIMIT 20`,
            dayParams
          )
        : [],
      hasMod
        ? query<{ date: string; count: number }>(
            `SELECT ${tsBucket} AS date, COUNT(*) AS count
             FROM analytics_mod_actions WHERE 1=1${tsClause}
             GROUP BY date ORDER BY date`,
            tsParams
          )
        : [],
      hasMod
        ? query<{ name: string; count: number }>(
            `SELECT action_type AS name, COUNT(*) AS count
             FROM analytics_mod_actions WHERE 1=1${tsClause}
             GROUP BY action_type ORDER BY count DESC`,
            tsParams
          )
        : [],
      hasMod
        ? query<{ actor_id: string; count: number }>(
            `SELECT actor_id, COUNT(*) AS count
             FROM analytics_mod_actions WHERE 1=1${tsClause}
             GROUP BY actor_id ORDER BY count DESC LIMIT 15`,
            tsParams
          )
        : [],
      hasGames
        ? query<{ date: string; count: number }>(
            `SELECT ${endedBucket} AS date, COUNT(*) AS count
             FROM analytics_game_outcomes WHERE ended_at > 0${
               since != null ? " AND ended_at >= ?" : ""
             }
             GROUP BY date ORDER BY date`,
            tsParams
          )
        : [],
      hasGames
        ? query<{ name: string; count: number }>(
            `SELECT outcome AS name, COUNT(*) AS count
             FROM analytics_game_outcomes WHERE ended_at > 0${
               since != null ? " AND ended_at >= ?" : ""
             }
             GROUP BY outcome ORDER BY count DESC`,
            tsParams
          )
        : [],
      hasSnapshots
        ? query<{
            day: string;
            member_count: number;
            online_count: number;
            boost_tier: number;
          }>(
            `SELECT ${dayBucket} AS day,
              ROUND(AVG(member_count)) AS member_count,
              ROUND(AVG(online_count)) AS online_count,
              MAX(boost_tier) AS boost_tier
             FROM analytics_server_snapshots WHERE 1=1${dayClause}
             GROUP BY day ORDER BY day`,
            dayParams
          )
        : [],
      query<{ date: string; count: number }>(
        `SELECT ${blCreatedBucket} AS date, COUNT(*) AS count
         FROM blacklists
         WHERE CAST(created_at AS UNSIGNED) > 0
         ${since != null ? "AND CAST(created_at AS UNSIGNED) >= ?" : ""}
         GROUP BY date ORDER BY date`,
        since != null ? [since] : []
      ).catch(() => []),
      hasMemberMessages
        ? query<{ date: string; count: number }>(
            `SELECT ${dayBucket} AS date, SUM(message_count) AS count
             FROM analytics_member_messages_daily WHERE 1=1${dayClause}
             GROUP BY date ORDER BY date`,
            dayParams
          )
        : [],
      hasMemberMessages
        ? query<{ user_id: string; total: number }>(
            `SELECT user_id, SUM(message_count) AS total
             FROM analytics_member_messages_daily WHERE 1=1${dayClause}
             GROUP BY user_id ORDER BY total DESC LIMIT 15`,
            dayParams
          )
        : [],
    ]);

    const staffTotal = topStaffMessages.reduce((s, r) => s + Number(r.total), 0);
    const memberMsgTotal = topMembersByMessages.reduce(
      (s, r) => s + Number(r.total),
      0
    );
    const voiceTotal = topVoiceUsers.reduce((s, r) => s + Number(r.total), 0);
    const joinTotal = joinsPerDay.reduce((s, r) => s + Number(r.count), 0);
    const leaveTotal = leavesPerDay.reduce((s, r) => s + Number(r.count), 0);

    return {
      range,
      groupBy,
      tablesReady: tableStatus,
      kpis: {
        staffMessagesInRange: staffTotal,
        ticketStaffMessages: ticketStaffPerDay.reduce(
          (s, r) => s + Number(r.count),
          0
        ),
        ticketOwnerMessages: ticketOwnerPerDay.reduce(
          (s, r) => s + Number(r.count),
          0
        ),
        memberJoins: joinTotal,
        memberLeaves: leaveTotal,
        voiceSecondsInRange: voiceTotal,
        commandInvocations: commandsPerDay.reduce(
          (s, r) => s + Number(r.count),
          0
        ),
        modActions: modPerDay.reduce((s, r) => s + Number(r.count), 0),
        gameSessionsEnded: gameOutcomesPerDay.reduce(
          (s, r) => s + Number(r.count),
          0
        ),
        memberMessagesInRange: memberMsgTotal,
      },
      staffMessagesPerDay: normalizeTimeSeries(
        mapDaily(staffPerDay),
        range,
        groupBy
      ),
      topStaffByMessages: topStaffMessages.map((r) => ({
        userId: String(r.user_id),
        count: Number(r.total),
      })),
      ticketStaffMessagesPerDay: normalizeTimeSeries(
        mapDaily(ticketStaffPerDay),
        range,
        groupBy
      ),
      ticketOwnerMessagesPerDay: normalizeTimeSeries(
        mapDaily(ticketOwnerPerDay),
        range,
        groupBy
      ),
      memberJoinsPerDay: normalizeTimeSeries(mapDaily(joinsPerDay), range, groupBy),
      memberLeavesPerDay: normalizeTimeSeries(
        mapDaily(leavesPerDay),
        range,
        groupBy
      ),
      voiceSecondsPerDay: normalizeTimeSeries(mapDaily(voicePerDay), range, groupBy),
      topVoiceUsers: topVoiceUsers.map((r) => ({
        userId: String(r.user_id),
        count: Number(r.total),
      })),
      commandsPerDay: normalizeTimeSeries(
        mapDaily(commandsPerDay),
        range,
        groupBy
      ),
      topCommands: topCommands.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      modActionsPerDay: normalizeTimeSeries(mapDaily(modPerDay), range, groupBy),
      modActionsByType: modByType.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      topModActors: topModActors.map((r) => ({
        userId: String(r.actor_id),
        count: Number(r.count),
      })),
      gameOutcomesPerDay: normalizeTimeSeries(
        mapDaily(gameOutcomesPerDay),
        range,
        groupBy
      ),
      gameOutcomesByType: outcomesByType.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      serverSnapshots: thinSnapshotSeries(snapshots, bucketSpec.maxPoints),
      blacklistsCreatedPerDay: normalizeTimeSeries(
        mapDaily(blacklistCreatedPerDay),
        range,
        groupBy
      ),
      memberMessagesPerDay: normalizeTimeSeries(
        mapDaily(memberMessagesPerDay),
        range,
        groupBy
      ),
      topMembersByMessages: topMembersByMessages.map((r) => ({
        userId: String(r.user_id),
        count: Number(r.total),
      })),
    };
  } catch (err) {
    console.error("[analytics] getEngagementAnalytics failed:", err);
    return null;
  }
}
