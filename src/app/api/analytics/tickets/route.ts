import { handleApiRoute } from "@/lib/api/helpers";
import { requireAnalytics } from "@/lib/analytics/api";
import { csvResponse, rowsToCsv } from "@/lib/analytics/export";
import { getTicketAnalytics } from "@/lib/analytics/tickets";
import { isDbConfigured } from "@/lib/db/pool";
import { cached } from "@/lib/server-cache";
import { NextResponse } from "next/server";

const CACHE_MS = 60_000;

export const GET = handleApiRoute(async (request) => {
  const { session, range } = await requireAnalytics(request);
  const url = new URL(request.url);
  const format = url.searchParams.get("format");

  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, data: null });
  }

  const data = await cached(
    `analytics:tickets:${range}:${session.tier}`,
    CACHE_MS,
    () => getTicketAnalytics(session.tier, range)
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
