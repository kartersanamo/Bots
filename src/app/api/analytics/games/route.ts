import { handleApiRoute } from "@/lib/api/helpers";
import { requireAnalytics } from "@/lib/analytics/api";
import { getGamesAnalytics } from "@/lib/analytics/games";
import { isDbConfigured } from "@/lib/db/pool";
import {
  ANALYTICS_CACHE_MS,
  cachedAnalytics,
} from "@/lib/analytics/inflight-cache";
import { NextResponse } from "next/server";

export const GET = handleApiRoute(async (request) => {
  const { range, groupBy } = await requireAnalytics(request);

  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, data: null });
  }

  const data = await cachedAnalytics(
    `analytics:games:${range}:${groupBy}`,
    ANALYTICS_CACHE_MS,
    () => getGamesAnalytics(range, groupBy)
  );

  return NextResponse.json({ configured: true, range, data });
});
