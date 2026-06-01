import { requireAction } from "@/lib/api/helpers";
import { parseAnalyticsRange } from "@/lib/analytics/range";
import type { AnalyticsRange } from "@/lib/analytics/types";
import type { SessionUser } from "@/lib/auth/session";

export async function requireAnalyticsSession(): Promise<{
  session: SessionUser;
  range: AnalyticsRange;
}> {
  const session = await requireAction("analytics.read");
  return { session, range: "30d" };
}

export function rangeFromRequest(request: Request): AnalyticsRange {
  return parseAnalyticsRange(new URL(request.url).searchParams.get("range"));
}

export async function requireAnalytics(
  request: Request
): Promise<{ session: SessionUser; range: AnalyticsRange }> {
  const session = await requireAction("analytics.read");
  return { session, range: rangeFromRequest(request) };
}
