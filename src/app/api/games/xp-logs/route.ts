import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { listXpLogs } from "@/lib/db/games";
import { isDbConfigured } from "@/lib/db/pool";

export const GET = handleApiRoute(async (request) => {
  await requireAction("games.read");
  const url = new URL(request.url);

  if (!isDbConfigured()) {
    return Response.json({ rows: [], total: 0, configured: false });
  }

  const result = await listXpLogs({
    page: Number(url.searchParams.get("page") || 1),
    limit: Number(url.searchParams.get("limit") || 50),
    userId: url.searchParams.get("userId") || undefined,
    source: url.searchParams.get("source") || undefined,
    gameId: url.searchParams.get("gameId") || undefined,
  });

  return Response.json({ ...result, configured: true });
});
