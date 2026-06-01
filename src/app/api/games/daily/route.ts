import { handleApiRoute, requireAction, withAudit } from "@/lib/api/helpers";
import { listDailyClaims } from "@/lib/db/games";
import { setDailyClaim } from "@/lib/db/mutations";
import { isDbConfigured } from "@/lib/db/pool";

export const GET = handleApiRoute(async (request) => {
  await requireAction("games.read");
  const url = new URL(request.url);

  if (!isDbConfigured()) {
    return Response.json({ rows: [], total: 0, configured: false });
  }

  const result = await listDailyClaims({
    page: Number(url.searchParams.get("page") || 1),
    limit: Number(url.searchParams.get("limit") || 50),
  });
  return Response.json({ ...result, configured: true });
});

export const PATCH = handleApiRoute(async (request) => {
  const session = await requireAction("games.write");
  const body = await request.json();
  const { userId, streak, lastClaimed } = body;

  if (!userId) {
    return Response.json({ error: "userId required" }, { status: 400 });
  }

  await withAudit(request, session, "games.daily_claim", userId, () =>
    setDailyClaim(userId, Number(streak ?? 0), lastClaimed ?? null)
  );
  return Response.json({ ok: true });
});
