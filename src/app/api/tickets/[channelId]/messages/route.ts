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

  let messages = [] as Awaited<ReturnType<typeof getTicketChannelMessages>>;
  let channelUnavailable = false;
  try {
    messages = await getTicketChannelMessages(channelId, limit);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Discord code 10003 = Unknown Channel (deleted/archived/not accessible).
    if (
      msg.includes('"code": 10003') ||
      msg.includes('"code":10003') ||
      msg.includes("Unknown Channel")
    ) {
      channelUnavailable = true;
      messages = [];
    } else {
      throw err;
    }
  }
  return Response.json({
    ticket: {
      channelID: ticket.channelID,
      ownerID: ticket.ownerID,
      number: ticket.number,
      type: ticket.type,
    },
    messages: [...messages].reverse(),
    channelUnavailable,
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

  const message = await sendTicketChannelMessage(channelId, content, {
    displayName: session.globalName || session.username,
    avatarUrl: discordAvatarUrl(session.id, session.avatar),
  });
  return Response.json({
    ok: true,
    message,
    via: message.webhook_id ? "webhook" : "bot",
  });
});

function discordAvatarUrl(userId: string, avatarHash: string | null): string | null {
  if (!avatarHash) return null;
  const format = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${format}?size=128`;
}
