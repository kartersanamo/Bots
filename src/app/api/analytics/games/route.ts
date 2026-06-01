import { handleApiRoute } from "@/lib/api/helpers";
import { requireAnalytics } from "@/lib/analytics/api";
import { getGamesAnalytics } from "@/lib/analytics/games";
import { isDbConfigured } from "@/lib/db/pool";
import { cached } from "@/lib/server-cache";
import { NextResponse } from "next/server";

const CACHE_MS = 60_000;

export const GET = handleApiRoute(async (request) => {
  const { range } = await requireAnalytics(request);

  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, data: null });
  }

  const data = await cached(`analytics:games:${range}`, CACHE_MS, () =>
    getGamesAnalytics(range)
  );

  return NextResponse.json({ configured: true, range, data });
});
