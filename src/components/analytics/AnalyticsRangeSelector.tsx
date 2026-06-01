"use client";

import { AnalyticsControls } from "@/components/analytics/AnalyticsControls";
import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import type { AnalyticsRange } from "@/lib/analytics/types";

/** @deprecated Use AnalyticsControls for range + group-by. */
interface AnalyticsRangeSelectorProps {
  value: AnalyticsRange;
  groupBy?: AnalyticsGroupBy;
  onChange: (range: AnalyticsRange) => void;
  onGroupByChange?: (groupBy: AnalyticsGroupBy) => void;
  className?: string;
}

export function AnalyticsRangeSelector({
  value,
  groupBy = "day",
  onChange,
  onGroupByChange,
  className,
}: AnalyticsRangeSelectorProps) {
  return (
    <AnalyticsControls
      range={value}
      groupBy={groupBy}
      onRangeChange={onChange}
      onGroupByChange={onGroupByChange ?? (() => {})}
      className={className}
    />
  );
}
