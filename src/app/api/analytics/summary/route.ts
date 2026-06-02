import { handleApiRoute } from "@/lib/api/helpers";
import { requireAnalytics } from "@/lib/analytics/api";
import { getAnalyticsSummaryData } from "@/lib/data/analytics";
import { jsonCached } from "@/lib/http/json-cache";

export const GET = handleApiRoute(async (request) => {
  const { session, range } = await requireAnalytics(request);
  const data = await getAnalyticsSummaryData(session.tier, range);
  return jsonCached({ configured: true, ...data }, 60, {
    staleWhileRevalidate: 120,
    private: true,
  });
});
