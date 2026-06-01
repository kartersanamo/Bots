import type { AnalyticsRange } from "@/lib/analytics/types";

export type AnalyticsGroupBy = "day" | "week" | "month";

const GROUP_RANK: Record<AnalyticsGroupBy, number> = {
  day: 0,
  week: 1,
  month: 2,
};

/** Smallest allowed grouping for each dataset window. */
export function minGroupByForRange(range: AnalyticsRange): AnalyticsGroupBy {
  switch (range) {
    case "today":
    case "7d":
      return "day";
    case "30d":
      return "day";
    case "90d":
    case "365d":
      return "week";
    case "all":
      return "month";
  }
}

export function allowedGroupByForRange(range: AnalyticsRange): AnalyticsGroupBy[] {
  const min = GROUP_RANK[minGroupByForRange(range)];
  return (["day", "week", "month"] as const).filter(
    (g) => GROUP_RANK[g] >= min
  );
}

export function defaultGroupByForRange(range: AnalyticsRange): AnalyticsGroupBy {
  const allowed = allowedGroupByForRange(range);
  if (range === "365d" || range === "all") {
    return allowed.includes("month") ? "month" : allowed[allowed.length - 1]!;
  }
  return allowed[0]!;
}

export function parseAnalyticsGroupBy(
  input: string | null,
  range: AnalyticsRange
): AnalyticsGroupBy {
  const allowed = allowedGroupByForRange(range);
  if (
    (input === "day" || input === "week" || input === "month") &&
    allowed.includes(input)
  ) {
    return input;
  }
  return defaultGroupByForRange(range);
}

export function groupByLabel(groupBy: AnalyticsGroupBy): string {
  const labels: Record<AnalyticsGroupBy, string> = {
    day: "Day",
    week: "Week",
    month: "Month",
  };
  return labels[groupBy];
}

export function perPeriodLabel(groupBy: AnalyticsGroupBy): string {
  const labels: Record<AnalyticsGroupBy, string> = {
    day: "per day",
    week: "per week",
    month: "per month",
  };
  return labels[groupBy];
}

export function chartTitleWithPeriod(
  base: string,
  groupBy: AnalyticsGroupBy
): string {
  return `${base} ${perPeriodLabel(groupBy)}`;
}
