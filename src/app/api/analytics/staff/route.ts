import { handleApiRoute } from "@/lib/api/helpers";
import { requireAnalytics } from "@/lib/analytics/api";
import { getStaffAnalytics } from "@/lib/analytics/staff";
import { isDbConfigured } from "@/lib/db/pool";
import { cached } from "@/lib/server-cache";
import { NextResponse } from "next/server";

const CACHE_MS = 60_000;

export const GET = handleApiRoute(async (request) => {
  await requireAnalytics(request);

  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, data: null });
  }

  const data = await cached("analytics:staff", CACHE_MS, getStaffAnalytics);

  return NextResponse.json({ configured: true, data });
});
