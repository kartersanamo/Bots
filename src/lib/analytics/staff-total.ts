import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import { rangeSinceUnix } from "@/lib/analytics/range";
import { activeStaffStatisticsJoin } from "@/lib/analytics/staff-roster";
import {
  buildStaffLeaderboards,
  fetchStaffLeaderboardRows,
} from "@/lib/analytics/staff-shared";
import {
  bucketKeySqlFromDate,
  buildTimeBucketSpec,
  normalizeTimeSeries,
} from "@/lib/analytics/time-buckets";
import type {
  AnalyticsRange,
  DailyCount,
  StaffTotalAnalytics,
} from "@/lib/analytics/types";
import { getTotalStatisticsTotals, totalStatisticsTableExists } from "@/lib/db/total-statistics";
import { query, isDbConfigured } from "@/lib/db/pool";

function mapDaily(rows: { date: string | Date; count: number }[]): DailyCount[] {
  return rows.map((r) => ({
    date:
      r.date instanceof Date
        ? r.date.toISOString().slice(0, 10)
        : String(r.date).slice(0, 10),
    count: Number(r.count),
  }));
}

export async function getStaffTotalAnalytics(
  range: AnalyticsRange,
  groupBy: AnalyticsGroupBy
): Promise<StaffTotalAnalytics | null> {
  if (!isDbConfigured()) return null;

  const hasTotal = await totalStatisticsTableExists();
  if (!hasTotal) return null;

  const since = rangeSinceUnix(range);
  const bucketSpec = buildTimeBucketSpec(range, groupBy);
  const dayBucket = bucketKeySqlFromDate("d.day", bucketSpec);
  const dayClause = since != null ? " AND d.day >= DATE(FROM_UNIXTIME(?))" : "";
  const dayParams = since != null ? [since] : [];

  try {
    const [rows, allTimeTotals, messagesPerDay, topByMessagesInRange] =
      await Promise.all([
        fetchStaffLeaderboardRows("total_statistics"),
        getTotalStatisticsTotals(),
        query<{ date: string; count: number }>(
          `SELECT ${dayBucket} AS date, SUM(d.message_count) AS count
           FROM analytics_staff_messages_daily d
           INNER JOIN statistics s ON s.user_ID = d.user_id
             AND ${activeStaffStatisticsJoin("s")}
           WHERE 1=1${dayClause}
           GROUP BY date ORDER BY date`,
          dayParams
        ).catch(() => []),
        query<{ user_id: string; total: number }>(
          `SELECT d.user_id, SUM(d.message_count) AS total
           FROM analytics_staff_messages_daily d
           INNER JOIN statistics s ON s.user_ID = d.user_id
             AND ${activeStaffStatisticsJoin("s")}
           WHERE 1=1${dayClause}
           GROUP BY d.user_id ORDER BY total DESC LIMIT 25`,
          dayParams
        ).catch(() => []),
      ]);

    const totals = allTimeTotals ?? {
      ticketsClosed: 0,
      messages: 0,
      warnings: 0,
      screenshares: 0,
      staffCount: 0,
    };

    return {
      range,
      groupBy,
      totals,
      messagesPerDay: normalizeTimeSeries(
        mapDaily(messagesPerDay),
        range,
        groupBy
      ),
      topStaffByMessagesInRange: topByMessagesInRange.map((r) => ({
        userId: String(r.user_id),
        count: Number(r.total),
      })),
      ...buildStaffLeaderboards(rows),
    };
  } catch (err) {
    console.error("[analytics] getStaffTotalAnalytics failed:", err);
    return null;
  }
}
