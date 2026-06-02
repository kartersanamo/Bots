"use client";

import { AuditAnalyticsSection } from "@/components/analytics/AuditAnalyticsSection";
import { EngagementAnalyticsSection } from "@/components/analytics/EngagementAnalyticsSection";
import { GamesAnalyticsSection } from "@/components/analytics/GamesAnalyticsSection";
import { ModerationAnalyticsSection } from "@/components/analytics/ModerationAnalyticsSection";
import { OverviewAnalyticsSection } from "@/components/analytics/OverviewAnalyticsSection";
import { StaffAnalyticsSection } from "@/components/analytics/StaffAnalyticsSection";
import { TicketsAnalytics } from "@/components/analytics/TicketsAnalytics";
import type { AnalyticsBundle } from "@/lib/analytics/bundle";
import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import type { AnalyticsRange } from "@/lib/analytics/types";

export type AnalyticsUiTab =
  | "overview"
  | "metrics"
  | "games"
  | "staff"
  | "moderation"
  | "audit"
  | "engagement";

interface AnalyticsTabPanelsProps {
  tab: AnalyticsUiTab;
  bundle: AnalyticsBundle;
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
  tabReady: boolean;
}

export function AnalyticsTabPanels({
  tab,
  bundle,
  range,
  groupBy,
  tabReady,
}: AnalyticsTabPanelsProps) {
  if (!tabReady) return null;

  if (tab === "overview") {
    return (
      <OverviewAnalyticsSection
        bundle={bundle}
        range={range}
        groupBy={groupBy}
      />
    );
  }

  if (tab === "metrics") {
    if (!bundle.metrics) {
      return <p className="text-muted">No metrics data available.</p>;
    }
    return (
      <TicketsAnalytics data={bundle.metrics} range={range} groupBy={groupBy} />
    );
  }

  if (tab === "games") {
    if (!bundle.games) {
      return <p className="text-muted">No games data available.</p>;
    }
    return (
      <GamesAnalyticsSection
        data={bundle.games}
        range={range}
        groupBy={groupBy}
      />
    );
  }

  if (tab === "staff") {
    if (!bundle.staff) {
      return <p className="text-muted">No staff statistics available.</p>;
    }
    return <StaffAnalyticsSection data={bundle.staff} />;
  }

  if (tab === "moderation") {
    if (!bundle.moderation) {
      return <p className="text-muted">No moderation data available.</p>;
    }
    return <ModerationAnalyticsSection data={bundle.moderation} range={range} />;
  }

  if (tab === "audit") {
    if (!bundle.audit) {
      return <p className="text-muted">No audit data available.</p>;
    }
    return (
      <AuditAnalyticsSection
        data={bundle.audit}
        range={range}
        groupBy={groupBy}
      />
    );
  }

  if (tab === "engagement") {
    if (!bundle.engagement) {
      return (
        <p className="text-muted">
          Engagement tracking tables are not available yet. Run the analytics
          migration and restart bots.
        </p>
      );
    }
    return (
      <EngagementAnalyticsSection
        data={bundle.engagement}
        range={range}
        groupBy={groupBy}
      />
    );
  }

  return null;
}
