import { requireAction, handleApiRoute } from "@/lib/api/helpers";
import { getRecentAudit } from "@/lib/audit";

export const GET = handleApiRoute(async (request) => {
  await requireAction("audit.view");
  const limit = Number(new URL(request.url).searchParams.get("limit") || 100);
  const entries = await getRecentAudit(limit);
  return Response.json({ entries });
});
