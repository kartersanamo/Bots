import { queryOne, isDbConfigured } from "@/lib/db/pool";

export async function staffStatisticsWipesTableExists(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'staff_statistics_wipes'`
  ).catch(() => null);
  return Number(row?.n ?? 0) > 0;
}

/** Unix seconds of the most recent /wipe, or null if unknown. */
export async function getLastStaffStatisticsWipeAt(): Promise<number | null> {
  if (!isDbConfigured()) return null;
  const hasTable = await staffStatisticsWipesTableExists();
  if (!hasTable) return null;
  const row = await queryOne<{ wiped_at: number }>(
    `SELECT wiped_at FROM staff_statistics_wipes
     ORDER BY wiped_at DESC LIMIT 1`
  ).catch(() => null);
  if (row?.wiped_at == null) return null;
  const ts = Number(row.wiped_at);
  return ts > 0 ? ts : null;
}
