import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { rowsToCsv, csvResponse } from "@/lib/analytics/export";
import {
  getDistinctTicketTypes,
  getTicketStats,
  listTickets,
  type TicketSortField,
  type TicketStatusFilter,
} from "@/lib/db/tickets";
import { isDbConfigured } from "@/lib/db/pool";
import type { TicketRow } from "@/lib/tickets/types";

function parseUnixDateParam(value: string | null): number | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(value.trim());
  const ms = d.getTime();
  if (Number.isNaN(ms)) return undefined;
  return Math.floor(ms / 1000);
}

function parseHasTranscript(
  value: string | null
): boolean | undefined {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return undefined;
}

export const GET = handleApiRoute(async (request) => {
  const session = await requireAction("tickets.read");
  const url = new URL(request.url);

  const page = Number(url.searchParams.get("page") || 1);
  const limit = Number(url.searchParams.get("limit") || 25);
  const sort = (url.searchParams.get("sort") || "opened_at") as TicketSortField;
  const order: "asc" | "desc" =
    url.searchParams.get("order") === "asc" ? "asc" : "desc";
  const status = (url.searchParams.get("status") || "open") as TicketStatusFilter;
  const type = url.searchParams.get("type") || undefined;
  const ownerId = url.searchParams.get("ownerId") || undefined;
  const number = url.searchParams.get("number") || undefined;
  const privated = url.searchParams.get("privated") || undefined;
  const q = url.searchParams.get("q") || undefined;
  const closedBy = url.searchParams.get("closedBy") || undefined;
  const closedAfter = parseUnixDateParam(url.searchParams.get("closedFrom"));
  const closedBefore = parseUnixDateParam(url.searchParams.get("closedTo"));
  const hasTranscript = parseHasTranscript(
    url.searchParams.get("hasTranscript")
  );
  const format = url.searchParams.get("format");

  const listParams = {
    page,
    limit,
    sort,
    order,
    status,
    type,
    ownerId,
    number,
    privated,
    q,
    closedAfter,
    closedBefore,
    closedBy,
    hasTranscript,
    viewerTier: session.tier,
  };

  if (!isDbConfigured()) {
    if (format === "csv") {
      return csvResponse(
        "tickets.csv",
        rowsToCsv(
          [
            "channelID",
            "number",
            "type",
            "ownerID",
            "opened_at",
            "closed_at",
            "closed_by",
            "reason",
            "transcript",
            "active",
          ],
          []
        )
      );
    }
    return Response.json({
      tickets: [],
      total: 0,
      page: 1,
      limit: 25,
      configured: false,
      stats: null,
      types: [],
    });
  }

  const [result, stats, types] = await Promise.all([
    listTickets(listParams),
    format === "csv" ? Promise.resolve(null) : getTicketStats(session.tier),
    format === "csv"
      ? Promise.resolve([])
      : getDistinctTicketTypes(session.tier, status),
  ]);

  const tickets = result?.tickets ?? [];

  if (format === "csv") {
    const rows = tickets.map((t: TicketRow) => ({
      channelID: t.channelID,
      number: t.number,
      type: t.type,
      ownerID: t.ownerID,
      opened_at: t.opened_at,
      closed_at: t.closed_at,
      closed_by: t.closed_by,
      reason: t.reason,
      transcript: t.transcript,
      active: t.active,
    }));
    return csvResponse(
      `tickets-${status}-page${page}.csv`,
      rowsToCsv(
        [
          "channelID",
          "number",
          "type",
          "ownerID",
          "opened_at",
          "closed_at",
          "closed_by",
          "reason",
          "transcript",
          "active",
        ],
        rows
      )
    );
  }

  return Response.json({
    tickets,
    total: result?.total ?? 0,
    page: result?.page ?? page,
    limit: result?.limit ?? limit,
    configured: true,
    stats,
    types,
  });
});
