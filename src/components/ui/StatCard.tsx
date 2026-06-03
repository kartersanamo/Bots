"use client";

import { cn, formatNumber } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  loading?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  loading,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {label}
          </p>
          {loading ? (
            <div className="mt-2 h-7 w-20 animate-pulse rounded bg-surface-hover" />
          ) : (
            <p className="mt-1 text-xl font-semibold text-white sm:text-2xl">
              {typeof value === "number" ? formatNumber(value) : value}
            </p>
          )}
          {trend && !loading && (
            <p className="mt-0.5 text-xs text-muted">{trend}</p>
          )}
        </div>
        <Icon className="h-4 w-4 shrink-0 text-muted" />
      </div>
    </div>
  );
}
