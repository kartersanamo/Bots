import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";

export type AnalyticsRange =
  | "today"
  | "7d"
  | "30d"
  | "90d"
  | "365d"
  | "all";

export type { AnalyticsGroupBy };

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
  groupBy: AnalyticsGroupBy;
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
  groupBy: AnalyticsGroupBy;
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
  /** Current bi-weekly period (`statistics`, reset by /wipe). */
  totalsPeriod: {
    ticketsClosed: number;
    messages: number;
    warnings: number;
    screenshares: number;
    staffCount: number;
  };
  /** All-time (`total_statistics`, never wiped). Null if migration not applied. */
  totalsAllTime: {
    ticketsClosed: number;
    messages: number;
    warnings: number;
    screenshares: number;
    staffCount: number;
  } | null;
  duplicateStatisticsUsers: { userId: string; count: number }[];
  strikeReportsTotal: number | null;
}

export interface ModerationAnalytics {
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
  kpis: {
    activeBans: number;
    totalBlacklists: number;
    mediaEntries: number;
    blacklistsWithExpiry: number;
  };
  blacklistsPerDay: DailyCount[];
  blacklistsByStaff: UserCountRow[];
}

export interface AuditAnalytics {
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
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

export interface MemberJoinLeaveEvent {
  id: number;
  eventType: "join" | "leave";
  userId: string;
  inviteCode: string | null;
  accountAgeDays: number | null;
  createdAt: number;
}

export interface EngagementAnalytics {
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
  tablesReady: {
    memberMessages: boolean;
    ticketMessages: boolean;
    games: boolean;
    voice: boolean;
    memberEvents: boolean;
    snapshots: boolean;
    onlineSamples: boolean;
  };
  kpis: {
    /** All guild messages from users in the staff roster (`statistics`). */
    totalStaffMessagesInRange: number;
    /** Staff messages in channels with an active ticket. */
    staffMessagesInRange: number;
    /** Rows in the legacy `games` table (excludes test sessions). */
    totalGamesInRange: number;
    /** Voice channel seconds (`analytics_voice_daily`). */
    voiceSecondsInRange: number;
  };
  totalStaffMessagesPerDay: DailyCount[];
  topStaffByTotalMessages: UserCountRow[];
  staffMessagesPerDay: DailyCount[];
  totalGamesPerDay: DailyCount[];
  voiceSecondsPerDay: DailyCount[];
  topVoiceUsers: UserCountRow[];
  recentJoinLeaves: MemberJoinLeaveEvent[];
  serverSnapshots: { date: string; members: number; online: number }[];
  /** Average online members at each hour of day (combined across range). */
  playersOnlineByHour: NamedCount[];
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
