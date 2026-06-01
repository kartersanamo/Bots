import { getAuditAnalytics } from "@/lib/analytics/audit-data";
import { getEngagementAnalytics } from "@/lib/analytics/engagement";
import { getGamesAnalytics } from "@/lib/analytics/games";
import { getModerationAnalytics } from "@/lib/analytics/moderation";
import { getAnalyticsSummaryLight } from "@/lib/analytics/summary-light";
import { getStaffAnalytics } from "@/lib/analytics/staff";
import { getTicketAnalytics } from "@/lib/analytics/tickets";
import type {
  AnalyticsRange,
  AnalyticsSummary,
  AuditAnalytics,
  EngagementAnalytics,
  GamesAnalytics,
  ModerationAnalytics,
  StaffAnalytics,
  TicketAnalytics,
} from "@/lib/analytics/types";
import type { PermissionTier } from "@/lib/permissions";

export type AnalyticsTab =
  | "metrics"
  | "games"
  | "staff"
  | "moderation"
  | "audit"
  | "engagement";

export interface AnalyticsBundle {
  range: AnalyticsRange;
  summary: AnalyticsSummary;
  metrics?: TicketAnalytics | null;
  games?: GamesAnalytics | null;
  staff?: StaffAnalytics | null;
  moderation?: ModerationAnalytics | null;
  audit?: AuditAnalytics | null;
  engagement?: EngagementAnalytics | null;
}

export async function getAnalyticsBundle(
  tier: PermissionTier,
  range: AnalyticsRange,
  tabs: AnalyticsTab[]
): Promise<AnalyticsBundle> {
  const uniqueTabs = [...new Set(tabs)];
  const summary = await getAnalyticsSummaryLight(tier, range);

  const loaders: Record<AnalyticsTab, () => Promise<unknown>> = {
    metrics: () => getTicketAnalytics(tier, range),
    games: () => getGamesAnalytics(range),
    staff: () => getStaffAnalytics(),
    moderation: () => getModerationAnalytics(range),
    audit: () => getAuditAnalytics(range),
    engagement: () => getEngagementAnalytics(range),
  };

  const entries = await Promise.all(
    uniqueTabs.map(async (tab) => {
      const data = await loaders[tab]();
      return [tab, data] as const;
    })
  );

  const bundle = { range, summary } as AnalyticsBundle;
  for (const [tab, data] of entries) {
    switch (tab) {
      case "metrics":
        bundle.metrics = data as TicketAnalytics | null;
        break;
      case "games":
        bundle.games = data as GamesAnalytics | null;
        break;
      case "staff":
        bundle.staff = data as StaffAnalytics | null;
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
