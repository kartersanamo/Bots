import { getAuditAnalytics } from "@/lib/analytics/audit-data";
import { getEngagementAnalytics } from "@/lib/analytics/engagement";
import { getGamesAnalytics } from "@/lib/analytics/games";
import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import { getModerationAnalytics } from "@/lib/analytics/moderation";
import { getAnalyticsSummaryLight } from "@/lib/analytics/summary-light";
import { getStaffRecentAnalytics } from "@/lib/analytics/staff-recent";
import { getStaffTotalAnalytics } from "@/lib/analytics/staff-total";
import { getTicketAnalytics } from "@/lib/analytics/tickets";
import type {
  AnalyticsRange,
  AnalyticsSummary,
  AuditAnalytics,
  EngagementAnalytics,
  GamesAnalytics,
  ModerationAnalytics,
  StaffRecentAnalytics,
  StaffTotalAnalytics,
  TicketAnalytics,
} from "@/lib/analytics/types";
import type { PermissionTier } from "@/lib/permissions";

export type AnalyticsTab =
  | "metrics"
  | "games"
  | "staff-recent"
  | "staff-total"
  | "moderation"
  | "audit"
  | "engagement";

export interface AnalyticsBundle {
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
  summary: AnalyticsSummary;
  metrics?: TicketAnalytics | null;
  games?: GamesAnalytics | null;
  staffRecent?: StaffRecentAnalytics | null;
  staffTotal?: StaffTotalAnalytics | null;
  moderation?: ModerationAnalytics | null;
  audit?: AuditAnalytics | null;
  engagement?: EngagementAnalytics | null;
}

export async function getAnalyticsBundle(
  tier: PermissionTier,
  range: AnalyticsRange,
  groupBy: AnalyticsGroupBy,
  tabs: AnalyticsTab[],
  opts?: { includeSummary?: boolean }
): Promise<AnalyticsBundle> {
  const uniqueTabs = [...new Set(tabs)];
  const includeSummary = opts?.includeSummary !== false;
  const summary = includeSummary
    ? await getAnalyticsSummaryLight(tier, range)
    : undefined;

  const loaders: Record<AnalyticsTab, () => Promise<unknown>> = {
    metrics: () => getTicketAnalytics(tier, range, groupBy),
    games: () => getGamesAnalytics(range, groupBy),
    "staff-recent": () => getStaffRecentAnalytics(),
    "staff-total": () => getStaffTotalAnalytics(range, groupBy),
    moderation: () => getModerationAnalytics(range, groupBy),
    audit: () => getAuditAnalytics(range, groupBy),
    engagement: () => getEngagementAnalytics(range, groupBy),
  };

  const entries = await Promise.all(
    uniqueTabs.map(async (tab) => {
      const data = await loaders[tab]();
      return [tab, data] as const;
    })
  );

  const bundle = {
    range,
    groupBy,
    summary:
      summary ??
      ({
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
        moderation: { activeBans: 0, activeTimeouts: 0, blacklists: 0 },
        staff: { totalMessages: 0, totalTicketsClosed: 0 },
        audit: { actionsInRange: 0, fleetRestarts: 0 },
      } satisfies AnalyticsSummary),
  } as AnalyticsBundle;
  for (const [tab, data] of entries) {
    switch (tab) {
      case "metrics":
        bundle.metrics = data as TicketAnalytics | null;
        break;
      case "games":
        bundle.games = data as GamesAnalytics | null;
        break;
      case "staff-recent":
        bundle.staffRecent = data as StaffRecentAnalytics | null;
        break;
      case "staff-total":
        bundle.staffTotal = data as StaffTotalAnalytics | null;
        break;
      case "moderation":
        bundle.moderation = data as ModerationAnalytics | null;
        break;
      case "audit":
        bundle.audit = data as AuditAnalytics | null;
        break;
      case "engagement":
        bundle.engagement = data as EngagementAnalytics | null;
        break;
    }
  }
  return bundle;
}
