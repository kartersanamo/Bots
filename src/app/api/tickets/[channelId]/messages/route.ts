import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { isDbConfigured } from "@/lib/db/pool";
import { getTicketByChannelId } from "@/lib/db/tickets";
import {
  getTicketChannelMessages,
  sendTicketChannelMessage,
  isDiscordConfigured,
} from "@/lib/discord/tickets";

export const GET = handleApiRoute(async (request, { params }) => {
  const session = await requireAction("tickets.read");
  const { channelId } = await params;
  const limit = Math.min(
    100,
    Math.max(1, Number(new URL(request.url).searchParams.get("limit") || 60))
  );

  if (!isDbConfigured()) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }
  if (!isDiscordConfigured()) {
    return Response.json(
      { error: "Discord integration not configured" },
      { status: 503 }
    );
  }

  const ticket = await getTicketByChannelId(channelId, session.tier);
  if (!ticket) {
    return Response.json({ error: "Ticket not found" }, { status: 404 });
  }

  const messages = await getTicketChannelMessages(channelId, limit);
  return Response.json({
    ticket: {
      channelID: ticket.channelID,
      ownerID: ticket.ownerID,
      number: ticket.number,
      type: ticket.type,
    },
    messages: [...messages].reverse(),
  });
});

export const POST = handleApiRoute(async (request, { params }) => {
  const session = await requireAction("tickets.write");
  const { channelId } = await params;
  const body = await request.json().catch(() => ({}));
  const content = String(body.content ?? "").trim();
  if (!content) {
    return Response.json({ error: "content required" }, { status: 400 });
  }

  if (!isDbConfigured()) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }
  if (!isDiscordConfigured()) {
    return Response.json(
      { error: "Discord integration not configured" },
      { status: 503 }
    );
  }

  const ticket = await getTicketByChannelId(channelId, session.tier);
  if (!ticket) {
    return Response.json({ error: "Ticket not found" }, { status: 404 });
  }

  const message = await sendTicketChannelMessage(channelId, content);
  return Response.json({ ok: true, message, via: "bot" });
});
