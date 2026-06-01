import {
  requireAction,
  handleApiRoute,
  withAudit,
} from "@/lib/api/helpers";
import { updateFaction, deleteFaction } from "@/lib/db/mutations";
import { queryOne, isDbConfigured } from "@/lib/db/pool";

export const GET = handleApiRoute(async (_req, { params }) => {
  await requireAction("bot.panels");
  const { id } = await params;
  if (!isDbConfigured()) {
    return Response.json({ error: "DB not configured" }, { status: 503 });
  }
  const row = await queryOne(
    `SELECT * FROM leader_factions WHERE id = ?`,
    [id]
  );
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(row);
});

export const PATCH = handleApiRoute(async (request, { params }) => {
  const session = await requireAction("factions.write");
  const { id } = await params;
  const data = await request.json();
  await withAudit(
    request,
    session,
    "faction.update",
    id,
    () => updateFaction(Number(id), data)
  );
  return Response.json({ ok: true });
});

export const DELETE = handleApiRoute(async (request, { params }) => {
  const session = await requireAction("factions.write");
  const { id } = await params;
  const { confirm } = await request.json().catch(() => ({}));
  if (confirm !== `DELETE_FACTION_${id}`) {
    return Response.json(
      { error: `Send confirm: DELETE_FACTION_${id}` },
      { status: 400 }
    );
  }
  await withAudit(request, session, "faction.delete", id, () =>
    deleteFaction(Number(id))
  );
  return Response.json({ ok: true });
});
