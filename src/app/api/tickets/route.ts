import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import {
  getDistinctTicketTypes,
  getTicketStats,
  listTickets,
  type TicketSortField,
  type TicketStatusFilter,
} from "@/lib/db/tickets";
import { isDbConfigured } from "@/lib/db/pool";

export const GET = handleApiRoute(async (request) => {
  const session = await requireAction("tickets.read");
  const url = new URL(request.url);

  const page = Number(url.searchParams.get("page") || 1);
  const limit = Number(url.searchParams.get("limit") || 25);
  const sort = (url.searchParams.get("sort") || "opened_at") as TicketSortField;
  const order =
    url.searchParams.get("order") === "asc" ? "asc" : "desc";
  const status = (url.searchParams.get("status") || "open") as TicketStatusFilter;
  const type = url.searchParams.get("type") || undefined;
  const ownerId = url.searchParams.get("ownerId") || undefined;
  const number = url.searchParams.get("number") || undefined;
  const privated = url.searchParams.get("privated") || undefined;
  const q = url.searchParams.get("q") || undefined;

  if (!isDbConfigured()) {
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

  const result = await listTickets({
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
    viewerTier: session.tier,
  });

  const stats = await getTicketStats(session.tier);
  const types = await getDistinctTicketTypes(session.tier, status);

  return Response.json({
    tickets: result?.tickets ?? [],
    total: result?.total ?? 0,
    page: result?.page ?? page,
    limit: result?.limit ?? limit,
    configured: true,
    stats,
    types,
  });
});
