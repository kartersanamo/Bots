import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { listMonthlyLeaderboard } from "@/lib/db/games";
import { isDbConfigured } from "@/lib/db/pool";
import { discordUsersForIds, snowflakeString } from "@/lib/games/discord-enrich";

export const GET = handleApiRoute(async (request) => {
  await requireAction("games.read");
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || 1);
  const limit = Number(url.searchParams.get("limit") || 50);
  const search = url.searchParams.get("search") || undefined;

  if (!isDbConfigured()) {
    return Response.json({ rows: [], total: 0, configured: false, users: {} });
  }

  const result = await listMonthlyLeaderboard({ page, limit, search });
  const rows = result.rows.map((r) => ({
    ...r,
    user_id: snowflakeString(r.user_id),
  }));
  const users = await discordUsersForIds(rows.map((r) => r.user_id));
  return Response.json({ ...result, rows, users, configured: true, page, limit });
});
