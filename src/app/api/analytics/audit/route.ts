import { handleApiRoute } from "@/lib/api/helpers";
import { requireAnalytics } from "@/lib/analytics/api";
import { getAuditAnalytics } from "@/lib/analytics/audit-data";
import { cached } from "@/lib/server-cache";
import { NextResponse } from "next/server";

const CACHE_MS = 60_000;

export const GET = handleApiRoute(async (request) => {
  const { range } = await requireAnalytics(request);

  const data = await cached(`analytics:audit:${range}`, CACHE_MS, () =>
    getAuditAnalytics(range)
  );

  return NextResponse.json({ configured: true, range, data });
});
