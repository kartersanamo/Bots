import { handleApiRoute } from "@/lib/api/helpers";
import { requireAnalytics } from "@/lib/analytics/api";
import {
  getAnalyticsBundle,
  type AnalyticsTab,
} from "@/lib/analytics/bundle";
import {
  ANALYTICS_CACHE_MS,
  cachedAnalytics,
} from "@/lib/analytics/inflight-cache";
import { jsonCached } from "@/lib/http/json-cache";

const VALID_TABS = new Set<AnalyticsTab>([
  "metrics",
  "games",
  "staff-recent",
  "staff-total",
  "moderation",
  "audit",
  "engagement",
]);

export const GET = handleApiRoute(async (request) => {
  const { session, range, groupBy } = await requireAnalytics(request);
  const url = new URL(request.url);
  const tabParam = url.searchParams.get("tabs") ?? "metrics";
  const includeSummary = url.searchParams.get("summary") !== "0";

  const tabs = tabParam
    .split(",")
    .map((t) => t.trim())
    .filter((t): t is AnalyticsTab => VALID_TABS.has(t as AnalyticsTab));

  if (!tabs.length) {
    return Response.json({ error: "No valid tabs" }, { status: 400 });
  }

  const cacheKey = `analytics:bundle:${range}:${groupBy}:${session.tier}:${includeSummary}:${tabs.sort().join(",")}`;
  const bundle = await cachedAnalytics(cacheKey, ANALYTICS_CACHE_MS, () =>
    getAnalyticsBundle(session.tier, range, groupBy, tabs, { includeSummary })
  );

  return jsonCached({ configured: true, ...bundle }, 120, {
    staleWhileRevalidate: 300,
    private: true,
  });
});
