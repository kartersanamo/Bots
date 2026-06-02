"use client";

import { AuditAnalyticsSection } from "@/components/analytics/AuditAnalyticsSection";
import { EngagementAnalyticsSection } from "@/components/analytics/EngagementAnalyticsSection";
import { GamesAnalyticsSection } from "@/components/analytics/GamesAnalyticsSection";
import { ModerationAnalyticsSection } from "@/components/analytics/ModerationAnalyticsSection";
import { OverviewAnalyticsSection } from "@/components/analytics/OverviewAnalyticsSection";
import { StaffRecentAnalyticsSection } from "@/components/analytics/StaffRecentAnalyticsSection";
import { StaffTotalAnalyticsSection } from "@/components/analytics/StaffTotalAnalyticsSection";
import { TicketsAnalytics } from "@/components/analytics/TicketsAnalytics";
import type { AnalyticsBundle } from "@/lib/analytics/bundle";
import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import type { AnalyticsRange } from "@/lib/analytics/types";

export type AnalyticsUiTab =
  | "overview"
  | "metrics"
  | "games"
  | "staff-recent"
  | "staff-total"
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

  if (tab === "staff-recent") {
    if (!bundle.staffRecent) {
      return <p className="text-muted">No staff statistics available.</p>;
    }
    return <StaffRecentAnalyticsSection data={bundle.staffRecent} />;
  }

  if (tab === "staff-total") {
    if (!bundle.staffTotal) {
      return (
        <p className="text-muted">
          All-time staff statistics are not available. Run migration{" "}
          <code className="text-xs">002_total_statistics_and_member_messages.sql</code>.
        </p>
      );
    }
    return (
      <StaffTotalAnalyticsSection
        data={bundle.staffTotal}
        range={range}
        groupBy={groupBy}
      />
    );
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
