import { handleApiRoute } from "@/lib/api/helpers";
import { requireAnalytics } from "@/lib/analytics/api";
import { getModerationAnalytics } from "@/lib/analytics/moderation";
import { isDbConfigured } from "@/lib/db/pool";
import {
  ANALYTICS_CACHE_MS,
  cachedAnalytics,
} from "@/lib/analytics/inflight-cache";
import { NextResponse } from "next/server";

export const GET = handleApiRoute(async (request) => {
  const { range } = await requireAnalytics(request);

  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, data: null });
  }

  const data = await cachedAnalytics(
    `analytics:moderation:${range}`,
    ANALYTICS_CACHE_MS,
    () => getModerationAnalytics(range)
  );

  return NextResponse.json({ configured: true, range, data });
});
