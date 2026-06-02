import {
  ACTIVE_STAFF_WHERE_STATISTICS,
} from "@/lib/analytics/staff-roster";
import {
  buildStaffLeaderboards,
  fetchStaffLeaderboardRows,
} from "@/lib/analytics/staff-shared";
import type { StaffRecentAnalytics } from "@/lib/analytics/types";
import { getLastStaffStatisticsWipeAt } from "@/lib/db/staff-statistics-wipes";
import { queryOne, isDbConfigured } from "@/lib/db/pool";

const PERIOD_TOTALS_SQL = `
  SELECT
    COALESCE(SUM(CAST(tickets_closed AS UNSIGNED)), 0) AS tickets,
    COALESCE(SUM(CAST(messages_sent AS UNSIGNED)), 0) AS messages,
    COALESCE(SUM(CAST(warnings AS UNSIGNED)), 0) AS warnings,
    COALESCE(SUM(CAST(screenshares AS UNSIGNED)), 0) AS screenshares,
    COUNT(*) AS staff
  FROM statistics
  WHERE ${ACTIVE_STAFF_WHERE_STATISTICS}`;

export async function getStaffRecentAnalytics(): Promise<StaffRecentAnalytics | null> {
  if (!isDbConfigured()) return null;

  try {
    const [rows, strikeCount, periodTotalsRow, lastWipedAt] = await Promise.all([
      fetchStaffLeaderboardRows("statistics"),
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
      getLastStaffStatisticsWipeAt(),
    ]);

    const totals = {
      ticketsClosed: Number(periodTotalsRow?.tickets ?? 0),
      messages: Number(periodTotalsRow?.messages ?? 0),
      warnings: Number(periodTotalsRow?.warnings ?? 0),
      screenshares: Number(periodTotalsRow?.screenshares ?? 0),
      staffCount: Number(periodTotalsRow?.staff ?? 0),
    };

    return {
      lastWipedAt,
      totals,
      strikeReportsTotal: strikeCount ? Number(strikeCount.total) : null,
      ...buildStaffLeaderboards(rows),
    };
  } catch (err) {
    console.error("[analytics] getStaffRecentAnalytics failed:", err);
    return null;
  }
}
