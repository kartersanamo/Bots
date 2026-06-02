import { getAuditSummaryInRange } from "@/lib/analytics/audit-data";
import { analyticsPrivatedClause } from "@/lib/analytics/privated";
import { closedAtRangeClause, openedAtRangeClause, rangeSinceUnix } from "@/lib/analytics/range";
import type { AnalyticsRange, AnalyticsSummary } from "@/lib/analytics/types";
import { fetchGuildBanCount } from "@/lib/discord/api";
import { getTotalStatisticsTotals } from "@/lib/db/total-statistics";
import { getGamesOverview } from "@/lib/db/games";
import { getTicketStats } from "@/lib/db/tickets";
import { isDbConfigured, queryOne } from "@/lib/db/pool";
import type { PermissionTier } from "@/lib/permissions";

const VALID_CLOSED =
  "TRIM(closed_at) != '' AND closed_at IS NOT NULL AND closed_at NOT IN ('0', '00000000')";

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

  const baseWhere = `WHERE CAST(opened_at AS UNSIGNED) > 0${priv.sql}`;
  const baseParams = [...priv.params];

  const [
    ticketStats,
    openedInRangeRow,
    closedInRangeRow,
    games,
    mod,
    discordBanCount,
    auditSummary,
    xpRow,
    staffTotals,
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
    getAuditSummaryInRange(range),
    queryOne<{ total: number; events: number }>(
      `SELECT COALESCE(SUM(xp), 0) AS total, COUNT(*) AS events
       FROM xp_logs WHERE CAST(timestamp AS UNSIGNED) > 0${tsClause}`,
      tsParams
    ).catch(() => null),
    getTotalStatisticsTotals(),
  ]);

  const openedInRange = Number(openedInRangeRow?.count ?? 0);
  const closedInRange = Number(closedInRangeRow?.count ?? 0);
  const daysInRange = daysForRange(range);
  const avgPerDay =
    daysInRange > 0 ? openedInRange / daysInRange : openedInRange;
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

function daysForRange(range: AnalyticsRange): number {
  const map: Record<AnalyticsRange, number> = {
    today: 1,
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "365d": 365,
    all: 0,
  };
  return map[range];
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
      blacklists: 0,
    },
    staff: { totalMessages: 0, totalTicketsClosed: 0 },
    audit: { actionsInRange: 0, fleetRestarts: 0 },
  };
}
