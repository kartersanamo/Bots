import { handleApiRoute } from "@/lib/api/helpers";
import { requireAnalytics } from "@/lib/analytics/api";
import { getAuditAnalytics } from "@/lib/analytics/audit-data";
import {
  ANALYTICS_CACHE_MS,
  cachedAnalytics,
} from "@/lib/analytics/inflight-cache";
import { NextResponse } from "next/server";

export const GET = handleApiRoute(async (request) => {
  const { range, groupBy } = await requireAnalytics(request);

  const data = await cachedAnalytics(
    `analytics:audit:${range}:${groupBy}`,
    ANALYTICS_CACHE_MS,
    () => getAuditAnalytics(range, groupBy)
  );

  return NextResponse.json({ configured: true, range, data });
});
