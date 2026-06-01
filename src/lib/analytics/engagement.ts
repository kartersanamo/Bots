import { rangeSinceUnix } from "@/lib/analytics/range";
import type {
  AnalyticsRange,
  DailyCount,
  EngagementAnalytics,
  NamedCount,
  UserCountRow,
} from "@/lib/analytics/types";
import { isDbConfigured, query, queryOne } from "@/lib/db/pool";

function mapDaily(rows: { date: string | Date; count: number }[]): DailyCount[] {
  return rows.map((r) => ({
    date:
      r.date instanceof Date
        ? r.date.toISOString().slice(0, 10)
        : String(r.date).slice(0, 10),
    count: Number(r.count),
  }));
}

async function tableExists(name: string): Promise<boolean> {
  const row = await queryOne<{ ok: number }>(
    `SELECT COUNT(*) AS ok FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [name]
  );
  return Number(row?.ok ?? 0) > 0;
}

export async function getEngagementAnalytics(
  range: AnalyticsRange
): Promise<EngagementAnalytics | null> {
  if (!isDbConfigured()) return null;

  const since = rangeSinceUnix(range);
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
            `SELECT day AS date, SUM(message_count) AS count
             FROM analytics_staff_messages_daily WHERE 1=1${dayClause}
             GROUP BY day ORDER BY day`,
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
            `SELECT day AS date, SUM(staff_messages) AS count
             FROM analytics_ticket_messages_daily WHERE 1=1${dayClause}
             GROUP BY day ORDER BY day`,
            dayParams
          )
        : [],
      hasTickets
        ? query<{ date: string; count: number }>(
            `SELECT day AS date, SUM(owner_messages) AS count
             FROM analytics_ticket_messages_daily WHERE 1=1${dayClause}
             GROUP BY day ORDER BY day`,
            dayParams
          )
        : [],
      hasMembers
        ? query<{ date: string; count: number }>(
            `SELECT DATE(FROM_UNIXTIME(created_at)) AS date, COUNT(*) AS count
             FROM analytics_member_events WHERE event_type = 'join'${tsClause}
             GROUP BY date ORDER BY date`,
            tsParams
          )
        : [],
      hasMembers
        ? query<{ date: string; count: number }>(
            `SELECT DATE(FROM_UNIXTIME(created_at)) AS date, COUNT(*) AS count
             FROM analytics_member_events WHERE event_type = 'leave'${tsClause}
             GROUP BY date ORDER BY date`,
            tsParams
          )
        : [],
      hasVoice
        ? query<{ date: string; count: number }>(
            `SELECT day AS date, SUM(seconds) AS count
             FROM analytics_voice_daily WHERE 1=1${dayClause}
             GROUP BY day ORDER BY day`,
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
            `SELECT day AS date, SUM(invocations) AS count
             FROM analytics_command_daily WHERE 1=1${dayClause}
             GROUP BY day ORDER BY day`,
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
            `SELECT DATE(FROM_UNIXTIME(created_at)) AS date, COUNT(*) AS count
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
            `SELECT DATE(FROM_UNIXTIME(voted_at)) AS date, COUNT(*) AS count
             FROM analytics_poll_votes WHERE voted_at > 0${
               since != null ? " AND voted_at >= ?" : ""
             }
             GROUP BY date ORDER BY date`,
            tsParams
          )
        : [],
      hasGames
        ? query<{ date: string; count: number }>(
            `SELECT DATE(FROM_UNIXTIME(ended_at)) AS date, COUNT(*) AS count
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
            `SELECT day, member_count, online_count, boost_tier
             FROM analytics_server_snapshots WHERE 1=1${dayClause.replace("day >=", "day >=")}
             ORDER BY day`,
            dayParams
          )
        : [],
      query<{ date: string; count: number }>(
        `SELECT DATE(FROM_UNIXTIME(CAST(created_at AS UNSIGNED))) AS date, COUNT(*) AS count
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
      staffMessagesPerDay: mapDaily(staffPerDay),
      topStaffByMessages: topStaffMessages.map((r) => ({
        userId: String(r.user_id),
        count: Number(r.total),
      })),
      ticketStaffMessagesPerDay: mapDaily(ticketStaffPerDay),
      ticketOwnerMessagesPerDay: mapDaily(ticketOwnerPerDay),
      memberJoinsPerDay: mapDaily(joinsPerDay),
      memberLeavesPerDay: mapDaily(leavesPerDay),
      voiceSecondsPerDay: mapDaily(voicePerDay),
      topVoiceUsers: topVoiceUsers.map((r) => ({
        userId: String(r.user_id),
        count: Number(r.total),
      })),
      commandsPerDay: mapDaily(commandsPerDay),
      topCommands: topCommands.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      modActionsPerDay: mapDaily(modPerDay),
      modActionsByType: modByType.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      topModActors: topModActors.map((r) => ({
        userId: String(r.actor_id),
        count: Number(r.count),
      })),
      pollVotesPerDay: mapDaily(pollVotesPerDay),
      gameOutcomesPerDay: mapDaily(gameOutcomesPerDay),
      gameOutcomesByType: outcomesByType.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      serverSnapshots: snapshots.map((r) => ({
        date: String(r.day).slice(0, 10),
        members: Number(r.member_count),
        online: Number(r.online_count),
        boostTier: Number(r.boost_tier),
      })),
      blacklistsCreatedPerDay: mapDaily(blacklistCreatedPerDay),
    };
  } catch (err) {
    console.error("[analytics] getEngagementAnalytics failed:", err);
    return null;
  }
}
