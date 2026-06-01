"use client";

import { downloadCsv } from "@/components/analytics/download";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";
import type { ReactNode } from "react";

interface AnalyticsChartCardProps {
  title: string;
  children: ReactNode;
  exportHeaders?: string[];
  exportRows?: Record<string, unknown>[];
  exportFilename?: string;
  className?: string;
}

export function AnalyticsChartCard({
  title,
  children,
  exportHeaders,
  exportRows,
  exportFilename,
  className,
}: AnalyticsChartCardProps) {
  const canExport =
    exportHeaders?.length && exportRows && exportFilename;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-4",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-white">{title}</h3>
        {canExport && (
          <button
            type="button"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-hover hover:text-white"
            onClick={() =>
              downloadCsv(exportFilename!, exportHeaders!, exportRows!)
            }
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        )}
      </div>
      <div className="min-h-[200px]">{children}</div>
    </div>
  );
}
