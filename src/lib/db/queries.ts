import {
  LEVELING_ACTIVE_SQL,
  TICKET_COLUMNS,
  TICKET_OPEN_SQL,
  TICKET_CLOSED_SQL,
} from "@/lib/db/schema-aliases";

export interface OverviewStats {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  totalLevelingUsers: number;
  activeLevelingUsers: number;
  totalBlacklists: number;
  ticketsToday: number;
}

export interface RecentTicket {
  channelID: string;
  ownerID: string;
  type: string;
  opened: string | null;
  closed: string | null;
  active: string | number;
  transcript: string | null;
}

export async function getOverviewStats(): Promise<OverviewStats | null> {
  const { queryOne, isDbConfigured } = await import("@/lib/db/pool");
  if (!isDbConfigured()) return null;

  try {
    const [ticketStats, levelingRow, blacklistRow] = await Promise.all([
      queryOne<{
        totalTickets: number;
        openTickets: number;
        closedTickets: number;
        ticketsToday: number;
      }>(
        `SELECT
          COUNT(*) AS totalTickets,
          SUM(${TICKET_OPEN_SQL}) AS openTickets,
          SUM(${TICKET_CLOSED_SQL}) AS closedTickets,
          SUM(
            opened_at > 0
            AND DATE(FROM_UNIXTIME(opened_at)) = CURDATE()
          ) AS ticketsToday
         FROM tickets`
      ),
      queryOne<{ totalLevelingUsers: number; activeLevelingUsers: number }>(
        `SELECT
          COUNT(*) AS totalLevelingUsers,
          SUM(${LEVELING_ACTIVE_SQL}) AS activeLevelingUsers
         FROM leveling`
      ),
      queryOne<{ totalBlacklists: number }>(
        `SELECT COUNT(*) AS totalBlacklists FROM blacklists`
      ),
    ]);

    if (!ticketStats) return null;

    return {
      totalTickets: Number(ticketStats.totalTickets ?? 0),
      openTickets: Number(ticketStats.openTickets ?? 0),
      closedTickets: Number(ticketStats.closedTickets ?? 0),
      ticketsToday: Number(ticketStats.ticketsToday ?? 0),
      totalLevelingUsers: Number(levelingRow?.totalLevelingUsers ?? 0),
      activeLevelingUsers: Number(levelingRow?.activeLevelingUsers ?? 0),
      totalBlacklists: Number(blacklistRow?.totalBlacklists ?? 0),
    };
  } catch (err) {
    console.error("[db] getOverviewStats failed:", err);
    return null;
  }
}

export async function getRecentTickets(limit = 10): Promise<RecentTicket[]> {
  const { query, isDbConfigured } = await import("@/lib/db/pool");
  if (!isDbConfigured()) return [];

  try {
    return query<RecentTicket>(
      `SELECT
        ${TICKET_COLUMNS},
        FROM_UNIXTIME(opened_at) AS opened,
        CASE
          WHEN closed_at IS NULL OR closed_at = 0 THEN NULL
          ELSE FROM_UNIXTIME(closed_at)
        END AS closed
       FROM tickets
       ORDER BY opened_at DESC
       LIMIT ?`,
      [limit]
    );
  } catch (err) {
    console.error("[db] getRecentTickets failed:", err);
    return [];
  }
}
