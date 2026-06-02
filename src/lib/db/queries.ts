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
          SUM(active = 'True') AS openTickets,
          SUM(active IN ('False', '0')) AS closedTickets,
          SUM(
            TRIM(opened_at) != ''
            AND DATE(FROM_UNIXTIME(CAST(opened_at AS UNSIGNED))) = CURDATE()
          ) AS ticketsToday
         FROM tickets`
      ),
      queryOne<{ totalLevelingUsers: number; activeLevelingUsers: number }>(
        `SELECT
          COUNT(*) AS totalLevelingUsers,
          SUM(active = '1' OR active = 1) AS activeLevelingUsers
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
        channelID,
        ownerID,
        type,
        FROM_UNIXTIME(CAST(opened_at AS UNSIGNED)) AS opened,
        CASE
          WHEN TRIM(closed_at) = '' OR closed_at IS NULL THEN NULL
          ELSE FROM_UNIXTIME(CAST(closed_at AS UNSIGNED))
        END AS closed,
        active,
        transcript
       FROM tickets
       ORDER BY CAST(opened_at AS UNSIGNED) DESC
       LIMIT ?`,
      [limit]
    );
  } catch (err) {
    console.error("[db] getRecentTickets failed:", err);
    return [];
  }
}
