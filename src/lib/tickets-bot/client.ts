import { env } from "@/lib/env";

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
  return env("TICKETS_BOT_API_URL") || DEFAULT_URL;
}

function secret(): string {
  const s = env("TICKETS_BOT_API_SECRET") || env("CONTROL_API_SECRET");
  if (!s) throw new Error("TICKETS_BOT_API_SECRET not configured");
  return s;
}

export function isTicketsBotApiConfigured(): boolean {
  return !!(env("TICKETS_BOT_API_SECRET") || env("CONTROL_API_SECRET"));
}

export async function closeTicketViaBot(params: {
  channelId: string;
  closedById: string;
  reason: string;
}): Promise<void> {
  const url = `${baseUrl()}/close-ticket`;
  let res: Response;
  try {
    res = await fetch(url, {
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
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Connection failed";
    throw new TicketsBotApiError(
      `Cannot reach MinecadiaTickets API at ${baseUrl()} (${msg}). Restart the tickets bot so the dashboard close server starts on port 8788.`,
      503
    );
  }

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new TicketsBotApiError(
        "MinecadiaTickets bot command endpoint is unavailable (404). Restart the tickets bot to load /ticket-command.",
        503,
        data
      );
    }
    const detail =
      typeof data === "object" && data && "error" in data
        ? String((data as { error: unknown }).error)
        : `Tickets bot API error (${res.status})`;
    throw new TicketsBotApiError(detail, res.status, data);
  }
}

export async function executeTicketCommandViaBot(params: {
  channelId: string;
  actorId: string;
  command: string;
  args: string;
}): Promise<{ ok: true; detail: string; command: string }> {
  const url = `${baseUrl()}/ticket-command`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Tickets-Key": secret(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel_id: params.channelId,
        actor_id: params.actorId,
        command: params.command,
        args: params.args,
      }),
      cache: "no-store",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    throw new TicketsBotApiError(
      `Cannot reach MinecadiaTickets API at ${baseUrl()} (${msg}). Restart the tickets bot so the dashboard command server starts on port 8788.`,
      503
    );
  }

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
  return data as { ok: true; detail: string; command: string };
}
