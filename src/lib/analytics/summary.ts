import { getAuditAnalytics } from "@/lib/analytics/audit-data";
import { getGamesAnalytics } from "@/lib/analytics/games";
import { getModerationAnalytics } from "@/lib/analytics/moderation";
import { getTicketAnalytics } from "@/lib/analytics/tickets";
import type { AnalyticsRange, AnalyticsSummary } from "@/lib/analytics/types";
import type { PermissionTier } from "@/lib/permissions";

export async function getAnalyticsSummary(
  tier: PermissionTier,
  range: AnalyticsRange
): Promise<AnalyticsSummary> {
  const [tickets, games, moderation, audit] = await Promise.all([
    getTicketAnalytics(tier, range),
    getGamesAnalytics(range),
    getModerationAnalytics(range),
    getAuditAnalytics(range),
  ]);

  return {
    range,
    tickets: {
      openCount: tickets?.kpis.openCount ?? 0,
      openedInRange: tickets?.kpis.openedInRange ?? 0,
      avgPerDay: tickets?.kpis.avgTicketsPerDay ?? 0,
    },
    games: {
      activePlayers: games?.kpis.activePlayers ?? 0,
      xpInRange: games?.kpis.totalXpInRange ?? 0,
    },
    moderation: {
      activeBans: moderation?.kpis.activeBans ?? 0,
      blacklists: moderation?.kpis.totalBlacklists ?? 0,
    },
    audit: {
      actionsInRange: audit.totalInRange,
    },
  };
}
