import {
  requireAction,
  handleApiRoute,
  withAudit,
} from "@/lib/api/helpers";
import {
  closeTicketViaBot,
  isTicketsBotApiConfigured,
  TicketsBotApiError,
} from "@/lib/tickets-bot/client";
import { getTicketByChannelId } from "@/lib/db/tickets";
import { isTicketOpen } from "@/lib/tickets/types";

export const POST = handleApiRoute(async (request, { params }) => {
  const session = await requireAction("tickets.write");
  const { channelId } = await params;

  let body: { reason?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const reason = body.reason?.trim() ?? "";
  if (reason.length < 2) {
    return Response.json(
      { error: "A close reason is required (at least 2 characters)" },
      { status: 400 }
    );
  }
  if (reason.length > 500) {
    return Response.json(
      { error: "Reason must be 500 characters or fewer" },
      { status: 400 }
    );
  }

  const ticket = await getTicketByChannelId(channelId, session.tier);
  if (!ticket) {
    return Response.json({ error: "Ticket not found" }, { status: 404 });
  }
  if (!isTicketOpen(ticket.active)) {
    return Response.json({ error: "Ticket is already closed" }, { status: 400 });
  }

  if (!isTicketsBotApiConfigured()) {
    return Response.json(
      {
        error:
          "Tickets bot API not configured (set TICKETS_BOT_API_SECRET and restart MinecadiaTickets)",
      },
      { status: 503 }
    );
  }

  try {
    await withAudit(request, session, "ticket.close", channelId, async () => {
      await closeTicketViaBot({
        channelId,
        closedById: session.id,
        reason,
      });
    });
  } catch (err) {
    if (err instanceof TicketsBotApiError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  return Response.json({ ok: true });
});
