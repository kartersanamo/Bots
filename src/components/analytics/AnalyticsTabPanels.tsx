"use client";

import { PanelFallback } from "@/components/ui/panel-fallback";
import type { AnalyticsBundle } from "@/lib/analytics/bundle";
import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import type { AnalyticsRange } from "@/lib/analytics/types";
import dynamic from "next/dynamic";

const OverviewAnalyticsSection = dynamic(
  () =>
    import("@/components/analytics/OverviewAnalyticsSection").then((m) => ({
      default: m.OverviewAnalyticsSection,
    })),
  { loading: () => <PanelFallback /> }
);
const TicketsAnalytics = dynamic(
  () =>
    import("@/components/analytics/TicketsAnalytics").then((m) => ({
      default: m.TicketsAnalytics,
    })),
  { loading: () => <PanelFallback /> }
);
const GamesAnalyticsSection = dynamic(
  () =>
    import("@/components/analytics/GamesAnalyticsSection").then((m) => ({
      default: m.GamesAnalyticsSection,
    })),
  { loading: () => <PanelFallback /> }
);
const StaffRecentAnalyticsSection = dynamic(
  () =>
    import("@/components/analytics/StaffRecentAnalyticsSection").then((m) => ({
      default: m.StaffRecentAnalyticsSection,
    })),
  { loading: () => <PanelFallback /> }
);
const StaffTotalAnalyticsSection = dynamic(
  () =>
    import("@/components/analytics/StaffTotalAnalyticsSection").then((m) => ({
      default: m.StaffTotalAnalyticsSection,
    })),
  { loading: () => <PanelFallback /> }
);
const ModerationAnalyticsSection = dynamic(
  () =>
    import("@/components/analytics/ModerationAnalyticsSection").then((m) => ({
      default: m.ModerationAnalyticsSection,
    })),
  { loading: () => <PanelFallback /> }
);
const AuditAnalyticsSection = dynamic(
  () =>
    import("@/components/analytics/AuditAnalyticsSection").then((m) => ({
      default: m.AuditAnalyticsSection,
    })),
  { loading: () => <PanelFallback /> }
);
const EngagementAnalyticsSection = dynamic(
  () =>
    import("@/components/analytics/EngagementAnalyticsSection").then((m) => ({
      default: m.EngagementAnalyticsSection,
    })),
  { loading: () => <PanelFallback /> }
);

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
          All-time staff statistics are not available. Required database tables are
          missing.
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
          Engagement tracking tables are not available yet. Apply the required
          database schema and restart bots.
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
