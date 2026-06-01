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
import { NextResponse } from "next/server";

const VALID_TABS = new Set<AnalyticsTab>([
  "tickets",
  "games",
  "staff",
  "moderation",
  "audit",
]);

export const GET = handleApiRoute(async (request) => {
  const { session, range } = await requireAnalytics(request);
  const url = new URL(request.url);
  const tabParam = url.searchParams.get("tabs") ?? "tickets";
  const tabs = tabParam
    .split(",")
    .map((t) => t.trim())
    .filter((t): t is AnalyticsTab => VALID_TABS.has(t as AnalyticsTab));

  if (!tabs.length) {
    return NextResponse.json({ error: "No valid tabs" }, { status: 400 });
  }

  const cacheKey = `analytics:bundle:${range}:${session.tier}:${tabs.sort().join(",")}`;
  const bundle = await cachedAnalytics(cacheKey, ANALYTICS_CACHE_MS, () =>
    getAnalyticsBundle(session.tier, range, tabs)
  );

  return NextResponse.json({ configured: true, ...bundle });
});
