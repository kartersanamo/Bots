import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { listMonthlyLeaderboard } from "@/lib/db/games";
import { isDbConfigured } from "@/lib/db/pool";

export const GET = handleApiRoute(async (request) => {
  await requireAction("games.read");
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || 1);
  const limit = Number(url.searchParams.get("limit") || 50);
  const search = url.searchParams.get("search") || undefined;

  if (!isDbConfigured()) {
    return Response.json({ rows: [], total: 0, configured: false });
  }

  const result = await listMonthlyLeaderboard({ page, limit, search });
  return Response.json({ ...result, configured: true, page, limit });
});
