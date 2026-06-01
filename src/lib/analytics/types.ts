export type AnalyticsRange = "7d" | "30d" | "90d" | "365d" | "all";

export interface DailyCount {
  date: string;
  count: number;
}

export interface NamedCount {
  name: string;
  count: number;
}

export interface UserCountRow {
  userId: string;
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

export interface CloseTimeByTypeRow {
  type: string;
  medianSeconds: number;
  count: number;
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
    closeRatePercent: number | null;
    withTranscriptCount: number;
    backlogDelta: number;
  };
  openedPerDay: DailyCount[];
  closedPerDay: DailyCount[];
  netQueuePerDay: DailyCount[];
  byType: NamedCount[];
  byTypeClosed: NamedCount[];
  byHour: NamedCount[];
  byHourClosed: NamedCount[];
  byDayOfWeek: NamedCount[];
  byDayOfWeekClosed: NamedCount[];
  visibilitySplit: NamedCount[];
  topOpenersInRange: TicketOpenerRow[];
  topOpenersAllTime: TicketOpenerRow[];
  topClosersInRange: UserCountRow[];
  topCloseReasons: NamedCount[];
  mostTicketsInOneDay: MostTicketsInDayRow[];
  longestOpenTickets: LongestTicketRow[];
  closeTimeByType: CloseTimeByTypeRow[];
  longestGap: TicketGapRow | null;
}

export interface GamesLeaderboardRow {
  userId: string;
  value: number;
}

export interface GamesAnalytics {
  range: AnalyticsRange;
  kpis: {
    activePlayers: number;
    everPlayed: number;
    openSessions: number;
    totalXpInRange: number;
    xpLogEventsInRange: number;
    avgXpPerEvent: number;
    totalAchievements: number;
    achievementsInRange: number;
    dailyClaimUsers: number;
    claimsInRange: number;
    countingUsers: number;
    countingTotalCounts: number;
    countingMistakes: number;
  };
  xpPerDay: DailyCount[];
  sessionsPerDay: DailyCount[];
  topXpSources: NamedCount[];
  newPlayersPerDay: DailyCount[];
  topXpEarners: GamesLeaderboardRow[];
  levelDistribution: NamedCount[];
  dailyClaimsPerDay: DailyCount[];
  achievementsPerDay: DailyCount[];
  sessionsByGame: NamedCount[];
  sessionModeSplit: NamedCount[];
  topStreaks: { userId: string; streak: number }[];
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
  topByMessages: StaffLeaderboardRow[];
  topByWarnings: StaffLeaderboardRow[];
  topByScreenshares: StaffLeaderboardRow[];
  totals: {
    ticketsClosed: number;
    messages: number;
    warnings: number;
    screenshares: number;
    staffCount: number;
  };
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
    mediaEntries: number;
    blacklistsWithExpiry: number;
  };
  blacklistsPerDay: DailyCount[];
  blacklistsByStaff: UserCountRow[];
  pollsCreatedPerDay: DailyCount[];
}

export interface AuditAnalytics {
  range: AnalyticsRange;
  actionsPerDay: DailyCount[];
  topActors: { actorId: string; count: number }[];
  topActions: NamedCount[];
  topTargets: NamedCount[];
  byHour: NamedCount[];
  fleetRestarts: number;
  totalInRange: number;
  failedActions: number;
  successRatePercent: number;
}

export interface EngagementAnalytics {
  range: AnalyticsRange;
  tablesReady: Record<string, boolean>;
  kpis: {
    staffMessagesInRange: number;
    ticketStaffMessages: number;
    ticketOwnerMessages: number;
    memberJoins: number;
    memberLeaves: number;
    voiceSecondsInRange: number;
    commandInvocations: number;
    modActions: number;
    pollVotes: number;
    gameSessionsEnded: number;
  };
  staffMessagesPerDay: DailyCount[];
  topStaffByMessages: UserCountRow[];
  ticketStaffMessagesPerDay: DailyCount[];
  ticketOwnerMessagesPerDay: DailyCount[];
  memberJoinsPerDay: DailyCount[];
  memberLeavesPerDay: DailyCount[];
  voiceSecondsPerDay: DailyCount[];
  topVoiceUsers: UserCountRow[];
  commandsPerDay: DailyCount[];
  topCommands: NamedCount[];
  modActionsPerDay: DailyCount[];
  modActionsByType: NamedCount[];
  topModActors: UserCountRow[];
  pollVotesPerDay: DailyCount[];
  gameOutcomesPerDay: DailyCount[];
  gameOutcomesByType: NamedCount[];
  serverSnapshots: {
    date: string;
    members: number;
    online: number;
    boostTier: number;
  }[];
  blacklistsCreatedPerDay: DailyCount[];
}

export interface AnalyticsSummary {
  range: AnalyticsRange;
  tickets: {
    openCount: number;
    openedInRange: number;
    closedInRange: number;
    avgPerDay: number;
    closeRatePercent: number | null;
  };
  games: {
    activePlayers: number;
    everPlayed: number;
    xpInRange: number;
    xpEventsInRange: number;
  };
  moderation: {
    activeBans: number;
    blacklists: number;
    polls: number;
  };
  staff: {
    totalMessages: number;
    totalTicketsClosed: number;
  };
  audit: {
    actionsInRange: number;
    fleetRestarts: number;
  };
}
