import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import { rangeSinceUnix } from "@/lib/analytics/range";
import { getAnalyticsTrackingTableStatus } from "@/lib/analytics/table-check";
import {
  bucketKeySqlFromDate,
  buildTimeBucketSpec,
  normalizeTimeSeries,
} from "@/lib/analytics/time-buckets";
import type {
  AnalyticsRange,
  DailyCount,
  EngagementAnalytics,
} from "@/lib/analytics/types";
import { isDbConfigured, query } from "@/lib/db/pool";

function mapDaily(rows: { date: string | Date; count: number }[]): DailyCount[] {
  return rows.map((r) => ({
    date:
      r.date instanceof Date
        ? r.date.toISOString().slice(0, 10)
        : String(r.date).slice(0, 10),
    count: Number(r.count),
  }));
}

const STAFF_MEMBER_JOIN = `INNER JOIN statistics s ON s.user_ID = m.user_id`;

export async function getEngagementAnalytics(
  range: AnalyticsRange,
  groupBy: AnalyticsGroupBy
): Promise<EngagementAnalytics | null> {
  if (!isDbConfigured()) return null;

  const since = rangeSinceUnix(range);
  const bucketSpec = buildTimeBucketSpec(range, groupBy);
  const dayBucket = bucketKeySqlFromDate("m.day", bucketSpec);
  const ticketDayBucket = bucketKeySqlFromDate("day", bucketSpec);
  const dayClause = since != null ? " AND m.day >= DATE(FROM_UNIXTIME(?))" : "";
  const ticketDayClause =
    since != null ? " AND day >= DATE(FROM_UNIXTIME(?))" : "";
  const dayParams = since != null ? [since] : [];

  try {
    const tableStatus = await getAnalyticsTrackingTableStatus();
    const hasMemberMessages = tableStatus.memberMessages === true;
    const hasTickets = tableStatus.ticketMessages === true;

    const tablesReady = {
      memberMessages: hasMemberMessages,
      ticketMessages: hasTickets,
    };

    const [totalStaffPerDay, topTotalStaff, ticketStaffPerDay] =
      await Promise.all([
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
      },
      totalStaffMessagesPerDay,
      topStaffByTotalMessages: topTotalStaff.map((r) => ({
        userId: String(r.user_id),
        count: Number(r.total),
      })),
      staffMessagesPerDay,
    };
  } catch (err) {
    console.error("[analytics] getEngagementAnalytics failed:", err);
    return null;
  }
}
