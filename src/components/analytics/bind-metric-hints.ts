import type { KpiItem } from "@/components/analytics/AnalyticsKpiGrid";
import { analyticsHint } from "@/lib/analytics/metric-hints";

/** KPI row with ? tooltip from the metric-hints registry. */
export function kpi(
  label: string,
  value: string | number,
  hintKey: string,
  opts?: { subtitle?: string }
): KpiItem {
  return {
    label,
    value,
    dataHint: analyticsHint(hintKey),
    hint: opts?.subtitle,
  };
}
