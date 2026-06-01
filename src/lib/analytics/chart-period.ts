import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import { chartTitleWithPeriod, perPeriodLabel } from "@/lib/analytics/group-by";

export { chartTitleWithPeriod, perPeriodLabel };

export function exportFilenameWithPeriod(
  base: string,
  groupBy: AnalyticsGroupBy
): string {
  return `${base}-${groupBy}.csv`;
}
