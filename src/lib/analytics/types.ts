export type AnalyticsRange = "7d" | "30d" | "90d" | "365d" | "all";

export interface DailyCount {
  date: string;
  count: number;
}

export interface NamedCount {
  name: string;
  count: number;
}

export interface TicketOpenerRow {
  ownerId: string;
  count: number;
}

export interface MostTicketsInDayRow {
  ownerId: string;
  date: string;
  count: number;
}

export interface LongestTicketRow {
  channelId: string;
  ownerId: string;
  type: string;
  number: string;
  openedAt: number;
  closedAt: number;
  durationSeconds: number;
}

export interface TicketGapRow {
  currentChannelId: string;
  currentOpenedAt: number;
  previousChannelId: string;
  previousOpenedAt: number;
  gapSeconds: number;
}

export interface TicketAnalytics {
  range: AnalyticsRange;
  kpis: {
    avgTicketsPerDay: number;
    avgTimeBetweenTicketsSeconds: number | null;
    longestGapSeconds: number | null;
    openCount: number;
    closedInRange: number;
    openedInRange: number;
    medianCloseSeconds: number | null;
    p90CloseSeconds: number | null;
  };
  openedPerDay: DailyCount[];
  closedPerDay: DailyCount[];
  byType: NamedCount[];
  byHour: NamedCount[];
  byDayOfWeek: NamedCount[];
  topOpenersInRange: TicketOpenerRow[];
  topOpenersAllTime: TicketOpenerRow[];
  mostTicketsInOneDay: MostTicketsInDayRow[];
  longestOpenTickets: LongestTicketRow[];
  longestGap: TicketGapRow | null;
}

export interface GamesAnalytics {
  range: AnalyticsRange;
  kpis: {
    activePlayers: number;
    everPlayed: number;
    openSessions: number;
    totalXpInRange: number;
    xpLogEventsInRange: number;
  };
  xpPerDay: DailyCount[];
  sessionsPerDay: DailyCount[];
  topXpSources: NamedCount[];
  newPlayersPerDay: DailyCount[];
}

export interface StaffLeaderboardRow {
  userId: string;
  ticketsClosed: number;
  messages: number;
  warnings: number;
  screenshares: number;
}

export interface StaffAnalytics {
  leaderboard: StaffLeaderboardRow[];
  duplicateStatisticsUsers: { userId: string; count: number }[];
  strikeReportsTotal: number | null;
}

export interface ModerationAnalytics {
  range: AnalyticsRange;
  kpis: {
    activeBans: number;
    totalBlacklists: number;
    activePolls: number;
    totalPolls: number;
  };
  blacklistsPerDay: DailyCount[];
  pollsCreatedPerDay: DailyCount[];
}

export interface AuditAnalytics {
  range: AnalyticsRange;
  actionsPerDay: DailyCount[];
  topActors: { actorId: string; count: number }[];
  topActions: NamedCount[];
  fleetRestarts: number;
  totalInRange: number;
}

export interface AnalyticsSummary {
  range: AnalyticsRange;
  tickets: {
    openCount: number;
    openedInRange: number;
    avgPerDay: number;
  };
  games: {
    activePlayers: number;
    xpInRange: number;
  };
  moderation: {
    activeBans: number;
    blacklists: number;
  };
  audit: {
    actionsInRange: number;
  };
}
