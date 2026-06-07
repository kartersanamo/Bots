import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import {
  fillDayOfWeekBuckets,
  fillHourOfDayBuckets,
} from "@/lib/analytics/buckets";
import { rangeSinceUnix } from "@/lib/analytics/range";
import {
  activeStaffStatisticsJoin,
  nonStaffMemberFilter,
} from "@/lib/analytics/staff-roster";
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
  EngagementServerSnapshotPoint,
} from "@/lib/analytics/types";
import { isDbConfigured, query, queryOne } from "@/lib/db/pool";
import { GAMES_NOT_TEST_SQL } from "@/lib/db/schema-aliases";

function thinSnapshotSeries(
  rows: {
    day: string;
    member_count: number;
    online_count: number;
    boost_count: number;
    boost_tier: number;
  }[],
  maxPoints: number
): EngagementServerSnapshotPoint[] {
  const mapped = rows.map((r) => ({
    date: String(r.day).slice(0, 10),
    members: Number(r.member_count),
    online: Number(r.online_count),
    boostCount: Number(r.boost_count),
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

function computeNetMemberChange(
  joins: DailyCount[],
  leaves: DailyCount[]
): DailyCount[] {
  const map = new Map<string, number>();
  for (const r of joins) {
    map.set(r.date, (map.get(r.date) ?? 0) + r.count);
  }
  for (const r of leaves) {
    map.set(r.date, (map.get(r.date) ?? 0) - r.count);
  }
  return [...map.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function computeOnlineRatioSeries(
  snapshots: EngagementServerSnapshotPoint[]
): DailyCount[] {
  return snapshots
    .filter((s) => s.members > 0)
    .map((s) => ({
      date: s.date,
      count: Math.round((s.online / s.members) * 1000) / 10,
    }));
}

const STAFF_MEMBER_JOIN = `INNER JOIN staff_statistics s ON s.user_id = m.user_id
  AND ${activeStaffStatisticsJoin("s")}`;

const NON_STAFF_WHERE = nonStaffMemberFilter("m");

export async function getEngagementAnalytics(
  range: AnalyticsRange,
  groupBy: AnalyticsGroupBy
): Promise<EngagementAnalytics | null> {
  if (!isDbConfigured()) return null;

  const since = rangeSinceUnix(range);
  const bucketSpec = buildTimeBucketSpec(range, groupBy);
  const dayBucket = bucketKeySqlFromDate("m.day", bucketSpec);
  const ticketDayBucket = bucketKeySqlFromDate("day", bucketSpec);
  const voiceDayBucket = bucketKeySqlFromDate("day", bucketSpec);
  const gamesDayBucket = bucketKeySqlFromUnix("refreshed_at", bucketSpec);
  const eventDayBucket = bucketKeySqlFromUnix("created_at", bucketSpec);
  const dayClause = since != null ? " AND m.day >= DATE(FROM_UNIXTIME(?))" : "";
  const ticketDayClause =
    since != null ? " AND day >= DATE(FROM_UNIXTIME(?))" : "";
  const gamesClause =
    since != null ? " AND CAST(refreshed_at AS UNSIGNED) >= ?" : "";
  const memberEventsClause = since != null ? " AND created_at >= ?" : "";
  const dayParams = since != null ? [since] : [];
  const gamesParams = since != null ? [since] : [];
  const memberEventsParams = since != null ? [since] : [];

  try {
    const tableStatus = await getAnalyticsTrackingTableStatus();
    const hasMemberMessages = tableStatus.memberMessages === true;
    const hasTickets = tableStatus.ticketMessages === true;
    const hasVoice = tableStatus.voice === true;
    const hasMemberEvents = tableStatus.memberEvents === true;
    const hasSnapshots = tableStatus.snapshots === true;
    const hasOnlineSamples = tableStatus.onlineSamples === true;

    let hasGames = false;
    try {
      const gamesTable = await query<{ name: string }>(
        `SELECT table_name AS name FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'games' LIMIT 1`
      );
      hasGames = gamesTable.length > 0;
    } catch {
      hasGames = false;
    }

    const tablesReady = {
      memberMessages: hasMemberMessages,
      ticketMessages: hasTickets,
      games: hasGames,
      voice: hasVoice,
      memberEvents: hasMemberEvents,
      snapshots: hasSnapshots,
      onlineSamples: hasOnlineSamples,
    };

    const snapshotDayBucket = bucketKeySqlFromDate("day", bucketSpec);

    const [
      totalStaffPerDay,
      topTotalStaff,
      membersPerDay,
      topMembersInRange,
      topMembersOverall,
      ticketStaffPerDay,
      ownerTicketPerDay,
      gamesPerDay,
      voicePerDay,
      topVoiceUsers,
      topVoiceChannels,
      recentJoinLeaves,
      snapshots,
      onlineByHour,
      membersByHour,
      joinsPerDay,
      leavesPerDay,
      joinLeaveTotals,
      joinsByHour,
      leavesByHour,
      joinsByDow,
      leavesByDow,
      accountAgeAtJoin,
      topInviteCodes,
      avgAccountAgeRow,
      uniqueMessengersPerDay,
      uniqueMessengersRow,
      charactersPerDay,
      quickChurnMembers,
      repeatLeavers,
    ] = await Promise.all([
      hasMemberMessages
        ? query<{ date: string; count: number }>(
            `SELECT ${dayBucket} AS date, SUM(m.message_count) AS count
             FROM analytics_member_messages_daily m
             ${STAFF_MEMBER_JOIN}
             WHERE 1=1${dayClause}
             GROUP BY date ORDER BY date`,
            dayParams
          )
        : [],
      hasMemberMessages
        ? query<{ user_id: string; total: number }>(
            `SELECT m.user_id, SUM(m.message_count) AS total
             FROM analytics_member_messages_daily m
             ${STAFF_MEMBER_JOIN}
             WHERE 1=1${dayClause}
             GROUP BY m.user_id ORDER BY total DESC LIMIT 50`,
            dayParams
          )
        : [],
      hasMemberMessages
        ? query<{ date: string; count: number }>(
            `SELECT ${dayBucket} AS date, SUM(m.message_count) AS count
             FROM analytics_member_messages_daily m
             WHERE ${NON_STAFF_WHERE}${dayClause}
             GROUP BY date ORDER BY date`,
            dayParams
          )
        : [],
      hasMemberMessages
        ? query<{ user_id: string; total: number }>(
            `SELECT m.user_id, SUM(m.message_count) AS total
             FROM analytics_member_messages_daily m
             WHERE ${NON_STAFF_WHERE}${dayClause}
             GROUP BY m.user_id ORDER BY total DESC LIMIT 50`,
            dayParams
          )
        : [],
      hasMemberMessages
        ? query<{ user_id: string; total: number }>(
            `SELECT m.user_id, SUM(m.message_count) AS total
             FROM analytics_member_messages_daily m
             WHERE ${NON_STAFF_WHERE}
             GROUP BY m.user_id ORDER BY total DESC LIMIT 50`
          )
        : [],
      hasTickets
        ? query<{ date: string; count: number }>(
            `SELECT ${ticketDayBucket} AS date, SUM(staff_messages) AS count
             FROM analytics_ticket_messages_daily WHERE 1=1${ticketDayClause}
             GROUP BY date ORDER BY date`,
            dayParams
          )
        : [],
      hasTickets
        ? query<{ date: string; count: number }>(
            `SELECT ${ticketDayBucket} AS date, SUM(owner_messages) AS count
             FROM analytics_ticket_messages_daily WHERE 1=1${ticketDayClause}
             GROUP BY date ORDER BY date`,
            dayParams
          )
        : [],
      hasGames
        ? query<{ date: string; count: number }>(
            `SELECT ${gamesDayBucket} AS date, COUNT(*) AS count
             FROM games
             WHERE ${GAMES_NOT_TEST_SQL}${gamesClause}
             GROUP BY date ORDER BY date`,
            gamesParams
          )
        : [],
      hasVoice
        ? query<{ date: string; count: number }>(
            `SELECT ${voiceDayBucket} AS date, SUM(seconds) AS count
             FROM analytics_voice_daily WHERE 1=1${ticketDayClause}
             GROUP BY date ORDER BY date`,
            dayParams
          )
        : [],
      hasVoice
        ? query<{ user_id: string; total: number }>(
            `SELECT user_id, SUM(seconds) AS total
             FROM analytics_voice_daily WHERE 1=1${ticketDayClause}
             GROUP BY user_id ORDER BY total DESC LIMIT 20`,
            dayParams
          )
        : [],
      hasVoice
        ? query<{ channel_id: string; total: number }>(
            `SELECT channel_id, SUM(seconds) AS total
             FROM analytics_voice_daily WHERE 1=1${ticketDayClause}
             GROUP BY channel_id ORDER BY total DESC LIMIT 15`,
            dayParams
          )
        : [],
      hasMemberEvents
        ? query<{
            id: number;
            event_type: string;
            user_id: string;
            invite_code: string | null;
            account_age_days: number | null;
            created_at: number;
          }>(
            `SELECT id, event_type, user_id, invite_code, account_age_days, created_at
             FROM analytics_member_events
             WHERE 1=1${memberEventsClause}
             ORDER BY created_at DESC
             LIMIT 500`,
            memberEventsParams
          )
        : [],
      hasSnapshots
        ? query<{
            day: string;
            member_count: number;
            online_count: number;
            boost_count: number;
            boost_tier: number;
          }>(
            `SELECT ${snapshotDayBucket} AS day,
              ROUND(AVG(member_count)) AS member_count,
              ROUND(AVG(online_count)) AS online_count,
              ROUND(AVG(boost_count)) AS boost_count,
              ROUND(AVG(boost_tier)) AS boost_tier
             FROM analytics_server_snapshots WHERE 1=1${ticketDayClause}
             GROUP BY day ORDER BY day`,
            dayParams
          )
        : [],
      hasOnlineSamples
        ? query<{ hour: number; count: number }>(
            `SELECT CAST(HOUR(FROM_UNIXTIME(recorded_at)) AS UNSIGNED) AS hour,
              ROUND(AVG(online_count)) AS count
             FROM analytics_online_samples
             WHERE 1=1${since != null ? " AND recorded_at >= ?" : ""}
             GROUP BY HOUR(FROM_UNIXTIME(recorded_at))
             ORDER BY hour`,
            memberEventsParams
          )
        : [],
      hasOnlineSamples
        ? query<{ hour: number; count: number }>(
            `SELECT CAST(HOUR(FROM_UNIXTIME(recorded_at)) AS UNSIGNED) AS hour,
              ROUND(AVG(member_count)) AS count
             FROM analytics_online_samples
             WHERE 1=1${since != null ? " AND recorded_at >= ?" : ""}
             GROUP BY HOUR(FROM_UNIXTIME(recorded_at))
             ORDER BY hour`,
            memberEventsParams
          )
        : [],
      hasMemberEvents
        ? query<{ date: string; count: number }>(
            `SELECT ${eventDayBucket} AS date, COUNT(*) AS count
             FROM analytics_member_events
             WHERE event_type = 'join'${memberEventsClause}
             GROUP BY date ORDER BY date`,
            memberEventsParams
          )
        : [],
      hasMemberEvents
        ? query<{ date: string; count: number }>(
            `SELECT ${eventDayBucket} AS date, COUNT(*) AS count
             FROM analytics_member_events
             WHERE event_type = 'leave'${memberEventsClause}
             GROUP BY date ORDER BY date`,
            memberEventsParams
          )
        : [],
      hasMemberEvents
        ? queryOne<{ joins: number; leaves: number }>(
            `SELECT
              SUM(event_type = 'join') AS joins,
              SUM(event_type = 'leave') AS leaves
             FROM analytics_member_events
             WHERE 1=1${memberEventsClause}`,
            memberEventsParams
          )
        : Promise.resolve(null),
      hasMemberEvents
        ? query<{ hour: number; count: number }>(
            `SELECT CAST(HOUR(FROM_UNIXTIME(created_at)) AS UNSIGNED) AS hour,
              COUNT(*) AS count
             FROM analytics_member_events
             WHERE event_type = 'join'${memberEventsClause}
             GROUP BY hour ORDER BY hour`,
            memberEventsParams
          )
        : [],
      hasMemberEvents
        ? query<{ hour: number; count: number }>(
            `SELECT CAST(HOUR(FROM_UNIXTIME(created_at)) AS UNSIGNED) AS hour,
              COUNT(*) AS count
             FROM analytics_member_events
             WHERE event_type = 'leave'${memberEventsClause}
             GROUP BY hour ORDER BY hour`,
            memberEventsParams
          )
        : [],
      hasMemberEvents
        ? query<{ dow: number; count: number }>(
            `SELECT CAST(DAYOFWEEK(FROM_UNIXTIME(created_at)) AS UNSIGNED) AS dow,
              COUNT(*) AS count
             FROM analytics_member_events
             WHERE event_type = 'join'${memberEventsClause}
             GROUP BY dow`,
            memberEventsParams
          )
        : [],
      hasMemberEvents
        ? query<{ dow: number; count: number }>(
            `SELECT CAST(DAYOFWEEK(FROM_UNIXTIME(created_at)) AS UNSIGNED) AS dow,
              COUNT(*) AS count
             FROM analytics_member_events
             WHERE event_type = 'leave'${memberEventsClause}
             GROUP BY dow`,
            memberEventsParams
          )
        : [],
      hasMemberEvents
        ? query<{ name: string; count: number }>(
            `SELECT
              CASE
                WHEN account_age_days IS NULL THEN 'Unknown'
                WHEN account_age_days < 7 THEN 'Under 7 days'
                WHEN account_age_days < 30 THEN '7–29 days'
                WHEN account_age_days < 90 THEN '30–89 days'
                WHEN account_age_days < 365 THEN '90–364 days'
                ELSE '1 year+'
              END AS name,
              COUNT(*) AS count
             FROM analytics_member_events
             WHERE event_type = 'join'${memberEventsClause}
             GROUP BY name
             ORDER BY count DESC`,
            memberEventsParams
          )
        : [],
      hasMemberEvents
        ? query<{ name: string; count: number }>(
            `SELECT
              COALESCE(NULLIF(TRIM(invite_code), ''), 'No invite / unknown') AS name,
              COUNT(*) AS count
             FROM analytics_member_events
             WHERE event_type = 'join'${memberEventsClause}
             GROUP BY name
             ORDER BY count DESC
             LIMIT 15`,
            memberEventsParams
          )
        : [],
      hasMemberEvents
        ? queryOne<{ avg_days: number | null }>(
            `SELECT ROUND(AVG(account_age_days)) AS avg_days
             FROM analytics_member_events
             WHERE event_type = 'join'
               AND account_age_days IS NOT NULL${memberEventsClause}`,
            memberEventsParams
          )
        : Promise.resolve(null),
      hasMemberMessages
        ? query<{ date: string; count: number }>(
            `SELECT ${dayBucket} AS date, COUNT(DISTINCT m.user_id) AS count
             FROM analytics_member_messages_daily m
             WHERE ${NON_STAFF_WHERE} AND m.message_count > 0${dayClause}
             GROUP BY date ORDER BY date`,
            dayParams
          )
        : [],
      hasMemberMessages
        ? queryOne<{ users: number }>(
            `SELECT COUNT(DISTINCT m.user_id) AS users
             FROM analytics_member_messages_daily m
             WHERE ${NON_STAFF_WHERE} AND m.message_count > 0${dayClause}`,
            dayParams
          )
        : Promise.resolve(null),
      hasMemberMessages
        ? query<{ date: string; count: number }>(
            `SELECT ${dayBucket} AS date, SUM(m.character_count) AS count
             FROM analytics_member_messages_daily m
             WHERE ${NON_STAFF_WHERE}${dayClause}
             GROUP BY date ORDER BY date`,
            dayParams
          )
        : [],
      hasMemberEvents
        ? query<{
            user_id: string;
            joined_at: number;
            left_at: number;
            seconds_member: number;
          }>(
            `SELECT user_id,
              MIN(CASE WHEN event_type = 'join' THEN created_at END) AS joined_at,
              MAX(CASE WHEN event_type = 'leave' THEN created_at END) AS left_at,
              MAX(CASE WHEN event_type = 'leave' THEN created_at END)
                - MIN(CASE WHEN event_type = 'join' THEN created_at END) AS seconds_member
             FROM analytics_member_events
             WHERE 1=1${memberEventsClause}
             GROUP BY user_id
             HAVING joined_at IS NOT NULL
               AND left_at IS NOT NULL
               AND left_at > joined_at
             ORDER BY seconds_member ASC
             LIMIT 25`,
            memberEventsParams
          )
        : [],
      hasMemberEvents
        ? query<{ user_id: string; leave_count: number }>(
            `SELECT user_id, COUNT(*) AS leave_count
             FROM analytics_member_events
             WHERE event_type = 'leave'${memberEventsClause}
             GROUP BY user_id
             HAVING leave_count >= 2
             ORDER BY leave_count DESC, user_id
             LIMIT 20`,
            memberEventsParams
          )
        : [],
    ]);

    const totalStaffMessagesPerDay = normalizeTimeSeries(
      mapDaily(totalStaffPerDay),
      range,
      groupBy
    );
    const memberMessagesPerDay = normalizeTimeSeries(
      mapDaily(membersPerDay),
      range,
      groupBy
    );
    const staffMessagesPerDay = normalizeTimeSeries(
      mapDaily(ticketStaffPerDay),
      range,
      groupBy
    );
    const ownerTicketMessagesPerDay = normalizeTimeSeries(
      mapDaily(ownerTicketPerDay),
      range,
      groupBy
    );
    const totalGamesPerDay = normalizeTimeSeries(
      mapDaily(gamesPerDay),
      range,
      groupBy
    );
    const voiceSecondsPerDay = normalizeTimeSeries(
      mapDaily(voicePerDay),
      range,
      groupBy
    );
    const joinsPerDayNorm = normalizeTimeSeries(
      mapDaily(joinsPerDay),
      range,
      groupBy
    );
    const leavesPerDayNorm = normalizeTimeSeries(
      mapDaily(leavesPerDay),
      range,
      groupBy
    );
    const netMemberChangePerDay = computeNetMemberChange(
      joinsPerDayNorm,
      leavesPerDayNorm
    );
    const uniqueMessengersPerDayNorm = normalizeTimeSeries(
      mapDaily(uniqueMessengersPerDay),
      range,
      groupBy
    );
    const charactersPerDayNorm = normalizeTimeSeries(
      mapDaily(charactersPerDay),
      range,
      groupBy
    );
    const serverSnapshots = thinSnapshotSeries(snapshots, bucketSpec.maxPoints);
    const onlineRatioPerDay = computeOnlineRatioSeries(serverSnapshots);
    const boostCountPerDay: DailyCount[] = serverSnapshots.map((s) => ({
      date: s.date,
      count: s.boostCount,
    }));

    const joinsInRange = Number(joinLeaveTotals?.joins ?? 0);
    const leavesInRange = Number(joinLeaveTotals?.leaves ?? 0);
    const netMemberChange = joinsInRange - leavesInRange;
    const leaveRatePercent =
      joinsInRange > 0
        ? Math.round((leavesInRange / joinsInRange) * 1000) / 10
        : null;

    const ratioValues = onlineRatioPerDay.map((r) => r.count).filter((n) => n > 0);
    const avgOnlineRatioPercent =
      ratioValues.length > 0
        ? Math.round(
            (ratioValues.reduce((s, n) => s + n, 0) / ratioValues.length) * 10
          ) / 10
        : null;

    const latestSnapshot =
      serverSnapshots.length > 0
        ? serverSnapshots[serverSnapshots.length - 1]
        : null;

    return {
      range,
      groupBy,
      tablesReady,
      kpis: {
        totalStaffMessagesInRange: totalStaffMessagesPerDay.reduce(
          (s, r) => s + r.count,
          0
        ),
        memberMessagesInRange: memberMessagesPerDay.reduce(
          (s, r) => s + r.count,
          0
        ),
        staffMessagesInRange: staffMessagesPerDay.reduce(
          (s, r) => s + r.count,
          0
        ),
        totalGamesInRange: totalGamesPerDay.reduce((s, r) => s + r.count, 0),
        voiceSecondsInRange: voiceSecondsPerDay.reduce(
          (s, r) => s + r.count,
          0
        ),
        joinsInRange,
        leavesInRange,
        netMemberChange,
        leaveRatePercent,
        avgAccountAgeAtJoinDays:
          avgAccountAgeRow?.avg_days != null
            ? Number(avgAccountAgeRow.avg_days)
            : null,
        uniqueMessengersInRange: Number(uniqueMessengersRow?.users ?? 0),
        charactersInRange: charactersPerDayNorm.reduce(
          (s, r) => s + r.count,
          0
        ),
        ownerTicketMessagesInRange: ownerTicketMessagesPerDay.reduce(
          (s, r) => s + r.count,
          0
        ),
        avgOnlineRatioPercent,
        latestMemberCount: latestSnapshot?.members ?? null,
        latestBoostCount: latestSnapshot?.boostCount ?? null,
      },
      totalStaffMessagesPerDay,
      topStaffByTotalMessages: topTotalStaff.map((r) => ({
        userId: String(r.user_id),
        count: Number(r.total),
      })),
      topMembersByMessagesInRange: topMembersInRange.map((r) => ({
        userId: String(r.user_id),
        count: Number(r.total),
      })),
      topMembersByTotalMessages: topMembersOverall.map((r) => ({
        userId: String(r.user_id),
        count: Number(r.total),
      })),
      memberMessagesPerDay,
      staffMessagesPerDay,
      totalGamesPerDay,
      voiceSecondsPerDay,
      topVoiceUsers: topVoiceUsers.map((r) => ({
        userId: String(r.user_id),
        count: Number(r.total),
      })),
      recentJoinLeaves: recentJoinLeaves.map((r) => ({
        id: Number(r.id),
        eventType: r.event_type === "leave" ? "leave" : "join",
        userId: String(r.user_id),
        inviteCode: r.invite_code ? String(r.invite_code) : null,
        accountAgeDays:
          r.account_age_days != null ? Number(r.account_age_days) : null,
        createdAt: Number(r.created_at),
      })),
      serverSnapshots,
      playersOnlineByHour: fillHourOfDayBuckets(onlineByHour),
      joinsPerDay: joinsPerDayNorm,
      leavesPerDay: leavesPerDayNorm,
      netMemberChangePerDay,
      joinsByHour: fillHourOfDayBuckets(joinsByHour),
      leavesByHour: fillHourOfDayBuckets(leavesByHour),
      joinsByDayOfWeek: fillDayOfWeekBuckets(joinsByDow),
      leavesByDayOfWeek: fillDayOfWeekBuckets(leavesByDow),
      accountAgeAtJoin: accountAgeAtJoin.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      topInviteCodes: topInviteCodes.map((r) => ({
        name: r.name,
        count: Number(r.count),
      })),
      uniqueMessengersPerDay: uniqueMessengersPerDayNorm,
      charactersPerDay: charactersPerDayNorm,
      ownerTicketMessagesPerDay,
      onlineRatioPerDay,
      boostCountPerDay,
      membersOnlineByHour: fillHourOfDayBuckets(membersByHour),
      topVoiceChannels: topVoiceChannels.map((r) => ({
        channelId: String(r.channel_id),
        seconds: Number(r.total),
      })),
      quickChurnMembers: quickChurnMembers.map((r) => ({
        userId: String(r.user_id),
        joinedAt: Number(r.joined_at),
        leftAt: Number(r.left_at),
        secondsMember: Number(r.seconds_member),
      })),
      repeatLeavers: repeatLeavers.map((r) => ({
        userId: String(r.user_id),
        leaveCount: Number(r.leave_count),
      })),
    };
  } catch (err) {
    console.error("[analytics] getEngagementAnalytics failed:", err);
    return null;
  }
}
