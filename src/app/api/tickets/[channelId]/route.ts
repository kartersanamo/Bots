import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { getTicketByChannelId } from "@/lib/db/tickets";
import {
  enrichTicket,
  fetchDiscordUser,
  discordChannelUrl,
  isDiscordConfigured,
} from "@/lib/discord/tickets";
import { isDbConfigured } from "@/lib/db/pool";

export const GET = handleApiRoute(async (_request, { params }) => {
  const session = await requireAction("tickets.read");
  const { channelId } = await params;

  if (!isDbConfigured()) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }

  const ticket = await getTicketByChannelId(channelId, session.tier);
  if (!ticket) {
    return Response.json({ error: "Ticket not found" }, { status: 404 });
  }

  let enrichment = null;
  let owner = null;
  if (isDiscordConfigured()) {
    enrichment = await enrichTicket(channelId, ticket.ownerID);
    owner = await fetchDiscordUser(ticket.ownerID);
  }

  return Response.json({
    ticket,
    enrichment,
    owner,
    discordUrl: discordChannelUrl(channelId),
  });
});
