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
  active: number;
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
        (SELECT COUNT(*) FROM tickets WHERE active = 1) AS openTickets,
        (SELECT COUNT(*) FROM tickets WHERE active = 0) AS closedTickets,
        (SELECT COUNT(*) FROM polls) AS totalPolls,
        (SELECT COUNT(*) FROM leveling) AS totalLevelingUsers,
        (SELECT COUNT(*) FROM blacklists) AS totalBlacklists,
        (SELECT COUNT(*) FROM tickets WHERE DATE(opened) = CURDATE()) AS ticketsToday`
    );
    return stats;
  } catch {
    return null;
  }
}

export async function getRecentTickets(limit = 10): Promise<RecentTicket[]> {
  const { query, isDbConfigured } = await import("@/lib/db/pool");
  if (!isDbConfigured()) return [];

  try {
    return query<RecentTicket>(
      `SELECT channelID, ownerID, type, opened, closed, active, transcript
       FROM tickets
       ORDER BY opened DESC
       LIMIT ?`,
      [limit]
    );
  } catch {
    return [];
  }
}
