"use client";

import { AnalyticsLabelWithHint } from "@/components/analytics/AnalyticsHint";
import { TableRowLimitSelect } from "@/components/analytics/table-row-limit";
import { downloadCsv } from "@/components/analytics/download";
import type { AnalyticsDataMeta } from "@/lib/analytics/hint";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";
import type { ReactNode } from "react";

export interface AnalyticsTableRowLimitConfig {
  value: number;
  onChange: (n: number) => void;
}

interface AnalyticsDataTableProps {
  title: string;
  dataHint?: AnalyticsDataMeta | string;
  headers: string[];
  exportFilename: string;
  exportRows: Record<string, unknown>[];
  children: ReactNode;
  className?: string;
  tableRowLimit?: AnalyticsTableRowLimitConfig;
}

export function AnalyticsDataTable({
  title,
  dataHint,
  headers,
  exportFilename,
  exportRows,
  children,
  className,
  tableRowLimit,
}: AnalyticsDataTableProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <AnalyticsLabelWithHint
          as="h3"
          className="text-sm font-medium text-white"
          label={title}
          meta={dataHint}
        />
        <div className="flex shrink-0 items-center gap-2">
          {tableRowLimit && (
            <TableRowLimitSelect
              value={tableRowLimit.value}
              onChange={tableRowLimit.onChange}
            />
          )}
          <button
            type="button"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-hover hover:text-white"
            onClick={() => downloadCsv(exportFilename, headers, exportRows)}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
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
