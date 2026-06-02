import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { getGamesOverviewPayload } from "@/lib/data/games-overview";
import { jsonCached } from "@/lib/http/json-cache";

export const GET = handleApiRoute(async () => {
  await requireAction("games.read");
  const payload = await getGamesOverviewPayload();
  return jsonCached(payload, 30, {
    staleWhileRevalidate: 60,
    private: true,
  });
});
