import { handleApiRoute } from "@/lib/api/helpers";
import { requireSession } from "@/lib/auth/session";
import { getDashboardHomePayload } from "@/lib/data/dashboard-home";
import { jsonCached } from "@/lib/http/json-cache";

export const GET = handleApiRoute(async () => {
  await requireSession();
  const payload = await getDashboardHomePayload();
  return jsonCached(payload, 30, {
    staleWhileRevalidate: 60,
    private: true,
  });
});
