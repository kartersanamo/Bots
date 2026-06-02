import { handleApiRoute } from "@/lib/api/helpers";
import { hasDashboardAccess } from "@/lib/auth/dashboard-access";
import { listAuthRejectedLiveEvents } from "@/lib/auth/live-events";
import { requireSession } from "@/lib/auth/session";

export const GET = handleApiRoute(async (request) => {
  const session = await requireSession();
  if (!hasDashboardAccess(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const since = Number(url.searchParams.get("since") || 0);
  const events = listAuthRejectedLiveEvents(Number.isFinite(since) ? since : 0);
  const lastEventId = events.length ? events[events.length - 1].id : since || 0;
  return Response.json({ events, lastEventId, now: Date.now() });
});
