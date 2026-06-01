import {
  requireAction,
  handleApiRoute,
  withAudit,
} from "@/lib/api/helpers";
import { addBlacklist, removeBlacklist } from "@/lib/db/mutations";
import { query } from "@/lib/db/pool";
import { isDbConfigured } from "@/lib/db/pool";

export const GET = handleApiRoute(async () => {
  await requireAction("tickets.read");
  if (!isDbConfigured()) return Response.json({ blacklists: [] });
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM blacklists ORDER BY userID DESC LIMIT 100`
  ).catch(() => []);
  return Response.json({ blacklists: rows });
});

export const POST = handleApiRoute(async (request) => {
  const session = await requireAction("tickets.write");
  const { userId, reason, expiresAt } = await request.json();
  if (!userId) {
    return Response.json({ error: "userId required" }, { status: 400 });
  }
  await withAudit(
    request,
    session,
    "blacklist.add",
    userId,
    () => addBlacklist(userId, reason || "", expiresAt ?? null, session.id),
    { before: { userId } }
  );
  return Response.json({ ok: true });
});

export const DELETE = handleApiRoute(async (request) => {
  const session = await requireAction("tickets.write");
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) {
    return Response.json({ error: "userId required" }, { status: 400 });
  }
  await withAudit(request, session, "blacklist.remove", userId, () =>
    removeBlacklist(userId)
  );
  return Response.json({ ok: true });
});
