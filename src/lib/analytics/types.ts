import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import type { StaffStatKey, StaffStatsRow } from "@/lib/analytics/staff-stat-fields";
import type { GamesLeaderboardType, LeaderboardEntry } from "@/lib/games/types";

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
  /** Optional tooltip / export detail */
  detail?: string;
}

export interface EnrichedAuditTargetCount extends NamedCount {
  raw: string;
  category: string;
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
    /** Players with a row in `daily_claims` (ever used /daily). */
    dailyClaimUsers: number;
    /** `/daily` reward events in `xp_logs` for the selected range. */
    claimsInRange: number;
    /** Distinct players with at least one daily claim in range. */
    dailyClaimUsersInRange: number;
    countingUsers: number;
    countingMistakes: number;
    /** Current number in the counting channel (`counting_server.last_number`). */
    countingCurrentCount: number | null;
    /** Highest number reached on the server (`counting_server.highest_count`). */
    countingHighestCount: number | null;
  };
  topCounters: {
    userId: string;
    totalCounts: number;
    highestCount: number;
    mistakes: number;
  }[];
  xpPerDay: DailyCount[];
  sessionsPerDay: DailyCount[];
  topXpSources: NamedCount[];
  topXpSourcesByXp: NamedCount[];
  newPlayersPerDay: DailyCount[];
  topXpEarners: GamesLeaderboardRow[];
  levelDistribution: NamedCount[];
  dailyClaimsPerDay: DailyCount[];
  achievementsPerDay: DailyCount[];
  sessionsByGame: NamedCount[];
  sessionModeSplit: NamedCount[];
  topStreaks: { userId: string; streak: number }[];
  /** Top players per games leaderboard category (all-time & monthly). */
  leaderboards: Record<GamesLeaderboardType, LeaderboardEntry[]>;
}

export type StaffLeaderboardRow = StaffStatsRow;

export type StaffTotals = {
  staffCount: number;
} & Record<StaffStatKey, number>;

export interface StaffLeaderboards {
  /** All active staff rows from the query (up to fetch limit). */
  staffRows: StaffLeaderboardRow[];
  leaderboard: StaffLeaderboardRow[];
  topsByStat: Record<StaffStatKey, StaffLeaderboardRow[]>;
  topByMessages: StaffLeaderboardRow[];
  topByWarnings: StaffLeaderboardRow[];
  topByScreenshares: StaffLeaderboardRow[];
}

/** Current period (`statistics`, reset by /wipe). */
export interface StaffRecentAnalytics extends StaffLeaderboards {
  totals: StaffTotals;
  /** Unix seconds of last /wipe, if recorded. */
  lastWipedAt: number | null;
}

/** Lifetime (`total_statistics`) + tracked messages in selected range. */
export interface StaffTotalAnalytics extends StaffLeaderboards {
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
  totals: StaffTotals;
  messagesPerDay: DailyCount[];
  topStaffByMessagesInRange: UserCountRow[];
}

export interface ModerationAnalytics {
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
  kpis: {
    activeBans: number;
    activeTimeouts: number;
    totalBlacklists: number;
    mediaEntries: number;
    blacklistsWithExpiry: number;
  };
  blacklistsPerDay: DailyCount[];
  blacklistsByStaff: UserCountRow[];
  /** Dashboard-recorded mod actions in range (when analytics_mod_actions exists). */
  modActionsPerDay: DailyCount[];
  modActionsByType: NamedCount[];
  modActionsInRange: number;
  trackingModActions: boolean;
}

export interface AuditAnalytics {
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
  actionsPerDay: DailyCount[];
  topActors: { actorId: string; count: number }[];
  topActions: NamedCount[];
  topTargets: EnrichedAuditTargetCount[];
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
    activeTimeouts: number;
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
