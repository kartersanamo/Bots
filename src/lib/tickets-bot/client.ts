const DEFAULT_URL = "http://127.0.0.1:8788";

export class TicketsBotApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "TicketsBotApiError";
  }
}

function baseUrl(): string {
  return process.env.TICKETS_BOT_API_URL || DEFAULT_URL;
}

function secret(): string {
  const s =
    process.env.TICKETS_BOT_API_SECRET || process.env.CONTROL_API_SECRET;
  if (!s) throw new Error("TICKETS_BOT_API_SECRET not configured");
  return s;
}

export function isTicketsBotApiConfigured(): boolean {
  return !!(
    process.env.TICKETS_BOT_API_SECRET || process.env.CONTROL_API_SECRET
  );
}

export async function closeTicketViaBot(params: {
  channelId: string;
  closedById: string;
  reason: string;
}): Promise<void> {
  const url = `${baseUrl()}/close-ticket`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Tickets-Key": secret(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel_id: params.channelId,
      closed_by_id: params.closedById,
      reason: params.reason,
    }),
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const detail =
      typeof data === "object" && data && "error" in data
        ? String((data as { error: unknown }).error)
        : `Tickets bot API error (${res.status})`;
    throw new TicketsBotApiError(detail, res.status, data);
  }
}
