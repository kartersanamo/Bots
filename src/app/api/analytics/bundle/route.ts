import { handleApiRoute } from "@/lib/api/helpers";
import { requireAnalytics } from "@/lib/analytics/api";
import type { AnalyticsTab } from "@/lib/analytics/bundle";
import { getAnalyticsBundleData } from "@/lib/data/analytics";
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

  const bundle = await getAnalyticsBundleData(
    session.tier,
    range,
    groupBy,
    tabs,
    { includeSummary }
  );

  const body = includeSummary
    ? { configured: true as const, ...bundle }
    : (() => {
        const { summary: _s, ...tabsOnly } = bundle;
        void _s;
        return { configured: true as const, ...tabsOnly };
      })();

  return jsonCached(body, 120, {
    staleWhileRevalidate: 300,
    private: true,
  });
});
