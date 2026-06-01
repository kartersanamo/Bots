import {
  requireAction,
  handleApiRoute,
  withAudit,
} from "@/lib/api/helpers";
import { closePoll } from "@/lib/db/mutations";

export const POST = handleApiRoute(async (request, { params }) => {
  const session = await requireAction("polls.write");
  const { id } = await params;
  await withAudit(request, session, "poll.close", id, () => closePoll(id));
  return Response.json({ ok: true });
});
