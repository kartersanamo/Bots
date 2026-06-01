import { handleApiRoute, requireAction, withAudit } from "@/lib/api/helpers";
import { getBotConfig, isControlApiConfigured } from "@/lib/control-api/client";
import { grantAchievement, revokeAchievement } from "@/lib/db/mutations";
import { query, isDbConfigured } from "@/lib/db/pool";

export const GET = handleApiRoute(async () => {
  await requireAction("games.read");

  let definitions: unknown = {};
  if (isControlApiConfigured()) {
    try {
      const data = await getBotConfig("games", "assets/Configs/milestones.json");
      definitions = data.content ?? {};
    } catch {
      /* optional */
    }
  }

  let grants: { user_id: string; achievement_id: string; earned_at: string | null }[] =
    [];
  if (isDbConfigured()) {
    grants = await query(
      `SELECT user_id, achievement_id, earned_at FROM user_achievements ORDER BY earned_at DESC LIMIT 200`
    );
  }

  return Response.json({ definitions, grants, configured: isDbConfigured() });
});

export const POST = handleApiRoute(async (request) => {
  const session = await requireAction("games.write");
  const body = await request.json();
  const { userId, achievementId, action } = body;

  if (!userId || !achievementId) {
    return Response.json(
      { error: "userId and achievementId required" },
      { status: 400 }
    );
  }

  if (action === "revoke") {
    await withAudit(request, session, "games.revoke_achievement", userId, () =>
      revokeAchievement(userId, achievementId)
    );
  } else {
    await withAudit(request, session, "games.grant_achievement", userId, () =>
      grantAchievement(userId, achievementId)
    );
  }

  return Response.json({ ok: true });
});
