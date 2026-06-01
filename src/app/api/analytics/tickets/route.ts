import { handleApiRoute } from "@/lib/api/helpers";
import { requireAnalytics } from "@/lib/analytics/api";
import { csvResponse, rowsToCsv } from "@/lib/analytics/export";
import { getTicketAnalytics } from "@/lib/analytics/tickets";
import { isDbConfigured } from "@/lib/db/pool";
import {
  ANALYTICS_CACHE_MS,
  cachedAnalytics,
} from "@/lib/analytics/inflight-cache";
import { NextResponse } from "next/server";

export const GET = handleApiRoute(async (request) => {
  const { session, range, groupBy } = await requireAnalytics(request);
  const url = new URL(request.url);
  const format = url.searchParams.get("format");

  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, data: null });
  }

  const data = await cachedAnalytics(
    `analytics:tickets:${range}:${groupBy}:${session.tier}`,
    ANALYTICS_CACHE_MS,
    () => getTicketAnalytics(session.tier, range, groupBy)
  );

  if (format === "csv" && data) {
    const rows = data.topOpenersInRange.map((r) => ({
      ownerId: r.ownerId,
      tickets: r.count,
    }));
    return csvResponse(
      `tickets-top-openers-${range}.csv`,
      rowsToCsv(["ownerId", "tickets"], rows)
    );
  }

  return NextResponse.json({ configured: true, range, data });
});
