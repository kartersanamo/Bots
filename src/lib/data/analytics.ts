import "server-only";

import {
  getAnalyticsBundle,
  type AnalyticsTab,
} from "@/lib/analytics/bundle";
import {
  ANALYTICS_CACHE_MS,
  ANALYTICS_SUMMARY_CACHE_MS,
  cachedAnalytics,
} from "@/lib/analytics/inflight-cache";
import { getAnalyticsSummaryLight } from "@/lib/analytics/summary-light";
import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import type { AnalyticsRange } from "@/lib/analytics/types";
import type { PermissionTier } from "@/lib/permissions";

export async function getAnalyticsSummaryData(
  tier: PermissionTier,
  range: AnalyticsRange
) {
  return cachedAnalytics(
    `analytics:summary:${range}:${tier}`,
    ANALYTICS_SUMMARY_CACHE_MS,
    () => getAnalyticsSummaryLight(tier, range)
  );
}

export async function getAnalyticsBundleData(
  tier: PermissionTier,
  range: AnalyticsRange,
  groupBy: AnalyticsGroupBy,
  tabs: AnalyticsTab[],
  opts?: { includeSummary?: boolean }
) {
  const includeSummary = opts?.includeSummary !== false;
  const cacheKey = `analytics:bundle:${range}:${groupBy}:${tier}:${includeSummary}:${tabs.sort().join(",")}`;
  return cachedAnalytics(cacheKey, ANALYTICS_CACHE_MS, () =>
    getAnalyticsBundle(tier, range, groupBy, tabs, { includeSummary })
  );
}
