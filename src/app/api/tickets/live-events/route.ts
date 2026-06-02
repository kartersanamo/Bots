import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { timingSafeSecretEqual } from "@/lib/api/secrets";
import { getClientIp } from "@/lib/audit";
import { env } from "@/lib/env";
import {
  listTicketLiveEvents,
  publishTicketCreatedEvent,
} from "@/lib/tickets/live-events";

function ticketsBotSecret(): string {
  return env("TICKETS_BOT_API_SECRET");
}

function validBotKey(request: Request): boolean {
  const expected = ticketsBotSecret();
  if (!expected) return false;
  return timingSafeSecretEqual(
    request.headers.get("X-Tickets-Key"),
    expected
  );
}

export const GET = handleApiRoute(async (request) => {
  await requireAction("tickets.read");
  const url = new URL(request.url);
  const since = Number(url.searchParams.get("since") || 0);
  const events = listTicketLiveEvents(Number.isFinite(since) ? since : 0);
  const lastEventId = events.length ? events[events.length - 1].id : since || 0;
  return Response.json({ events, lastEventId, now: Date.now() });
});

export const POST = handleApiRoute(async (request) => {
  const ip = getClientIp(request) ?? "unknown";
  const limited = checkRateLimit(`tickets:live:${ip}`, {
    windowMs: 60_000,
    max: 60,
  });
  if (!limited.ok) {
    return Response.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec ?? 60) },
      }
    );
  }

  if (!validBotKey(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  if (body?.kind !== "ticket_created") {
    return Response.json({ error: "Unsupported event kind" }, { status: 400 });
  }
  const channelId = String(body.channelId ?? "").trim();
  const ticketNumber = String(body.ticketNumber ?? "").trim();
  const ticketType = String(body.ticketType ?? "").trim();
  const ownerId = String(body.ownerId ?? "").trim();
  const channelName = String(body.channelName ?? "").trim() || undefined;
  if (!channelId || !ticketNumber || !ticketType || !ownerId) {
    return Response.json(
      {
        error:
          "channelId, ticketNumber, ticketType, and ownerId are required",
      },
      { status: 400 }
    );
  }

  const event = publishTicketCreatedEvent({
    channelId,
    ticketNumber,
    ticketType,
    ownerId,
    channelName,
  });
  return Response.json({ ok: true, event });
});
