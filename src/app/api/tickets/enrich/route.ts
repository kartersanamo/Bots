import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import {
  enrichTicketsBatch,
  isDiscordConfigured,
} from "@/lib/discord/tickets";

export const POST = handleApiRoute(async (request) => {
  await requireAction("tickets.read");

  if (!isDiscordConfigured()) {
    return Response.json({ enrichments: {}, configured: false });
  }

  const body = await request.json();
  const channelIds = (body.channelIds as string[])?.slice(0, 40) ?? [];
  const owners = (body.owners as Record<string, string>) ?? {};

  const items = channelIds.map((channelId) => ({
    channelId,
    ownerId: owners[channelId] || "",
  }));

  const enrichments = await enrichTicketsBatch(
    items.filter((i) => i.channelId && i.ownerId)
  );

  return Response.json({ enrichments, configured: true });
});
