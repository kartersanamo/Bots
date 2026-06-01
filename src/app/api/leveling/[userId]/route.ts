import {
  requireAction,
  handleApiRoute,
  withAudit,
} from "@/lib/api/helpers";
import { setLevelingXp, addLevelingXp } from "@/lib/db/mutations";
import { queryOne, isDbConfigured } from "@/lib/db/pool";

export const GET = handleApiRoute(async (_req, { params }) => {
  await requireAction("leveling.read");
  const { userId } = await params;
  if (!isDbConfigured()) {
    return Response.json({ userId, xp: 0, level: 1 });
  }
  const row = await queryOne<{ xp: number; level: number }>(
    `SELECT xp, level FROM leveling WHERE user_id = ?`,
    [userId]
  );
  return Response.json({ userId, xp: row?.xp ?? 0, level: row?.level ?? 1 });
});

export const PATCH = handleApiRoute(async (request, { params }) => {
  const session = await requireAction("leveling.write");
  const { userId } = await params;
  const body = await request.json();

  if (body.addXp !== undefined) {
    const result = await withAudit(
      request,
      session,
      "leveling.add_xp",
      userId,
      () => addLevelingXp(userId, Number(body.addXp))
    );
    return Response.json(result);
  }

  if (body.xp !== undefined && body.level !== undefined) {
    await withAudit(
      request,
      session,
      "leveling.set",
      userId,
      () => setLevelingXp(userId, Number(body.xp), Number(body.level)),
      { before: { userId }, getAfter: () => ({ xp: body.xp, level: body.level }) }
    );
    return Response.json({ ok: true });
  }

  return Response.json({ error: "addXp or xp+level required" }, { status: 400 });
});
