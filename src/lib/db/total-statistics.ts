import { query, queryOne, isDbConfigured } from "@/lib/db/pool";

export interface TotalStatisticsTotals {
  ticketsClosed: number;
  messages: number;
  warnings: number;
  screenshares: number;
  staffCount: number;
}

const TOTALS_SQL = `
  SELECT
    COALESCE(SUM(tickets_closed), 0) AS tickets,
    COALESCE(SUM(messages_sent), 0) AS messages,
    COALESCE(SUM(warnings), 0) AS warnings,
    COALESCE(SUM(screenshares), 0) AS screenshares,
    COUNT(*) AS staff
  FROM total_statistics`;

export async function getTotalStatisticsTotals(): Promise<TotalStatisticsTotals | null> {
  if (!isDbConfigured()) return null;
  const row = await queryOne<{
    tickets: number;
    messages: number;
    warnings: number;
    screenshares: number;
    staff: number;
  }>(TOTALS_SQL).catch(() => null);
  if (!row) return null;
  return {
    ticketsClosed: Number(row.tickets ?? 0),
    messages: Number(row.messages ?? 0),
    warnings: Number(row.warnings ?? 0),
    screenshares: Number(row.screenshares ?? 0),
    staffCount: Number(row.staff ?? 0),
  };
}

export async function totalStatisticsTableExists(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'total_statistics'`
  ).catch(() => null);
  return Number(row?.n ?? 0) > 0;
}
