import { ALL_TIME_DATA_CAVEAT, type AnalyticsDataMeta } from "@/lib/analytics/hint";

const H: Record<string, AnalyticsDataMeta> = {
  "controls.range": {
    description:
      "Filters tickets, games, engagement, audit, and Staff (Total) metrics to a UTC time window. Does not change live snapshots (e.g. open tickets now).",
    rangeLabel: "Applies to the tab you are viewing after you change range.",
  },
  "controls.groupBy": {
    description:
      "Buckets time-series charts (daily / weekly / monthly). Available groupings depend on the selected range.",
    rangeLabel: "Works with the current range selector on supported tabs.",
  },

  // —— Overview ——
  "overview.openTickets": {
    description:
      "Tickets that are still open right now (valid opened_at, not closed). Snapshot, not limited to the selected range.",
    rangeLabel: "Snapshot: current database state (not filtered by dashboard range).",
  },
  "overview.openedRange": {
    description: "Tickets created during the selected dashboard range (opened_at).",
  },
  "overview.closedRange": {
    description: "Tickets closed during the selected dashboard range (closed_at).",
  },
  "overview.closeRate": {
    description:
      "Closed ÷ opened in the selected range, as a percentage. Can exceed 100% when clearing an older backlog.",
  },
  "overview.levelingUsers": {
    description:
      "Players with XP activity in the games database (leveling / XP system). Uses games overview, filtered by range where noted on the Games tab.",
  },
  "overview.xpInRange": {
    description: "Sum of XP from xp_logs rows whose timestamp falls in the selected range.",
  },
  "overview.xpEvents": {
    description: "Count of xp_logs rows in the selected range.",
  },
  "overview.activeBans": {
    description:
      "Ban count from the Discord API for this guild (live). Not tied to dashboard range.",
    rangeLabel: "Live Discord API snapshot when the overview loaded.",
  },
  "overview.blacklists": {
    description: "Total rows in the blacklists table (all time).",
    rangeLabel: `All rows in blacklists. ${ALL_TIME_DATA_CAVEAT}`,
  },
  "overview.staffTicketsClosed": {
    description:
      "Sum of tickets_closed from total_statistics for active staff (departed staff with all-zero period stats excluded).",
    rangeLabel: `Lifetime total_statistics. ${ALL_TIME_DATA_CAVEAT}`,
  },
  "overview.staffMessages": {
    description:
      "Sum of messages_sent from total_statistics for active staff.",
    rangeLabel: `Lifetime total_statistics. ${ALL_TIME_DATA_CAVEAT}`,
  },
  "overview.auditActions": {
    description: "Dashboard audit log entries in the selected range.",
  },
  "overview.chart.ticketFlow": {
    description:
      "Daily (or grouped) ticket opens vs closes from ticket metrics for the selected range.",
  },
  "overview.chart.xp": {
    description: "XP awarded per time bucket from xp_logs in the selected range.",
  },
  "overview.chart.audit": {
    description: "Dashboard audit actions per time bucket in the selected range.",
  },
  "overview.chart.ticketTypes": {
    description: "Opened tickets in range grouped by ticket type.",
  },
  "overview.chart.xpSources": {
    description: "Top XP sources (by event count) from games analytics for the range.",
  },
  "overview.table.topClosers": {
    description: "Staff who closed the most tickets in the selected range.",
  },
  "overview.table.topXp": {
    description: "Players who earned the most XP in the selected range.",
  },
  "overview.table.staffTickets": {
    description:
      "Active staff ranked by lifetime tickets closed (total_statistics).",
    rangeLabel: `Lifetime total_statistics. ${ALL_TIME_DATA_CAVEAT}`,
  },

  // —— Games ——
  "games.levelingUsers": {
    description:
      "Players considered active in the leveling system (games DB overview).",
    rangeLabel: "Snapshot from games tables; not range-filtered on this KPI.",
  },
  "games.everPlayed": {
    description: "Distinct players who have ever started a game session.",
    rangeLabel: "All-time games table count.",
  },
  "games.retention": {
    description: "Active leveling users divided by ever-played players.",
    rangeLabel: "Snapshot; see individual KPIs for range behavior.",
  },
  "games.sessions": {
    description:
      "Rows in games with game_id ≠ test sentinel (-999999). Open + completed sessions.",
    rangeLabel: "All-time session rows in games.",
  },
  "games.xpRange": {
    description: "Sum of XP from xp_logs in the selected dashboard range.",
  },
  "games.xpEvents": {
    description: "Number of xp_logs events in the selected range.",
  },
  "games.avgXp": {
    description: "Total XP in range ÷ number of XP log events in range.",
  },
  "games.achievementsAll": {
    description: "Total user_achievements rows (all time).",
    rangeLabel: `All achievement grants. ${ALL_TIME_DATA_CAVEAT}`,
  },
  "games.achievementsRange": {
    description: "Achievements earned (earned_at) within the selected range.",
  },
  "games.dailyClaimUsers": {
    description:
      "Players with a row in daily_claims (have used /daily at least once, all time).",
    rangeLabel: `All-time daily_claims rows. ${ALL_TIME_DATA_CAVEAT}`,
  },
  "games.claimsRange": {
    description:
      "Count of Daily Reward entries in xp_logs in the selected range (not the daily_claims table row count).",
  },
  "games.countingCurrent": {
    description:
      "Last accepted number in the counting channel (counting_server.last_number).",
    rangeLabel: "Live counting channel state; not range-filtered.",
  },
  "games.countingHighest": {
    description: "Highest number reached on the server (counting_server.highest_count).",
    rangeLabel: "Server record; not range-filtered.",
  },
  "games.countingUsers": {
    description: "Active staff on counting leaderboard (counting_users for this guild).",
    rangeLabel: "Current counting participants; not range-filtered.",
  },
  "games.countingMistakes": {
    description: "Sum of mistake counts across counting_users.",
    rangeLabel: "All-time counting mistakes; not range-filtered.",
  },
  "games.chart.xp": {
    description: "XP sum per time bucket from xp_logs in the selected range.",
  },
  "games.chart.sessions": {
    description:
      "Game sessions started per bucket (games.refreshed_at as Unix seconds).",
  },
  "games.chart.dailyClaims": {
    description: "Daily Reward XP events per bucket from xp_logs.",
  },
  "games.chart.achievements": {
    description: "Achievements earned per bucket (earned_at).",
  },
  "games.chart.xpSourcesEvents": {
    description: "Top XP sources in range by number of log events.",
  },
  "games.chart.xpSourcesXp": {
    description: "Top XP sources in range by total XP awarded.",
  },
  "games.chart.sessionsByGame": {
    description: "Session count in range grouped by game name.",
  },
  "games.chart.levelDist": {
    description: "Player count per level bracket (current levels).",
    rangeLabel: "Current level distribution; not range-filtered.",
  },
  "games.chart.sessionMode": {
    description: "Sessions in range split by DM vs channel mode.",
  },
  "games.chart.newPlayers": {
    description:
      "Players whose first XP timestamp falls in each bucket (first-time earners).",
  },
  "games.table.topXp": {
    description: "Highest XP earners in the selected range.",
  },
  "games.table.topCounters": {
    description:
      "Counting channel leaders by total successful counts (counting_users).",
    rangeLabel: "All-time counting stats; not range-filtered.",
  },
  "games.table.streaks": {
    description: "Longest current /daily streak from daily_claims.",
    rangeLabel: `All-time streak column. ${ALL_TIME_DATA_CAVEAT}`,
  },

  // —— Engagement ——
  "engagement.totalStaffMessages": {
    description:
      "Guild messages from users on the active staff roster (statistics join) rolled up from analytics_member_messages_daily.",
  },
  "engagement.staffTicketMessages": {
    description:
      "Staff messages in channels with an active ticket (analytics_ticket_messages_daily).",
  },
  "engagement.totalGames": {
    description:
      "Game sessions per day from games table (excludes test game_id -999999).",
  },
  "engagement.voiceTime": {
    description:
      "Seconds in voice from analytics_voice_daily (bot flushes ~every 30s while connected).",
  },
  "engagement.chart.totalStaffMessages": {
    description: "Staff roster guild messages per time bucket.",
  },
  "engagement.chart.staffTicketMessages": {
    description: "Staff messages in ticket channels per time bucket.",
  },
  "engagement.chart.games": {
    description: "Game sessions per time bucket.",
  },
  "engagement.chart.voice": {
    description: "Voice seconds per time bucket.",
  },
  "engagement.chart.peakOnline": {
    description:
      "Average players online by hour-of-day from analytics_online_samples in range.",
  },
  "engagement.chart.snapshots": {
    description:
      "Daily member count vs online count from analytics_guild_snapshots.",
  },
  "engagement.table.joinLeaves": {
    description:
      "Recent member join and leave events from analytics_member_events.",
  },
  "engagement.table.topVoice": {
    description: "Staff/users with the most voice time in the selected range.",
  },
  "engagement.table.topStaffMessages": {
    description: "Staff with the most guild messages in the selected range.",
  },

  // —— Tickets ——
  "tickets.avgPerDay": {
    description:
      "Tickets opened in range ÷ calendar days in range (not ÷ number of chart buckets).",
  },
  "tickets.openedRange": {
    description: "Tickets with opened_at in the selected range.",
  },
  "tickets.closedRange": {
    description: "Tickets with a valid closed_at in the selected range.",
  },
  "tickets.openNow": {
    description: "Currently open tickets (snapshot).",
    rangeLabel: "Current snapshot; not limited to dashboard range.",
  },
  "tickets.avgBetween": {
    description:
      "Mean time between consecutive ticket opens in range (sampled on very long ranges).",
  },
  "tickets.longestGap": {
    description:
      "Longest period without a new ticket open in range (sampled on very long ranges).",
  },
  "tickets.medianClose": {
    description: "Median seconds from open to close for tickets closed in range.",
  },
  "tickets.p90Close": {
    description: "90th percentile time to close for tickets closed in range.",
  },
  "tickets.closeRate": {
    description: "Percentage of opened-in-range tickets that also closed in range.",
  },
  "tickets.backlog": {
    description: "Opened in range minus closed in range (queue growth).",
  },
  "tickets.transcripts": {
    description: "Closed tickets in range that have a transcript saved.",
  },
  "tickets.chart.flow": {
    description: "Opened vs closed tickets per time bucket.",
  },
  "tickets.chart.opened": {
    description: "Tickets opened per time bucket.",
  },
  "tickets.chart.netQueue": {
    description: "Net change in open queue per bucket (opened − closed).",
  },
  "tickets.chart.closeRate": {
    description: "Close rate percentage per time bucket.",
  },
  "tickets.chart.byType": {
    description: "Opened tickets in range by ticket type.",
  },
  "tickets.chart.byTypeClosed": {
    description: "Closed tickets in range by ticket type.",
  },
  "tickets.chart.hourOpened": {
    description: "Opens by hour of day (UTC), combined across range.",
  },
  "tickets.chart.hourClosed": {
    description: "Closes by hour of day (UTC), combined across range.",
  },
  "tickets.chart.dowOpened": {
    description: "Opens by weekday, combined across range.",
  },
  "tickets.chart.dowClosed": {
    description: "Closes by weekday, combined across range.",
  },
  "tickets.chart.privacy": {
    description: "Opened tickets in range by public vs private visibility.",
  },
  "tickets.chart.closeReasons": {
    description: "Top normalized close reasons for tickets closed in range.",
  },
  "tickets.table.topOpenersRange": {
    description: "Users who opened the most tickets in the selected range.",
  },
  "tickets.table.topOpenersAll": {
    description: "Users who have opened the most tickets ever.",
    rangeLabel: `All ticket history. ${ALL_TIME_DATA_CAVEAT}`,
  },
  "tickets.table.closeByType": {
    description: "Median close time broken down by ticket type.",
  },
  "tickets.table.mostOneDay": {
    description: "Staff/users with the most tickets opened on a single day in range.",
  },
  "tickets.table.longestOpen": {
    description: "Tickets that stayed open the longest (still open or closed).",
  },
  "tickets.table.topStaffClosed": {
    description: "Staff who closed the most tickets in the selected range.",
  },

  // —— Staff recent ——
  "staffRecent.activeStaff": {
    description:
      "Staff with at least one non-zero counter in statistics (departed staff with all zeros excluded).",
    rangeApplies: false,
  },
  "staffRecent.tickets": {
    description: "Sum of tickets_closed in the current statistics period.",
    rangeApplies: false,
  },
  "staffRecent.messages": {
    description: "Sum of messages_sent in the current statistics period.",
    rangeApplies: false,
  },
  "staffRecent.warnings": {
    description: "Sum of warnings in the current statistics period.",
    rangeApplies: false,
  },
  "staffRecent.screenshares": {
    description: "Sum of screenshares in the current statistics period.",
    rangeApplies: false,
  },
  "staffRecent.strikes": {
    description: "Total rows in strike_reports (not reset by /wipe).",
    rangeLabel: `All-time strike_reports. ${ALL_TIME_DATA_CAVEAT}`,
    rangeApplies: false,
  },
  "staffRecent.table.overview": {
    description:
      "Per-staff breakdown for the current period (statistics table). Resets on /wipe.",
    rangeApplies: false,
  },
  "staffRecent.leaderboard.tickets": {
    description: "Staff ranked by tickets closed this period (statistics).",
    rangeApplies: false,
  },
  "staffRecent.leaderboard.messages": {
    description: "Staff ranked by messages this period (statistics).",
    rangeApplies: false,
  },
  "staffRecent.leaderboard.warnings": {
    description: "Staff ranked by warnings this period (statistics).",
    rangeApplies: false,
  },
  "staffRecent.leaderboard.screenshares": {
    description: "Staff ranked by screenshares this period (statistics).",
    rangeApplies: false,
  },

  // —— Staff total ——
  "staffTotal.activeStaff": {
    description:
      "Active staff with lifetime rows in total_statistics (departed excluded via statistics roster).",
    rangeLabel: `Active roster with total_statistics rows. ${ALL_TIME_DATA_CAVEAT}`,
  },
  "staffTotal.tickets": {
    description: "Lifetime tickets closed (total_statistics, never wiped).",
    rangeLabel: `Lifetime total_statistics. ${ALL_TIME_DATA_CAVEAT}`,
  },
  "staffTotal.messages": {
    description: "Lifetime staff messages counter (total_statistics).",
    rangeLabel: `Lifetime total_statistics. ${ALL_TIME_DATA_CAVEAT}`,
  },
  "staffTotal.warnings": {
    description: "Lifetime warnings issued (total_statistics).",
    rangeLabel: `Lifetime total_statistics. ${ALL_TIME_DATA_CAVEAT}`,
  },
  "staffTotal.screenshares": {
    description: "Lifetime screenshares (total_statistics).",
    rangeLabel: `Lifetime total_statistics. ${ALL_TIME_DATA_CAVEAT}`,
  },
  "staffTotal.chart.messages": {
    description:
      "Tracked staff messages per bucket from analytics_staff_messages_daily (bot tracking).",
  },
  "staffTotal.table.messagesLeaders": {
    description:
      "Staff with the most tracked messages in the selected range (analytics_staff_messages_daily).",
  },
  "staffTotal.table.overview": {
    description:
      "Lifetime per-staff totals from total_statistics (not reset by /wipe).",
    rangeLabel: `Lifetime total_statistics. ${ALL_TIME_DATA_CAVEAT}`,
  },
  "staffTotal.leaderboard.tickets": {
    description: "Lifetime tickets closed (total_statistics).",
    rangeLabel: `Lifetime total_statistics. ${ALL_TIME_DATA_CAVEAT}`,
  },
  "staffTotal.leaderboard.messages": {
    description: "Lifetime messages (total_statistics).",
    rangeLabel: `Lifetime total_statistics. ${ALL_TIME_DATA_CAVEAT}`,
  },
  "staffTotal.leaderboard.warnings": {
    description: "Lifetime warnings (total_statistics).",
    rangeLabel: `Lifetime total_statistics. ${ALL_TIME_DATA_CAVEAT}`,
  },
  "staffTotal.leaderboard.screenshares": {
    description: "Lifetime screenshares (total_statistics).",
    rangeLabel: `Lifetime total_statistics. ${ALL_TIME_DATA_CAVEAT}`,
  },

  // —— Moderation ——
  "moderation.activeBans": {
    description: "Current Discord guild ban count (API).",
    rangeLabel: "Live API snapshot.",
  },
  "moderation.blacklists": {
    description: "Total blacklist rows in the database.",
    rangeLabel: `All blacklists. ${ALL_TIME_DATA_CAVEAT}`,
  },
  "moderation.blacklistsExpiry": {
    description: "Blacklists that have a non-null expiration set.",
    rangeLabel: `All rows with expiry. ${ALL_TIME_DATA_CAVEAT}`,
  },
  "moderation.media": {
    description: "Rows in the media rank / media entries table.",
    rangeLabel: `All media entries. ${ALL_TIME_DATA_CAVEAT}`,
  },
  "moderation.chart.expiry": {
    description: "Blacklist expirations grouped by date in the selected range.",
  },
  "moderation.chart.byStaff": {
    description: "Blacklists created in range grouped by issuing staff.",
  },
  "moderation.table.byStaff": {
    description: "Staff ranked by blacklists issued (all time or range per query).",
  },

  // —— Audit ——
  "audit.actions": {
    description: "Rows in the dashboard audit log in the selected range.",
  },
  "audit.restarts": {
    description: "Fleet restart actions recorded in the audit log in range.",
  },
  "audit.failed": {
    description: "Audit log entries marked failed in the selected range.",
  },
  "audit.successRate": {
    description: "Successful actions ÷ total actions in range.",
  },
  "audit.chart.actions": {
    description: "Dashboard audit actions per time bucket.",
  },
  "audit.chart.byHour": {
    description: "Actions by hour of day (UTC) combined across range.",
  },
  "audit.chart.topTypes": {
    description: "Most common audit action types in range.",
  },
  "audit.chart.resources": {
    description: "Most targeted resources in audit log entries in range.",
  },
  "audit.table.actors": {
    description: "Dashboard users with the most audit actions in range.",
  },
};

export function analyticsHint(
  key: string,
  overrides?: Partial<AnalyticsDataMeta>
): AnalyticsDataMeta {
  const base = H[key];
  if (!base) {
    return {
      description: overrides?.description ?? `Metric: ${key}`,
      ...overrides,
    };
  }
  return { ...base, ...overrides };
}

/** Registry key from a KPI label (fallback). */
export function hintKeyFromLabel(prefix: string, label: string): string {
  return `${prefix}.${label.toLowerCase().replace(/[^a-z0-9]+/g, ".")}`;
}
