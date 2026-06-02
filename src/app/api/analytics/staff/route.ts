import { handleApiRoute } from "@/lib/api/helpers";
import { requireAnalytics } from "@/lib/analytics/api";
import { getStaffRecentAnalytics } from "@/lib/analytics/staff-recent";
import { isDbConfigured } from "@/lib/db/pool";
import {
  ANALYTICS_CACHE_MS,
  cachedAnalytics,
} from "@/lib/analytics/inflight-cache";
import { NextResponse } from "next/server";

export const GET = handleApiRoute(async (request) => {
  await requireAnalytics(request);

  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, data: null });
  }

  const data = await cachedAnalytics(
    "analytics:staff",
    ANALYTICS_CACHE_MS,
    getStaffRecentAnalytics
  );

  return NextResponse.json({ configured: true, data });
});
