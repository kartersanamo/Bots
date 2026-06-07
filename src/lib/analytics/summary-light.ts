import { getAuditSummaryInRange } from "@/lib/analytics/audit-data";
import { analyticsPrivatedClause } from "@/lib/analytics/privated";
import {
  calendarDaysInRange,
  closedAtRangeClause,
  openedAtRangeClause,
  rangeSinceUnix,
} from "@/lib/analytics/range";
import type { AnalyticsRange, AnalyticsSummary } from "@/lib/analytics/types";
import { fetchGuildBanCount } from "@/lib/discord/api";
import { fetchGuildTimeoutCount } from "@/lib/discord/guild-timeouts";
import { getTotalStatisticsTotals } from "@/lib/db/total-statistics";
import { getGamesOverview } from "@/lib/db/games";
import { getTicketStats } from "@/lib/db/tickets";
import { isDbConfigured, queryOne } from "@/lib/db/pool";
import type { PermissionTier } from "@/lib/permissions";
import { TICKET_VALID_CLOSED_SQL } from "@/lib/db/schema-aliases";

const VALID_CLOSED = TICKET_VALID_CLOSED_SQL;

/** Lightweight KPIs — no full ticket analytics pass. */
export async function getAnalyticsSummaryLight(
  tier: PermissionTier,
  range: AnalyticsRange
): Promise<AnalyticsSummary> {
  if (!isDbConfigured()) {
    return emptySummary(range);
  }

  const priv = analyticsPrivatedClause(tier);
  const openedRange = openedAtRangeClause(range);
  const closedRange = closedAtRangeClause(range);
  const since = rangeSinceUnix(range);
  const tsClause = since != null ? " AND CAST(timestamp AS UNSIGNED) >= ?" : "";
  const tsParams = since != null ? [since] : [];

  const baseWhere = `WHERE opened_at > 0${priv.sql}`;
  const baseParams = [...priv.params];

  const [
    ticketStats,
    openedInRangeRow,
    closedInRangeRow,
    games,
    mod,
    discordBanCount,
    discordTimeoutCount,
    auditSummary,
    xpRow,
    staffTotals,
    spanDaysRow,
  ] = await Promise.all([
    getTicketStats(tier),
    queryOne<{ count: number }>(
      `SELECT COUNT(*) AS count FROM tickets ${baseWhere}${openedRange.sql}`,
      [...baseParams, ...openedRange.params]
    ),
    queryOne<{ count: number }>(
      `SELECT COUNT(*) AS count FROM tickets ${baseWhere} AND ${VALID_CLOSED}${closedRange.sql}`,
      [...baseParams, ...closedRange.params]
    ),
    getGamesOverview(),
    queryOne<{ totalBlacklists: number }>(
      `SELECT COUNT(*) AS totalBlacklists FROM blacklists`
    ).catch(() => null),
    fetchGuildBanCount().catch(() => null),
    fetchGuildTimeoutCount().catch(() => null),
    getAuditSummaryInRange(range),
    queryOne<{ total: number; events: number }>(
      `SELECT COALESCE(SUM(xp), 0) AS total, COUNT(*) AS events
       FROM xp_logs WHERE CAST(timestamp AS UNSIGNED) > 0${tsClause}`,
      tsParams
    ).catch(() => null),
    getTotalStatisticsTotals(),
    range === "all"
      ? queryOne<{ days: number }>(
          `SELECT GREATEST(
             1,
             CEIL((UNIX_TIMESTAMP() - MIN(opened_at)) / 86400)
           ) AS days
           FROM tickets ${baseWhere}`,
          baseParams
        )
      : Promise.resolve(null),
  ]);

  const openedInRange = Number(openedInRangeRow?.count ?? 0);
  const closedInRange = Number(closedInRangeRow?.count ?? 0);
  const daysInRange =
    calendarDaysInRange(range) ||
    Number(spanDaysRow?.days ?? 1);
  const avgPerDay =
    daysInRange > 0 ? openedInRange / daysInRange : 0;
  const closeRatePercent =
    openedInRange > 0
      ? Math.round((closedInRange / openedInRange) * 1000) / 10
      : null;

  return {
    range,
    tickets: {
      openCount: ticketStats?.openCount ?? 0,
      openedInRange,
      closedInRange,
      avgPerDay,
      closeRatePercent,
    },
    games: {
      activePlayers: games?.activePlayers ?? 0,
      everPlayed: games?.everPlayed ?? 0,
      xpInRange: Number(xpRow?.total ?? 0),
      xpEventsInRange: Number(xpRow?.events ?? 0),
    },
    moderation: {
      activeBans: discordBanCount ?? 0,
      activeTimeouts: discordTimeoutCount ?? 0,
      blacklists: Number(mod?.totalBlacklists ?? 0),
    },
    staff: {
      totalMessages: Number(staffTotals?.messages ?? 0),
      totalTicketsClosed: Number(staffTotals?.ticketsClosed ?? 0),
    },
    audit: {
      actionsInRange: auditSummary.total,
      fleetRestarts: auditSummary.fleetRestarts,
    },
  };
}

function emptySummary(range: AnalyticsRange): AnalyticsSummary {
  return {
    range,
    tickets: {
      openCount: 0,
      openedInRange: 0,
      closedInRange: 0,
      avgPerDay: 0,
      closeRatePercent: null,
    },
    games: {
      activePlayers: 0,
      everPlayed: 0,
      xpInRange: 0,
      xpEventsInRange: 0,
    },
    moderation: {
      activeBans: 0,
      activeTimeouts: 0,
      blacklists: 0,
    },
    staff: { totalMessages: 0, totalTicketsClosed: 0 },
    audit: { actionsInRange: 0, fleetRestarts: 0 },
  };
}
