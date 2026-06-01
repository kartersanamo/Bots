import {
  requireAction,
  handleApiRoute,
  withAudit,
} from "@/lib/api/helpers";
import { adjustStatistics } from "@/lib/db/mutations";

export const PATCH = handleApiRoute(async (request) => {
  const session = await requireAction("bot.panels");
  const { userId, field, delta } = await request.json();
  if (!userId || !field || delta === undefined) {
    return Response.json(
      { error: "userId, field, delta required" },
      { status: 400 }
    );
  }
  await withAudit(
    request,
    session,
    "staff.stats.adjust",
    `${userId}:${field}`,
    () => adjustStatistics(userId, field, Number(delta))
  );
  return Response.json({ ok: true });
});
