import type { StaffAnalytics, StaffLeaderboardRow } from "@/lib/analytics/types";
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

export async function getStaffAnalytics(): Promise<StaffAnalytics | null> {
  if (!isDbConfigured()) return null;

  try {
    const [leaderboard, duplicates, strikeCount, totalsRow] = await Promise.all([
      query<{
        user_id: string;
        tickets_closed: number;
        messages: number;
        warnings: number;
        screenshares: number;
      }>(
        `SELECT user_ID AS user_id,
          COALESCE(CAST(tickets_closed AS UNSIGNED), 0) AS tickets_closed,
          COALESCE(CAST(messages_sent AS UNSIGNED), 0) AS messages,
          COALESCE(CAST(warnings AS UNSIGNED), 0) AS warnings,
          COALESCE(CAST(screenshares AS UNSIGNED), 0) AS screenshares
         FROM statistics
         ORDER BY CAST(tickets_closed AS UNSIGNED) DESC
         LIMIT 50`
      ).catch(() => []),
      query<{ user_ID: string; cnt: number }>(
        `SELECT user_ID, COUNT(*) AS cnt
         FROM statistics GROUP BY user_ID HAVING COUNT(*) > 1`
      ).catch(() => []),
      queryOne<{ total: number }>(
        `SELECT COUNT(*) AS total FROM strike_reports`
      ).catch(() => null),
      queryOne<{
        tickets: number;
        messages: number;
        warnings: number;
        screenshares: number;
        staff: number;
      }>(
        `SELECT
          COALESCE(SUM(CAST(tickets_closed AS UNSIGNED)), 0) AS tickets,
          COALESCE(SUM(CAST(messages_sent AS UNSIGNED)), 0) AS messages,
          COALESCE(SUM(CAST(warnings AS UNSIGNED)), 0) AS warnings,
          COALESCE(SUM(CAST(screenshares AS UNSIGNED)), 0) AS screenshares,
          COUNT(*) AS staff
         FROM statistics`
      ).catch(() => null),
    ]);

    const rows = leaderboard.map(mapRow);
    const byMessages = [...rows].sort((a, b) => b.messages - a.messages).slice(0, 20);
    const byWarnings = [...rows].sort((a, b) => b.warnings - a.warnings).slice(0, 20);
    const byScreenshares = [...rows]
      .sort((a, b) => b.screenshares - a.screenshares)
      .slice(0, 20);

    return {
      leaderboard: rows.slice(0, 25),
      topByMessages: byMessages,
      topByWarnings: byWarnings,
      topByScreenshares: byScreenshares,
      totals: {
        ticketsClosed: Number(totalsRow?.tickets ?? 0),
        messages: Number(totalsRow?.messages ?? 0),
        warnings: Number(totalsRow?.warnings ?? 0),
        screenshares: Number(totalsRow?.screenshares ?? 0),
        staffCount: Number(totalsRow?.staff ?? 0),
      },
      duplicateStatisticsUsers: duplicates.map((r) => ({
        userId: String(r.user_ID),
        count: Number(r.cnt),
      })),
      strikeReportsTotal: strikeCount ? Number(strikeCount.total) : null,
    };
  } catch (err) {
    console.error("[analytics] getStaffAnalytics failed:", err);
    return null;
  }
}
