import { rowsToCsv } from "@/lib/analytics/export";

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Record<string, unknown>[]
) {
  const csv = rowsToCsv(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
