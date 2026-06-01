import { handleApiRoute, requireAction } from "@/lib/api/helpers";
import { listGameSessions } from "@/lib/db/games";
import { isDbConfigured } from "@/lib/db/pool";

export const GET = handleApiRoute(async (request) => {
  await requireAction("games.read");
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || 80);
  const search = url.searchParams.get("search") || undefined;
  const dmParam = url.searchParams.get("dm");
  const dm =
    dmParam === "chat" || dmParam === "dm" ? dmParam : ("all" as const);

  if (!isDbConfigured()) {
    return Response.json({ sessions: [], configured: false });
  }

  const sessions = await listGameSessions({ limit, search, dm });
  return Response.json({ sessions, configured: true });
});
