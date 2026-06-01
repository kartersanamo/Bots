import {
  requireAction,
  handleApiRoute,
  withAudit,
} from "@/lib/api/helpers";
import { closeTicket } from "@/lib/db/mutations";

export const POST = handleApiRoute(async (request, { params }) => {
  const session = await requireAction("tickets.write");
  const { channelId } = await params;
  await withAudit(request, session, "ticket.close", channelId, () =>
    closeTicket(channelId, session.id)
  );
  return Response.json({ ok: true });
});
