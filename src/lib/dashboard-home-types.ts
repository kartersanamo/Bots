export type DashboardHomePayload = {
  stats: {
    totalTickets: number;
    openTickets: number;
    closedTickets: number;
    totalLevelingUsers: number;
    activeLevelingUsers: number;
    totalBlacklists: number;
    ticketsToday: number;
  };
  tickets: {
    channelID: string;
    ownerID: string;
    type: string;
    opened: string | null;
    closed: string | null;
    active: string | number;
  }[];
  configured: boolean;
  connected: boolean;
  guild: {
    name: string;
    memberCount: number;
    approximatePresenceCount?: number;
  } | null;
  bots: { id: string; shortName: string; status: string }[];
};
