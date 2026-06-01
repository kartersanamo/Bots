import { handleApiRoute } from "@/lib/api/helpers";
import { requireAnalytics } from "@/lib/analytics/api";
import { getAnalyticsSummary } from "@/lib/analytics/summary";
import { cached } from "@/lib/server-cache";
import { NextResponse } from "next/server";

const CACHE_MS = 60_000;

export const GET = handleApiRoute(async (request) => {
  const { session, range } = await requireAnalytics(request);
  const data = await cached(
    `analytics:summary:${range}:${session.tier}`,
    CACHE_MS,
    () => getAnalyticsSummary(session.tier, range)
  );
  return NextResponse.json({ configured: true, ...data });
});
