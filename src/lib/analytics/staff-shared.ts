import {
  ACTIVE_STAFF_USER_IDS_SUBQUERY,
  ACTIVE_STAFF_WHERE_STATISTICS,
} from "@/lib/analytics/staff-roster";
import type { StaffLeaderboardRow } from "@/lib/analytics/types";
import { query } from "@/lib/db/pool";

export function mapStaffLeaderboardRow(r: {
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

export function buildStaffLeaderboards(rows: StaffLeaderboardRow[]) {
  return {
    leaderboard: rows.slice(0, 25),
    topByMessages: [...rows].sort((a, b) => b.messages - a.messages).slice(0, 20),
    topByWarnings: [...rows].sort((a, b) => b.warnings - a.warnings).slice(0, 20),
    topByScreenshares: [...rows]
      .sort((a, b) => b.screenshares - a.screenshares)
      .slice(0, 20),
  };
}

type StaffStatsTable = "statistics" | "total_statistics";

export async function fetchStaffLeaderboardRows(
  table: StaffStatsTable
): Promise<StaffLeaderboardRow[]> {
  const rows =
    table === "total_statistics"
      ? await query<{
          user_id: string;
          tickets_closed: number;
          messages: number;
          warnings: number;
          screenshares: number;
        }>(
          `SELECT t.user_ID AS user_id,
            COALESCE(t.tickets_closed, 0) AS tickets_closed,
            COALESCE(t.messages_sent, 0) AS messages,
            COALESCE(t.warnings, 0) AS warnings,
            COALESCE(t.screenshares, 0) AS screenshares
           FROM total_statistics t
           WHERE t.user_ID IN (${ACTIVE_STAFF_USER_IDS_SUBQUERY})
           ORDER BY t.tickets_closed DESC
           LIMIT 50`
        ).catch(() => [])
      : await query<{
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
           WHERE ${ACTIVE_STAFF_WHERE_STATISTICS}
           ORDER BY CAST(tickets_closed AS UNSIGNED) DESC
           LIMIT 50`
        ).catch(() => []);

  return rows.map(mapStaffLeaderboardRow);
}
