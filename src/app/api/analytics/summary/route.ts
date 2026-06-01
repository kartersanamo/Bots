import { handleApiRoute } from "@/lib/api/helpers";
import { requireAnalytics } from "@/lib/analytics/api";
import {
  ANALYTICS_SUMMARY_CACHE_MS,
  cachedAnalytics,
} from "@/lib/analytics/inflight-cache";
import { getAnalyticsSummaryLight } from "@/lib/analytics/summary-light";
import { jsonCached } from "@/lib/http/json-cache";

export const GET = handleApiRoute(async (request) => {
  const { session, range } = await requireAnalytics(request);
  const data = await cachedAnalytics(
    `analytics:summary:${range}:${session.tier}`,
    ANALYTICS_SUMMARY_CACHE_MS,
    () => getAnalyticsSummaryLight(session.tier, range)
  );
  return jsonCached({ configured: true, ...data }, 60, {
    staleWhileRevalidate: 120,
    private: true,
  });
});
