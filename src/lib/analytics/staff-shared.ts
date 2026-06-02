import {
  ACTIVE_STAFF_USER_IDS_SUBQUERY,
  ACTIVE_STAFF_WHERE_STATISTICS,
} from "@/lib/analytics/staff-roster";
import {
  mapStaffStatsRow,
  STAFF_STAT_FIELDS,
  type StaffStatKey,
  type StaffStatsRow,
  staffStatSelectList,
} from "@/lib/analytics/staff-stat-fields";
import type { StaffLeaderboardRow, StaffLeaderboards } from "@/lib/analytics/types";
import { query } from "@/lib/db/pool";

export type { StaffStatsRow as StaffLeaderboardRow };

export function buildStaffLeaderboards(rows: StaffStatsRow[]): StaffLeaderboards {
  const topsByStat = {} as Record<StaffStatKey, StaffStatsRow[]>;
  for (const { key } of STAFF_STAT_FIELDS) {
    topsByStat[key] = [...rows]
      .filter((r) => r[key] > 0)
      .sort((a, b) => b[key] - a[key])
      .slice(0, 20);
  }

  return {
    staffRows: rows,
    leaderboard: [...rows]
      .sort((a, b) => b.ticketsClosed - a.ticketsClosed)
      .slice(0, 25),
    topsByStat,
    topByMessages: topsByStat.messages,
    topByWarnings: topsByStat.warnings,
    topByScreenshares: topsByStat.screenshares,
  };
}

type StaffStatsTable = "statistics" | "total_statistics";

export async function fetchStaffLeaderboardRows(
  table: StaffStatsTable
): Promise<StaffStatsRow[]> {
  const rows =
    table === "total_statistics"
      ? await query<Record<string, unknown>>(
          `SELECT t.user_ID AS user_id,
            ${staffStatSelectList("total_statistics")}
           FROM total_statistics t
           WHERE t.user_ID IN (${ACTIVE_STAFF_USER_IDS_SUBQUERY})
           ORDER BY t.tickets_closed DESC
           LIMIT 50`
        ).catch(() => [])
      : await query<Record<string, unknown>>(
          `SELECT user_ID AS user_id,
            ${staffStatSelectList("statistics")}
           FROM statistics
           WHERE ${ACTIVE_STAFF_WHERE_STATISTICS}
           ORDER BY CAST(tickets_closed AS UNSIGNED) DESC
           LIMIT 50`
        ).catch(() => []);

  return rows.map((r) => mapStaffStatsRow(String(r.user_id), r));
}
