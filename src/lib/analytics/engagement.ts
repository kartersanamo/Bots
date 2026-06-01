import { rangeSinceUnix } from "@/lib/analytics/range";
import {
  bucketKeySqlFromDate,
  bucketKeySqlFromUnix,
  getTimeBucketSpec,
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

const TABLE_EXISTS_TTL_MS = 5 * 60_000;
const tableExistsCache = new Map<string, { ok: boolean; at: number }>();

async function tableExists(name: string): Promise<boolean> {
  const hit = tableExistsCache.get(name);
  if (hit && Date.now() - hit.at < TABLE_EXISTS_TTL_MS) return hit.ok;

  const row = await queryOne<{ ok: number }>(
    `SELECT COUNT(*) AS ok FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [name]
  );
  const ok = Number(row?.ok ?? 0) > 0;
  tableExistsCache.set(name, { ok, at: Date.now() });
  return ok;
}

export async function getEngagementAnalytics(
  range: AnalyticsRange
): Promise<EngagementAnalytics | null> {
  if (!isDbConfigured()) return null;

  const since = rangeSinceUnix(range);
  const bucketSpec = getTimeBucketSpec(range);
  const dayBucket = bucketKeySqlFromDate("day", bucketSpec);
  const tsBucket = bucketKeySqlFromUnix("created_at", bucketSpec);
  const votedBucket = bucketKeySqlFromUnix("voted_at", bucketSpec);
  const endedBucket = bucketKeySqlFromUnix("ended_at", bucketSpec);
  const blCreatedBucket = bucketKeySqlFromUnix("created_at", bucketSpec);
  const tsClause = since != null ? " AND created_at >= ?" : "";
  const tsParams = since != null ? [since] : [];
  const dayClause = since != null ? " AND day >= DATE(FROM_UNIXTIME(?))" : "";
  const dayParams = since != null ? [since] : [];

  try {
    const hasStaff = await tableExists("analytics_staff_messages_daily");
    const hasTickets = await tableExists("analytics_ticket_messages_daily");
    const hasMembers = await tableExists("analytics_member_events");
    const hasVoice = await tableExists("analytics_voice_daily");
    const hasCommands = await tableExists("analytics_command_daily");
    const hasMod = await tableExists("analytics_mod_actions");
    const hasPollVotes = await tableExists("analytics_poll_votes");
    const hasGames = await tableExists("analytics_game_outcomes");
    const hasSnapshots = await tableExists("analytics_server_snapshots");

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
      pollVotesPerDay,
      gameOutcomesPerDay,
      outcomesByType,
      snapshots,
      blacklistCreatedPerDay,
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
      hasPollVotes
        ? query<{ date: string; count: number }>(
            `SELECT ${votedBucket} AS date, COUNT(*) AS count
             FROM analytics_poll_votes WHERE voted_at > 0${
               since != null ? " AND voted_at >= ?" : ""
             }
             GROUP BY date ORDER BY date`,
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
    ]);

    const staffTotal = topStaffMessages.reduce((s, r) => s + Number(r.total), 0);
    const voiceTotal = topVoiceUsers.reduce((s, r) => s + Number(r.total), 0);
    const joinTotal = joinsPerDay.reduce((s, r) => s + Number(r.count), 0);
    const leaveTotal = leavesPerDay.reduce((s, r) => s + Number(r.count), 0);

    return {
      range,
      tablesReady: {
        staffMessages: hasStaff,
        ticketMessages: hasTickets,
        memberEvents: hasMembers,
        voice: hasVoice,
        commands: hasCommands,
        moderation: hasMod,
        pollVotes: hasPollVotes,
        gameOutcomes: hasGames,
        snapshots: hasSnapshots,
      },
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
        pollVotes: pollVotesPerDay.reduce((s, r) => s + Number(r.count), 0),
        gameSessionsEnded: gameOutcomesPerDay.reduce(
          (s, r) => s + Number(r.count),
          0
        ),
      },
      staffMessagesPerDay: normalizeTimeSeries(mapDaily(staffPerDay), range),
      topStaffByMessages: topStaffMessages.map((r) => ({
        userId: String(r.user_id),
        count: Number(r.total),
      })),
      ticketStaffMessagesPerDay: normalizeTimeSeries(
        mapDaily(ticketStaffPerDay),
        range
      ),
      ticketOwnerMessagesPerDay: normalizeTimeSeries(
        mapDaily(ticketOwnerPerDay),
        range
      ),
      memberJoinsPerDay: normalizeTimeSeries(mapDaily(joinsPerDay), range),
      memberLeavesPerDay: normalizeTimeSeries(mapDaily(leavesPerDay), range),
      voiceSecondsPerDay: normalizeTimeSeries(mapDaily(voicePerDay), range),
      topVoiceUsers: topVoiceUsers.map((r) => ({
        userId: String(r.user_id),
        count: Number(r.total),
      })),
      commandsPerDay: normalizeTimeSeries(mapDaily(commandsPerDay), range),
      topCommands: topCommands.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      modActionsPerDay: normalizeTimeSeries(mapDaily(modPerDay), range),
      modActionsByType: modByType.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      topModActors: topModActors.map((r) => ({
        userId: String(r.actor_id),
        count: Number(r.count),
      })),
      pollVotesPerDay: normalizeTimeSeries(mapDaily(pollVotesPerDay), range),
      gameOutcomesPerDay: normalizeTimeSeries(mapDaily(gameOutcomesPerDay), range),
      gameOutcomesByType: outcomesByType.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      serverSnapshots: thinSnapshotSeries(snapshots, bucketSpec.maxPoints),
      blacklistsCreatedPerDay: normalizeTimeSeries(
        mapDaily(blacklistCreatedPerDay),
        range
      ),
    };
  } catch (err) {
    console.error("[analytics] getEngagementAnalytics failed:", err);
    return null;
  }
}
