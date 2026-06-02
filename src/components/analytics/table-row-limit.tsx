"use client";

import { useState } from "react";

export const TABLE_ROW_LIMIT_OPTIONS = [5, 8, 10, 15, 25, 50] as const;

export type TableRowLimit = (typeof TABLE_ROW_LIMIT_OPTIONS)[number];

function coerceRowLimit(n: number): TableRowLimit {
  return (TABLE_ROW_LIMIT_OPTIONS as readonly number[]).includes(n)
    ? (n as TableRowLimit)
    : 8;
}

export function useAnalyticsTableRowLimit(defaultLimit: number = 8) {
  const [limit, setLimit] = useState<TableRowLimit>(() =>
    coerceRowLimit(defaultLimit)
  );
  return {
    limit,
    setLimit,
    slice: <T,>(rows: T[]) => rows.slice(0, limit),
    tableRowLimit: {
      value: limit,
      onChange: (n: number) => setLimit(coerceRowLimit(n)),
    },
  };
}

interface TableRowLimitSelectProps {
  value: number;
  onChange: (n: number) => void;
}

export function TableRowLimitSelect({ value, onChange }: TableRowLimitSelectProps) {
  return (
    <label className="flex items-center gap-1 text-[10px] leading-none text-muted">
      <span>Rows</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded border border-border bg-background px-1 py-0.5 text-[10px] text-white"
        aria-label="Rows to display"
      >
        {TABLE_ROW_LIMIT_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}
