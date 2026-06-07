import { handleApiRoute, requireAction, withAudit } from "@/lib/api/helpers";
import { getBotConfig, isControlApiConfigured } from "@/lib/control-api/client";
import { grantAchievement, revokeAchievement } from "@/lib/db/mutations";
import { query, isDbConfigured } from "@/lib/db/pool";
import { discordUsersForIds, snowflakeString } from "@/lib/games/discord-enrich";

export const GET = handleApiRoute(async () => {
  await requireAction("games.read");

  let definitions: unknown = {};
  if (isControlApiConfigured()) {
    try {
      const data = await getBotConfig("games", "assets/configs/milestones.json");
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

  const grantsNormalized = grants.map((g) => ({
    ...g,
    user_id: snowflakeString(g.user_id),
  }));
  const users = await discordUsersForIds(
    grantsNormalized.map((g) => g.user_id)
  );
  return Response.json({
    definitions,
    grants: grantsNormalized,
    users,
    configured: isDbConfigured(),
  });
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
