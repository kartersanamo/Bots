export interface OverviewStats {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  totalPolls: number;
  totalLevelingUsers: number;
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
    const stats = await queryOne<{
      totalTickets: number;
      openTickets: number;
      closedTickets: number;
      totalPolls: number;
      totalLevelingUsers: number;
      totalBlacklists: number;
      ticketsToday: number;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM tickets) AS totalTickets,
        (SELECT COUNT(*) FROM tickets WHERE active = 'True') AS openTickets,
        (SELECT COUNT(*) FROM tickets WHERE active IN ('False', '0')) AS closedTickets,
        (SELECT COUNT(*) FROM polls) AS totalPolls,
        (SELECT COUNT(*) FROM leveling) AS totalLevelingUsers,
        (SELECT COUNT(*) FROM blacklists) AS totalBlacklists,
        (SELECT COUNT(*) FROM tickets
         WHERE TRIM(opened_at) != ''
           AND DATE(FROM_UNIXTIME(CAST(opened_at AS UNSIGNED))) = CURDATE()) AS ticketsToday`
    );
    return stats;
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
