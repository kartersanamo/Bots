import { handleApiRoute } from "@/lib/api/helpers";
import { requireAnalytics } from "@/lib/analytics/api";
import { getAuditAnalytics } from "@/lib/analytics/audit-data";
import {
  ANALYTICS_CACHE_MS,
  cachedAnalytics,
} from "@/lib/analytics/inflight-cache";
import { NextResponse } from "next/server";

export const GET = handleApiRoute(async (request) => {
  const { range } = await requireAnalytics(request);

  const data = await cachedAnalytics(
    `analytics:audit:${range}`,
    ANALYTICS_CACHE_MS,
    () => getAuditAnalytics(range)
  );

  return NextResponse.json({ configured: true, range, data });
});
