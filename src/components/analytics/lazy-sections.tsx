"use client";

import dynamic from "next/dynamic";

const loading = () => (
  <div className="h-64 animate-pulse rounded-lg border border-border bg-surface" />
);

export const LazyOverviewAnalyticsSection = dynamic(
  () =>
    import("@/components/analytics/OverviewAnalyticsSection").then((m) => ({
      default: m.OverviewAnalyticsSection,
    })),
  { loading, ssr: false }
);

export const LazyTicketsAnalytics = dynamic(
  () =>
    import("@/components/analytics/TicketsAnalytics").then((m) => ({
      default: m.TicketsAnalytics,
    })),
  { loading, ssr: false }
);

export const LazyGamesAnalyticsSection = dynamic(
  () =>
    import("@/components/analytics/GamesAnalyticsSection").then((m) => ({
      default: m.GamesAnalyticsSection,
    })),
  { loading, ssr: false }
);

export const LazyStaffAnalyticsSection = dynamic(
  () =>
    import("@/components/analytics/StaffAnalyticsSection").then((m) => ({
      default: m.StaffAnalyticsSection,
    })),
  { loading, ssr: false }
);

export const LazyModerationAnalyticsSection = dynamic(
  () =>
    import("@/components/analytics/ModerationAnalyticsSection").then((m) => ({
      default: m.ModerationAnalyticsSection,
    })),
  { loading, ssr: false }
);

export const LazyAuditAnalyticsSection = dynamic(
  () =>
    import("@/components/analytics/AuditAnalyticsSection").then((m) => ({
      default: m.AuditAnalyticsSection,
    })),
  { loading, ssr: false }
);

export const LazyEngagementAnalyticsSection = dynamic(
  () =>
    import("@/components/analytics/EngagementAnalyticsSection").then((m) => ({
      default: m.EngagementAnalyticsSection,
    })),
  { loading, ssr: false }
);
