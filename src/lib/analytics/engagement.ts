import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import { rangeSinceUnix } from "@/lib/analytics/range";
import { activeStaffStatisticsJoin } from "@/lib/analytics/staff-roster";
import { getAnalyticsTrackingTableStatus } from "@/lib/analytics/table-check";
import {
  bucketKeySqlFromDate,
  bucketKeySqlFromUnix,
  buildTimeBucketSpec,
  normalizeTimeSeries,
} from "@/lib/analytics/time-buckets";
import { fillHourOfDayBuckets } from "@/lib/analytics/buckets";
import type {
  AnalyticsRange,
  DailyCount,
  EngagementAnalytics,
} from "@/lib/analytics/types";
import { isDbConfigured, query } from "@/lib/db/pool";

function thinSnapshotSeries(
  rows: { day: string; member_count: number; online_count: number }[],
  maxPoints: number
) {
  const mapped = rows.map((r) => ({
    date: String(r.day).slice(0, 10),
    members: Number(r.member_count),
    online: Number(r.online_count),
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

const STAFF_MEMBER_JOIN = `INNER JOIN statistics s ON s.user_ID = m.user_id
  AND ${activeStaffStatisticsJoin("s")}`;

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
      ticketStaffPerDay,
      gamesPerDay,
      voicePerDay,
      topVoiceUsers,
      recentJoinLeaves,
      snapshots,
      onlineByHour,
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
        hasTickets
          ? query<{ date: string; count: number }>(
              `SELECT ${ticketDayBucket} AS date, SUM(staff_messages) AS count
               FROM analytics_ticket_messages_daily WHERE 1=1${ticketDayClause}
               GROUP BY date ORDER BY date`,
              dayParams
            )
          : [],
        hasGames
          ? query<{ date: string; count: number }>(
              `SELECT ${gamesDayBucket} AS date, COUNT(*) AS count
               FROM games
               WHERE game_id != -999999${gamesClause}
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
               LIMIT 200`,
              memberEventsParams
            )
          : [],
        hasSnapshots
          ? query<{
              day: string;
              member_count: number;
              online_count: number;
            }>(
              `SELECT ${snapshotDayBucket} AS day,
                ROUND(AVG(member_count)) AS member_count,
                ROUND(AVG(online_count)) AS online_count
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
               WHERE 1=1${
                 since != null ? " AND recorded_at >= ?" : ""
               }
               GROUP BY HOUR(FROM_UNIXTIME(recorded_at))
               ORDER BY hour`,
              memberEventsParams
            )
          : [],
      ]);

    const totalStaffMessagesPerDay = normalizeTimeSeries(
      mapDaily(totalStaffPerDay),
      range,
      groupBy
    );
    const staffMessagesPerDay = normalizeTimeSeries(
      mapDaily(ticketStaffPerDay),
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

    return {
      range,
      groupBy,
      tablesReady,
      kpis: {
        totalStaffMessagesInRange: totalStaffMessagesPerDay.reduce(
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
      },
      totalStaffMessagesPerDay,
      topStaffByTotalMessages: topTotalStaff.map((r) => ({
        userId: String(r.user_id),
        count: Number(r.total),
      })),
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
      serverSnapshots: thinSnapshotSeries(snapshots, bucketSpec.maxPoints),
      playersOnlineByHour: fillHourOfDayBuckets(onlineByHour),
    };
  } catch (err) {
    console.error("[analytics] getEngagementAnalytics failed:", err);
    return null;
  }
}
