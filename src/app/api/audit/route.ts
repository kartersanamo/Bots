import { requireAction, handleApiRoute } from "@/lib/api/helpers";
import { getRecentAudit } from "@/lib/audit";
import { jsonCached } from "@/lib/http/json-cache";

export const GET = handleApiRoute(async (request) => {
  await requireAction("audit.view");
  const limit = Math.min(
    200,
    Number(new URL(request.url).searchParams.get("limit") || 50)
  );
  const entries = await getRecentAudit(limit);
  return jsonCached({ entries }, 60, {
    staleWhileRevalidate: 120,
    private: true,
  });
});
