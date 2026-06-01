"use client";

import type { AnalyticsRange } from "@/lib/analytics/types";
import { rangeLabel } from "@/lib/analytics/range";
import { cn } from "@/lib/utils";

const RANGES: AnalyticsRange[] = ["7d", "30d", "90d", "365d", "all"];

interface AnalyticsRangeSelectorProps {
  value: AnalyticsRange;
  onChange: (range: AnalyticsRange) => void;
  className?: string;
}

export function AnalyticsRangeSelector({
  value,
  onChange,
  className,
}: AnalyticsRangeSelectorProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1",
        className
      )}
    >
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors",
            value === r
              ? "bg-accent text-white"
              : "text-muted hover:bg-surface-hover hover:text-white"
          )}
        >
          {rangeLabel(r)}
        </button>
      ))}
    </div>
  );
}
