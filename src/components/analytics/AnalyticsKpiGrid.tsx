"use client";

import { AnalyticsLabelWithHint } from "@/components/analytics/AnalyticsHint";
import type { AnalyticsDataMeta } from "@/lib/analytics/hint";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface KpiItem {
  label: string;
  value: string | number;
  /** Subtitle shown under the value (not the ? tooltip). */
  hint?: string;
  /** ? tooltip: registry key or full meta. */
  dataHint?: AnalyticsDataMeta | string;
}

interface AnalyticsKpiGridProps {
  items: KpiItem[];
  className?: string;
}

export function AnalyticsKpiGrid({ items, className }: AnalyticsKpiGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border bg-surface px-4 py-3"
        >
          <AnalyticsLabelWithHint
            as="p"
            className="text-xs text-muted"
            label={item.label}
            meta={item.dataHint}
          />
          <p className="mt-1 text-2xl font-semibold text-white">
            {typeof item.value === "number"
              ? formatNumber(item.value)
              : item.value}
          </p>
          {item.hint && (
            <p className="mt-0.5 text-xs text-muted">{item.hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}
