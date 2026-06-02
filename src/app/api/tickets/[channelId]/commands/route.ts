import { handleApiRoute, withAudit } from "@/lib/api/helpers";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { getTicketByChannelId } from "@/lib/db/tickets";
import {
  closeTicketViaBot,
  isTicketsBotApiConfigured,
  TicketsBotApiError,
} from "@/lib/tickets-bot/client";
import { editChannel } from "@/lib/discord/actions";
import { isTicketOpen } from "@/lib/tickets/types";

type CommandResult = {
  ok: true;
  action: string;
  detail: string;
};

function parseCommand(input: string): { name: string; args: string } {
  const trimmed = input.trim().replace(/^\/+/, "");
  const [name = "", ...rest] = trimmed.split(" ");
  return { name: name.toLowerCase(), args: rest.join(" ").trim() };
}

export const POST = handleApiRoute(async (request, { params }) => {
  const session = await requireSession();
  const { channelId } = await params;
  const body = await request.json().catch(() => ({}));
  const raw = String(body.command ?? "").trim();

  if (!raw.startsWith("/")) {
    return Response.json(
      { error: "Commands must start with /" },
      { status: 400 }
    );
  }
  if (!can(session.tier, "tickets.write")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const ticket = await getTicketByChannelId(channelId, session.tier);
  if (!ticket) {
    return Response.json({ error: "Ticket not found" }, { status: 404 });
  }

  const { name, args } = parseCommand(raw);
  const commandName = `ticket.cmd.${name || "unknown"}`;

  const run = async (): Promise<CommandResult> => {
    switch (name) {
      case "close": {
        if (!isTicketOpen(ticket.active)) {
          throw new Error("Ticket is already closed");
        }
        const reason = args || "Closed from dashboard command";
        if (!isTicketsBotApiConfigured()) {
          throw new Error(
            "Tickets bot API not configured (set TICKETS_BOT_API_SECRET)"
          );
        }
        await closeTicketViaBot({
          channelId,
          closedById: session.id,
          reason,
        });
        return { ok: true, action: "close", detail: "Ticket close dispatched." };
      }
      case "rename": {
        if (!can(session.tier, "discord.channels")) {
          throw new Error("Forbidden");
        }
        const nextName = args.trim();
        if (nextName.length < 2) {
          throw new Error("Usage: /rename <new-channel-name>");
        }
        await editChannel(channelId, { name: nextName.slice(0, 100) });
        return { ok: true, action: "rename", detail: `Renamed to ${nextName}` };
      }
      case "slowmode": {
        if (!can(session.tier, "discord.channels")) {
          throw new Error("Forbidden");
        }
        const seconds = Number(args);
        if (!Number.isFinite(seconds) || seconds < 0 || seconds > 21600) {
          throw new Error("Usage: /slowmode <0-21600>");
        }
        await editChannel(channelId, {
          rate_limit_per_user: Math.floor(seconds),
        });
        return {
          ok: true,
          action: "slowmode",
          detail: `Slowmode set to ${Math.floor(seconds)}s`,
        };
      }
      case "topic": {
        if (!can(session.tier, "discord.channels")) {
          throw new Error("Forbidden");
        }
        if (!args) {
          throw new Error("Usage: /topic <channel topic>");
        }
        await editChannel(channelId, { topic: args.slice(0, 1024) });
        return { ok: true, action: "topic", detail: "Channel topic updated." };
      }
      default:
        throw new Error(
          "Unknown command. Supported: /close, /rename, /slowmode, /topic"
        );
    }
  };

  try {
    const result = await withAudit(
      request,
      session,
      commandName,
      channelId,
      run,
      { before: { command: raw } }
    );
    return Response.json(result);
  } catch (err) {
    if (err instanceof TicketsBotApiError) {
      const status = err.status >= 400 && err.status < 600 ? err.status : 503;
      return Response.json({ error: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : "Command failed";
    const status =
      message === "Forbidden" ? 403 : message.includes("not found") ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
});
