import type { StaffAnalytics, StaffLeaderboardRow } from "@/lib/analytics/types";
import { query, queryOne, isDbConfigured } from "@/lib/db/pool";

export async function getStaffAnalytics(): Promise<StaffAnalytics | null> {
  if (!isDbConfigured()) return null;

  try {
    const [leaderboard, duplicates, strikeCount] = await Promise.all([
      query<{
        user_id: string;
        tickets_closed: number;
        messages: number;
        warnings: number;
        screenshares: number;
      }>(
        `SELECT user_id,
          COALESCE(tickets_closed, 0) AS tickets_closed,
          COALESCE(messages, 0) AS messages,
          COALESCE(warnings, 0) AS warnings,
          COALESCE(screenshares, 0) AS screenshares
         FROM statistics
         ORDER BY tickets_closed DESC
         LIMIT 25`
      ).catch(() => []),
      query<{ user_ID: string; cnt: number }>(
        `SELECT user_id AS user_ID, COUNT(*) AS cnt
         FROM statistics GROUP BY user_id HAVING COUNT(*) > 1`
      ).catch(() => []),
      queryOne<{ total: number }>(
        `SELECT COUNT(*) AS total FROM strike_reports`
      ).catch(() => null),
    ]);

    return {
      leaderboard: leaderboard.map(
        (r): StaffLeaderboardRow => ({
          userId: String(r.user_id),
          ticketsClosed: Number(r.tickets_closed),
          messages: Number(r.messages),
          warnings: Number(r.warnings),
          screenshares: Number(r.screenshares),
        })
      ),
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
