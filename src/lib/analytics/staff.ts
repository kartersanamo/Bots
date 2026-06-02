import {
  ACTIVE_STAFF_USER_IDS_SUBQUERY,
  ACTIVE_STAFF_WHERE_STATISTICS,
} from "@/lib/analytics/staff-roster";
import type { StaffAnalytics, StaffLeaderboardRow } from "@/lib/analytics/types";
import { getTotalStatisticsTotals, totalStatisticsTableExists } from "@/lib/db/total-statistics";
import { query, queryOne, isDbConfigured } from "@/lib/db/pool";

function mapRow(r: {
  user_id: string;
  tickets_closed: number;
  messages: number;
  warnings: number;
  screenshares: number;
}): StaffLeaderboardRow {
  return {
    userId: String(r.user_id),
    ticketsClosed: Number(r.tickets_closed),
    messages: Number(r.messages),
    warnings: Number(r.warnings),
    screenshares: Number(r.screenshares),
  };
}

function leaderboardQuery(table: "total_statistics" | "statistics") {
  if (table === "total_statistics") {
    return `SELECT t.user_ID AS user_id,
      COALESCE(t.tickets_closed, 0) AS tickets_closed,
      COALESCE(t.messages_sent, 0) AS messages,
      COALESCE(t.warnings, 0) AS warnings,
      COALESCE(t.screenshares, 0) AS screenshares
     FROM total_statistics t
     WHERE t.user_ID IN (${ACTIVE_STAFF_USER_IDS_SUBQUERY})
     ORDER BY t.tickets_closed DESC
     LIMIT 50`;
  }
  return `SELECT user_ID AS user_id,
      COALESCE(CAST(tickets_closed AS UNSIGNED), 0) AS tickets_closed,
      COALESCE(CAST(messages_sent AS UNSIGNED), 0) AS messages,
      COALESCE(CAST(warnings AS UNSIGNED), 0) AS warnings,
      COALESCE(CAST(screenshares AS UNSIGNED), 0) AS screenshares
     FROM statistics
     WHERE ${ACTIVE_STAFF_WHERE_STATISTICS}
     ORDER BY CAST(tickets_closed AS UNSIGNED) DESC
     LIMIT 50`;
}

const PERIOD_TOTALS_SQL = `
  SELECT
    COALESCE(SUM(CAST(tickets_closed AS UNSIGNED)), 0) AS tickets,
    COALESCE(SUM(CAST(messages_sent AS UNSIGNED)), 0) AS messages,
    COALESCE(SUM(CAST(warnings AS UNSIGNED)), 0) AS warnings,
    COALESCE(SUM(CAST(screenshares AS UNSIGNED)), 0) AS screenshares,
    COUNT(*) AS staff
  FROM statistics
  WHERE ${ACTIVE_STAFF_WHERE_STATISTICS}`;

export async function getStaffAnalytics(): Promise<StaffAnalytics | null> {
  if (!isDbConfigured()) return null;

  const hasTotal = await totalStatisticsTableExists();
  const lbTable: "total_statistics" | "statistics" = hasTotal
    ? "total_statistics"
    : "statistics";

  try {
    const [leaderboard, strikeCount, periodTotalsRow, allTimeTotals] =
      await Promise.all([
        query<{
          user_id: string;
          tickets_closed: number;
          messages: number;
          warnings: number;
          screenshares: number;
        }>(leaderboardQuery(lbTable)).catch(() => []),
        queryOne<{ total: number }>(
          `SELECT COUNT(*) AS total FROM strike_reports`
        ).catch(() => null),
        queryOne<{
          tickets: number;
          messages: number;
          warnings: number;
          screenshares: number;
          staff: number;
        }>(PERIOD_TOTALS_SQL).catch(() => null),
        hasTotal ? getTotalStatisticsTotals() : Promise.resolve(null),
      ]);

    const rows = leaderboard.map(mapRow);
    const byMessages = [...rows].sort((a, b) => b.messages - a.messages).slice(0, 20);
    const byWarnings = [...rows].sort((a, b) => b.warnings - a.warnings).slice(0, 20);
    const byScreenshares = [...rows]
      .sort((a, b) => b.screenshares - a.screenshares)
      .slice(0, 20);

    const periodTotals = {
      ticketsClosed: Number(periodTotalsRow?.tickets ?? 0),
      messages: Number(periodTotalsRow?.messages ?? 0),
      warnings: Number(periodTotalsRow?.warnings ?? 0),
      screenshares: Number(periodTotalsRow?.screenshares ?? 0),
      staffCount: Number(periodTotalsRow?.staff ?? 0),
    };

    const totals = allTimeTotals ?? periodTotals;

    return {
      leaderboard: rows.slice(0, 25),
      topByMessages: byMessages,
      topByWarnings: byWarnings,
      topByScreenshares: byScreenshares,
      totals,
      totalsPeriod: periodTotals,
      totalsAllTime: allTimeTotals,
      strikeReportsTotal: strikeCount ? Number(strikeCount.total) : null,
    };
  } catch (err) {
    console.error("[analytics] getStaffAnalytics failed:", err);
    return null;
  }
}
