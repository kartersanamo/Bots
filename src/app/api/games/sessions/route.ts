import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { listGameSessions } from "@/lib/db/games";
import { isDbConfigured } from "@/lib/db/pool";

export const GET = handleApiRoute(async (request) => {
  await requireAction("games.read");
  const limit = Number(new URL(request.url).searchParams.get("limit") || 50);

  if (!isDbConfigured()) {
    return Response.json({ sessions: [], configured: false });
  }

  const sessions = await listGameSessions(limit);
  return Response.json({ sessions, configured: true });
});
