"use client";

import {
  buildHintTooltip,
  enrichHint,
  type AnalyticsDataMeta,
  type AnalyticsHintContext,
} from "@/lib/analytics/hint";
import { analyticsHint } from "@/lib/analytics/metric-hints";
import type { AnalyticsGroupBy } from "@/lib/analytics/group-by";
import type { AnalyticsRange } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const AnalyticsHintCtx = createContext<AnalyticsHintContext | null>(null);

export function AnalyticsHintProvider({
  range,
  groupBy,
  fetchedAt,
  rangeApplies,
  children,
}: {
  range: AnalyticsRange;
  groupBy: AnalyticsGroupBy;
  fetchedAt: number;
  rangeApplies: boolean;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ range, groupBy, fetchedAt, rangeApplies }),
    [range, groupBy, fetchedAt, rangeApplies]
  );
  return (
    <AnalyticsHintCtx.Provider value={value}>{children}</AnalyticsHintCtx.Provider>
  );
}

export function useAnalyticsHintContext(): AnalyticsHintContext {
  const ctx = useContext(AnalyticsHintCtx);
  if (!ctx) {
    return {
      range: "30d",
      groupBy: "day",
      fetchedAt: Date.now(),
      rangeApplies: true,
    };
  }
  return ctx;
}

function resolveMeta(meta: AnalyticsDataMeta | string): AnalyticsDataMeta {
  if (typeof meta === "string") return analyticsHint(meta);
  if (meta.hintSeries) {
    return enrichHint(meta, meta.hintSeries);
  }
  return meta;
}

export function AnalyticsHintIcon({
  meta,
  className,
}: {
  meta: AnalyticsDataMeta | string;
  className?: string;
}) {
  const ctx = useAnalyticsHintContext();
  const resolved = resolveMeta(meta);
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [open, ctx.fetchedAt]);

  const tooltip = buildHintTooltip(ctx, resolved);

  return (
    <span
      className={cn("group/hint relative inline-flex align-middle", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        className="ml-1 inline-flex shrink-0 rounded p-0.5 text-muted hover:bg-surface-hover hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        aria-label="About this metric"
      >
        <HelpCircle className="h-3 w-3" strokeWidth={2.25} />
      </button>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border border-border bg-[#0f172a] px-2.5 py-2 text-left text-[11px] leading-snug text-slate-200 shadow-lg",
          open ? "visible opacity-100" : "invisible opacity-0"
        )}
      >
        {tooltip.split("\n").map((line, i) =>
          line === "" ? (
            <span key={i} className="block h-1.5" />
          ) : line.startsWith("Range:") || line.startsWith("Last refreshed:") ? (
            <span key={i} className="mt-0.5 block text-[10px] text-slate-400">
              {line}
            </span>
          ) : (
            <span key={i} className="block">
              {line}
            </span>
          )
        )}
      </span>
    </span>
  );
}

export function AnalyticsLabelWithHint({
  label,
  meta,
  className,
  as = "span",
}: {
  label: ReactNode;
  meta?: AnalyticsDataMeta | string;
  className?: string;
  as?: "span" | "p" | "h3";
}) {
  const Tag = as;
  if (!meta) {
    return <Tag className={className}>{label}</Tag>;
  }
  return (
    <Tag className={cn("inline-flex items-center gap-0", className)}>
      {label}
      <AnalyticsHintIcon meta={meta} />
    </Tag>
  );
}
