import { handleApiRoute, withAudit } from "@/lib/api/helpers";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { getTicketByChannelId } from "@/lib/db/tickets";
import {
  executeTicketCommandViaBot,
  isTicketsBotApiConfigured,
  TicketsBotApiError,
} from "@/lib/tickets-bot/client";
import {
  parseTicketCommand,
  TICKET_BOT_COMMANDS,
} from "@/lib/tickets/commands";

type CommandResult = { ok: true; action: string; detail: string };

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

  const { name, args } = parseTicketCommand(raw);
  const commandName = `ticket.cmd.${name || "unknown"}`;
  const valid = TICKET_BOT_COMMANDS.find((c) => c.name === name);

  const run = async (): Promise<CommandResult> => {
    if (!valid) {
      throw new Error(
        `Unknown command. Supported: ${TICKET_BOT_COMMANDS.map((c) => `/${c.name}`).join(", ")}`
      );
    }
    if (!isTicketsBotApiConfigured()) {
      throw new Error(
        "Tickets bot API not configured (set TICKETS_BOT_API_SECRET)"
      );
    }

    const out = await executeTicketCommandViaBot({
      channelId,
      actorId: session.id,
      command: valid.name,
      args,
    });
    return { ok: true, action: valid.name, detail: out.detail };
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
