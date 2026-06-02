import { ACTIVE_STAFF_USER_IDS_SUBQUERY } from "@/lib/analytics/staff-roster";
import {
  STAFF_STAT_FIELDS,
  type StaffStatKey,
} from "@/lib/analytics/staff-stat-fields";
import type { StaffTotals } from "@/lib/analytics/types";
import { query, queryOne, isDbConfigured } from "@/lib/db/pool";

const TOTALS_SQL = `
  SELECT
    ${STAFF_STAT_FIELDS.map(
      (f) => `COALESCE(SUM(${f.column}), 0) AS ${f.key}`
    ).join(",\n    ")},
    COUNT(*) AS staff
  FROM total_statistics
  WHERE user_ID IN (${ACTIVE_STAFF_USER_IDS_SUBQUERY})`;

export async function getTotalStatisticsTotals(): Promise<StaffTotals | null> {
  if (!isDbConfigured()) return null;
  const row = await queryOne<Record<string, unknown>>(TOTALS_SQL).catch(
    () => null
  );
  if (!row) return null;

  const totals = { staffCount: Number(row.staff ?? 0) } as StaffTotals;
  for (const f of STAFF_STAT_FIELDS) {
    totals[f.key] = Number(row[f.key] ?? 0);
  }
  return totals;
}

export async function totalStatisticsTableExists(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'total_statistics'`
  ).catch(() => null);
  return Number(row?.n ?? 0) > 0;
}

export type { StaffStatKey };
