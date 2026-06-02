"use client";

import { AnalyticsLabelWithHint } from "@/components/analytics/AnalyticsHint";
import {
  allowedGroupByForRange,
  groupByLabel,
  parseAnalyticsGroupBy,
  type AnalyticsGroupBy,
} from "@/lib/analytics/group-by";
import { rangeLabel } from "@/lib/analytics/range";
import type { AnalyticsRange } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

const RANGES: AnalyticsRange[] = [
  "today",
  "7d",
  "30d",
  "90d",
  "365d",
  "all",
];

interface AnalyticsControlsProps {
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
  onRangeChange: (range: AnalyticsRange) => void;
  onGroupByChange: (groupBy: AnalyticsGroupBy) => void;
  className?: string;
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="space-y-1.5">
      <AnalyticsLabelWithHint
        as="p"
        className="text-xs font-medium uppercase tracking-wide text-muted"
        label={label}
        meta={label === "Range" ? "controls.range" : "controls.groupBy"}
      />
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              value === opt.value
                ? "bg-accent text-white"
                : "text-muted hover:bg-surface-hover hover:text-white"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsControls({
  range,
  groupBy,
  onRangeChange,
  onGroupByChange,
  className,
}: AnalyticsControlsProps) {
  const groupOptions = allowedGroupByForRange(range).map((g) => ({
    value: g,
    label: groupByLabel(g),
  }));

  const effectiveGroupBy = parseAnalyticsGroupBy(groupBy, range);

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end", className)}>
      <ToggleGroup
        label="Range"
        options={RANGES.map((r) => ({ value: r, label: rangeLabel(r) }))}
        value={range}
        onChange={onRangeChange}
      />
      <ToggleGroup
        label="Group by"
        options={groupOptions}
        value={effectiveGroupBy}
        onChange={onGroupByChange}
      />
    </div>
  );
}
