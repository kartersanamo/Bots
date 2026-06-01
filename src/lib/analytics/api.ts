import { requireAction } from "@/lib/api/helpers";
import {
  parseAnalyticsGroupBy,
  type AnalyticsGroupBy,
} from "@/lib/analytics/group-by";
import { parseAnalyticsRange } from "@/lib/analytics/range";
import type { AnalyticsRange } from "@/lib/analytics/types";
import type { SessionUser } from "@/lib/auth/session";

export type AnalyticsQuery = {
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
};

export function analyticsQueryFromUrl(url: string | URL): AnalyticsQuery {
  const params = new URL(url).searchParams;
  const range = parseAnalyticsRange(params.get("range"));
  const groupBy = parseAnalyticsGroupBy(params.get("group"), range);
  return { range, groupBy };
}

export async function requireAnalytics(
  request: Request
): Promise<{ session: SessionUser } & AnalyticsQuery> {
  const session = await requireAction("analytics.read");
  const q = analyticsQueryFromUrl(request.url);
  return { session, ...q };
}
