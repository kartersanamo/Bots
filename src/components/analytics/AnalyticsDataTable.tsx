"use client";

import { downloadCsv } from "@/components/analytics/download";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";
import type { ReactNode } from "react";

interface AnalyticsDataTableProps {
  title: string;
  headers: string[];
  exportFilename: string;
  exportRows: Record<string, unknown>[];
  children: ReactNode;
  className?: string;
}

export function AnalyticsDataTable({
  title,
  headers,
  exportFilename,
  exportRows,
  children,
  className,
}: AnalyticsDataTableProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h3 className="text-sm font-medium text-white">{title}</h3>
        <button
          type="button"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-hover hover:text-white"
          onClick={() => downloadCsv(exportFilename, headers, exportRows)}
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function AnalyticsTable({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <table className={cn("w-full text-sm", className)}>
      {children}
    </table>
  );
}
