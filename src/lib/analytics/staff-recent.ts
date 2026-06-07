import {
  ACTIVE_STAFF_WHERE_STATISTICS,
} from "@/lib/analytics/staff-roster";
import { STAFF_STAT_FIELDS, staffStatSumSelectList } from "@/lib/analytics/staff-stat-fields";
import {
  buildStaffLeaderboards,
  fetchStaffLeaderboardRows,
} from "@/lib/analytics/staff-shared";
import type { StaffRecentAnalytics, StaffTotals } from "@/lib/analytics/types";
import { getLastStaffStatisticsWipeAt } from "@/lib/db/staff-statistics-wipes";
import { queryOne, isDbConfigured } from "@/lib/db/pool";

const PERIOD_TOTALS_SQL = `
  SELECT
    ${staffStatSumSelectList()},
    COUNT(*) AS staff
  FROM staff_statistics
  WHERE ${ACTIVE_STAFF_WHERE_STATISTICS}`;

function mapPeriodTotals(
  row: Record<string, unknown> | null
): StaffTotals {
  const totals = { staffCount: Number(row?.staff ?? 0) } as StaffTotals;
  for (const f of STAFF_STAT_FIELDS) {
    totals[f.key] = Number(row?.[f.key] ?? 0);
  }
  return totals;
}

export async function getStaffRecentAnalytics(): Promise<StaffRecentAnalytics | null> {
  if (!isDbConfigured()) return null;

  try {
    const [rows, periodTotalsRow, lastWipedAt] = await Promise.all([
      fetchStaffLeaderboardRows("staff_statistics"),
      queryOne<Record<string, unknown>>(PERIOD_TOTALS_SQL).catch(() => null),
      getLastStaffStatisticsWipeAt(),
    ]);

    return {
      lastWipedAt,
      totals: mapPeriodTotals(periodTotalsRow),
      ...buildStaffLeaderboards(rows),
    };
  } catch (err) {
    console.error("[analytics] getStaffRecentAnalytics failed:", err);
    return null;
  }
}
