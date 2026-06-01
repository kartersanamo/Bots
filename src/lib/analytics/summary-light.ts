import { analyticsPrivatedClause } from "@/lib/analytics/privated";
import { openedAtRangeClause, rangeSinceUnix } from "@/lib/analytics/range";
import { getAuditCountInRange } from "@/lib/analytics/audit-data";
import type { AnalyticsRange, AnalyticsSummary } from "@/lib/analytics/types";
import { getGamesOverview } from "@/lib/db/games";
import { getTicketStats } from "@/lib/db/tickets";
import { isDbConfigured, queryOne } from "@/lib/db/pool";
import type { PermissionTier } from "@/lib/permissions";

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
  const since = rangeSinceUnix(range);
  const tsClause = since != null ? " AND CAST(timestamp AS UNSIGNED) >= ?" : "";
  const tsParams = since != null ? [since] : [];

  const [ticketStats, openedInRangeRow, games, mod, auditTotal, xpRow] =
    await Promise.all([
      getTicketStats(tier),
      queryOne<{ count: number }>(
        `SELECT COUNT(*) AS count FROM tickets
         WHERE CAST(opened_at AS UNSIGNED) > 0${priv.sql}${openedRange.sql}`,
        [...priv.params, ...openedRange.params]
      ),
      getGamesOverview(),
      queryOne<{
        activeBans: number;
        totalBlacklists: number;
      }>(
        `SELECT
          (SELECT COUNT(*) FROM bans) AS activeBans,
          (SELECT COUNT(*) FROM blacklists) AS totalBlacklists`
      ).catch(() => null),
      getAuditCountInRange(range),
      queryOne<{ total: number }>(
        `SELECT COALESCE(SUM(xp), 0) AS total FROM xp_logs WHERE 1=1${tsClause}`,
        tsParams
      ).catch(() => null),
    ]);

  const openedInRange = Number(openedInRangeRow?.count ?? 0);
  const daysInRange = daysForRange(range);
  const avgPerDay =
    daysInRange > 0 ? openedInRange / daysInRange : openedInRange;

  return {
    range,
    tickets: {
      openCount: ticketStats?.openCount ?? 0,
      openedInRange,
      avgPerDay,
    },
    games: {
      activePlayers: games?.activePlayers ?? 0,
      xpInRange: Number(xpRow?.total ?? 0),
    },
    moderation: {
      activeBans: Number(mod?.activeBans ?? 0),
      blacklists: Number(mod?.totalBlacklists ?? 0),
    },
    audit: { actionsInRange: auditTotal },
  };
}

function daysForRange(range: AnalyticsRange): number {
  const map: Record<AnalyticsRange, number> = {
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
    tickets: { openCount: 0, openedInRange: 0, avgPerDay: 0 },
    games: { activePlayers: 0, xpInRange: 0 },
    moderation: { activeBans: 0, blacklists: 0 },
    audit: { actionsInRange: 0 },
  };
}
