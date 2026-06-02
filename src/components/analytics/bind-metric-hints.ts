import type { KpiItem } from "@/components/analytics/AnalyticsKpiGrid";
import { dataSpanFromDateStrings } from "@/lib/analytics/data-span";
import { enrichHint, type AnalyticsDataMeta } from "@/lib/analytics/hint";
import { analyticsHint } from "@/lib/analytics/metric-hints";
import type { DailyCount } from "@/lib/analytics/types";

/** Chart/KPI hint with actual oldest/newest dates from loaded series. */
export function chartHint(
  hintKey: string,
  series?: DailyCount[] | DailyCount[][],
  overrides?: Partial<AnalyticsDataMeta>
): AnalyticsDataMeta {
  const base = { ...analyticsHint(hintKey), ...overrides };
  if (overrides?.hintTimestamps || overrides?.dataSpan) return base;
  return enrichHint(base, series);
}

export function chartHintFromTimestamps(
  hintKey: string,
  unixSeconds: number[],
  overrides?: Partial<AnalyticsDataMeta>
): AnalyticsDataMeta {
  return {
    ...analyticsHint(hintKey),
    ...overrides,
    hintTimestamps: unixSeconds,
  };
}

export function chartHintFromDates(
  hintKey: string,
  dateKeys: string[],
  overrides?: Partial<AnalyticsDataMeta>
): AnalyticsDataMeta {
  return {
    ...analyticsHint(hintKey),
    ...overrides,
    dataSpan: dataSpanFromDateStrings(dateKeys),
  };
}

/** KPI row with ? tooltip from the metric-hints registry. */
export function kpi(
  label: string,
  value: string | number,
  hintKey: string,
  opts?: {
    subtitle?: string;
    hintSeries?: DailyCount[] | DailyCount[][];
    hintOverrides?: Partial<AnalyticsDataMeta>;
  }
): KpiItem {
  return {
    label,
    value,
    dataHint: chartHint(hintKey, opts?.hintSeries, opts?.hintOverrides),
    hint: opts?.subtitle,
  };
}
