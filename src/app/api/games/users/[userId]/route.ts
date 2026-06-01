import {
  handleApiRoute,
  requireAction,
  withAudit,
} from "@/lib/api/helpers";
import { getUserGamesProfile } from "@/lib/db/games";
import {
  addLevelingXp,
  awardXpWithLog,
  setLevelingXp,
} from "@/lib/db/mutations";
import { isDbConfigured } from "@/lib/db/pool";

export const GET = handleApiRoute(async (_req, { params }) => {
  await requireAction("games.read");
  const { userId } = await params;

  if (!isDbConfigured()) {
    return Response.json({ configured: false, profile: null });
  }

  const profile = await getUserGamesProfile(userId);
  return Response.json({ configured: true, profile });
});

export const PATCH = handleApiRoute(async (request, { params }) => {
  const session = await requireAction("games.write");
  const { userId } = await params;
  const body = await request.json();

  if (body.addXp !== undefined) {
    const useLog = body.log !== false;
    const result = await withAudit(
      request,
      session,
      useLog ? "games.add_xp_log" : "games.add_xp",
      userId,
      () =>
        useLog
          ? awardXpWithLog(userId, Number(body.addXp), {
              source: body.source || "dashboard",
            })
          : addLevelingXp(userId, Number(body.addXp))
    );
    return Response.json(result);
  }

  if (body.xp !== undefined && body.level !== undefined) {
    await withAudit(
      request,
      session,
      "games.set_leveling",
      userId,
      () => setLevelingXp(userId, Number(body.xp), Number(body.level)),
      {
        before: { userId },
        getAfter: () => ({ xp: body.xp, level: body.level }),
      }
    );
    return Response.json({ ok: true });
  }

  return Response.json(
    { error: "addXp or xp+level required" },
    { status: 400 }
  );
});
