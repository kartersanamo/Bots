"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { GamesSessionDrawer } from "@/components/games/GamesSessionDrawer";
import {
  useMergeDiscordUsersFromApi,
  type DiscordUserProfile,
} from "@/components/games/GamesDiscordUsersProvider";
import { downloadCsv } from "@/components/analytics/download";
import type { PermissionTier } from "@/lib/permissions";
import type { SortDirection, XpLogsSortField } from "@/lib/games/xp-logs-query";
import { formatNumber, formatUnixTimestamp } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Download,
  RefreshCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type XpLogRow = {
  game_id: number;
  user_id: string;
  xp: number;
  channel_id: string | null;
  source: string | null;
  timestamp: string | null;
};

type DatePreset = "all" | "1h" | "24h" | "7d" | "30d";

const PAGE_SIZES = [25, 50, 100] as const;

const SORT_LABELS: Record<XpLogsSortField, string> = {
  timestamp: "Time",
  user_id: "User",
  xp: "XP",
  source: "Source",
  game_id: "Session",
};

interface FilterDraft {
  userId: string;
  gameId: string;
  source: string;
  sourceContains: string;
  minXp: string;
  maxXp: string;
  datePreset: DatePreset;
}

const EMPTY_FILTERS: FilterDraft = {
  userId: "",
  gameId: "",
  source: "",
  sourceContains: "",
  minXp: "",
  maxXp: "",
  datePreset: "all",
};

function presetToSince(preset: DatePreset): number | undefined {
  if (preset === "all") return undefined;
  const now = Math.floor(Date.now() / 1000);
  const sec: Record<Exclude<DatePreset, "all">, number> = {
    "1h": 3600,
    "24h": 86400,
    "7d": 7 * 86400,
    "30d": 30 * 86400,
  };
  return now - sec[preset];
}

function buildParams(opts: {
  page: number;
  pageSize: number;
  sortBy: XpLogsSortField;
  sortDir: SortDirection;
  filters: FilterDraft;
  exportAll?: boolean;
}): URLSearchParams {
  const params = new URLSearchParams({
    page: String(opts.page),
    limit: String(opts.pageSize),
    sortBy: opts.sortBy,
    sortDir: opts.sortDir,
  });
  const f = opts.filters;
  if (f.userId.trim()) params.set("userId", f.userId.trim());
  if (f.gameId.trim()) params.set("gameId", f.gameId.trim());
  if (f.source.trim()) params.set("source", f.source.trim());
  else if (f.sourceContains.trim())
    params.set("sourceContains", f.sourceContains.trim());
  if (f.minXp.trim()) params.set("minXp", f.minXp.trim());
  if (f.maxXp.trim()) params.set("maxXp", f.maxXp.trim());
  const since = presetToSince(f.datePreset);
  if (since != null) params.set("since", String(since));
  if (opts.exportAll) params.set("export", "1");
  return params;
}

function SortIcon({
  field,
  sortBy,
  sortDir,
}: {
  field: XpLogsSortField;
  sortBy: XpLogsSortField;
  sortDir: SortDirection;
}) {
  if (sortBy !== field) {
    return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 opacity-40" />;
  }
  return sortDir === "asc" ? (
    <ArrowUp className="ml-1 inline h-3.5 w-3.5 text-accent" />
  ) : (
    <ArrowDown className="ml-1 inline h-3.5 w-3.5 text-accent" />
  );
}

export function GamesXpLogsExplorer({
  title = "Recent XP",
  description,
  userTier,
  defaultPageSize = 50,
}: {
  title?: string;
  description?: string;
  userTier: PermissionTier;
  defaultPageSize?: (typeof PAGE_SIZES)[number];
}) {
  const [rows, setRows] = useState<XpLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortBy, setSortBy] = useState<XpLogsSortField>("timestamp");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [draft, setDraft] = useState<FilterDraft>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<FilterDraft>(EMPTY_FILTERS);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [pageInput, setPageInput] = useState("1");
  const [apiUsers, setApiUsers] = useState<Record<string, DiscordUserProfile>>(
    {}
  );
  useMergeDiscordUsersFromApi(apiUsers);

  useEffect(() => {
    fetch("/api/games/xp-logs?meta=sources")
      .then((r) => r.json())
      .then((d) => setSources(d.sources || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams({
        page,
        pageSize,
        sortBy,
        sortDir,
        filters: applied,
      });
      const res = await fetch(`/api/games/xp-logs?${params}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to load XP logs");
      setRows(d.rows || []);
      setTotal(d.total ?? 0);
      setPageCount(d.pageCount ?? 1);
      setApiUsers(d.users || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortDir, applied]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const handleSort = (field: XpLogsSortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(field === "source" || field === "user_id" ? "asc" : "desc");
    }
    setPage(1);
  };

  const applyFilters = () => {
    setApplied({ ...draft });
    setPage(1);
  };

  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  };

  const hasActiveFilters = useMemo(
    () =>
      applied.userId ||
      applied.gameId ||
      applied.source ||
      applied.sourceContains ||
      applied.minXp ||
      applied.maxXp ||
      applied.datePreset !== "all",
    [applied]
  );

  const exportRows = async (allMatching: boolean) => {
    setExporting(true);
    try {
      const params = buildParams({
        page: 1,
        pageSize: allMatching ? 5000 : pageSize,
        sortBy,
        sortDir,
        filters: applied,
        exportAll: allMatching,
      });
      const res = await fetch(`/api/games/xp-logs?${params}`);
      const d = await res.json();
      const exportData: XpLogRow[] = d.rows || [];
      downloadCsv(
        allMatching ? "xp-logs-filtered.csv" : `xp-logs-page-${page}.csv`,
        [
          "timestamp",
          "timestamp_formatted",
          "user_id",
          "xp",
          "source",
          "game_id",
          "channel_id",
        ],
        exportData.map((r) => ({
          timestamp: r.timestamp,
          timestamp_formatted: formatUnixTimestamp(r.timestamp),
          user_id: r.user_id,
          xp: r.xp,
          source: r.source ?? "",
          game_id: r.game_id,
          channel_id: r.channel_id ?? "",
        }))
      );
    } finally {
      setExporting(false);
    }
  };

  const copyRow = (r: XpLogRow) => {
    const line = [
      formatUnixTimestamp(r.timestamp),
      r.user_id,
      r.xp,
      r.source ?? "",
      r.game_id,
      r.channel_id ?? "",
    ].join("\t");
    void navigator.clipboard.writeText(line);
  };

  const goToPage = (p: number) => {
    const next = Math.min(pageCount, Math.max(1, p));
    setPage(next);
  };

  const xpSumOnPage = rows.reduce((s, r) => s + Number(r.xp || 0), 0);

  const thClass =
    "cursor-pointer select-none whitespace-nowrap pb-2 pr-3 text-left text-xs font-medium uppercase tracking-wide text-muted hover:text-white";

  return (
    <Card className="relative">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-muted">{description}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted">
            {loading ? "Loading…" : (
              <>
                {formatNumber(total)} matching rows
                {rows.length > 0 && (
                  <>
                    {" "}
                    · page {page} of {pageCount} ·{" "}
                    <span className="text-white/80">
                      +{formatNumber(xpSumOnPage)} XP on this page
                    </span>
                  </>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={loading}
            onClick={() => load()}
            title="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={exporting || !rows.length}
            onClick={() => exportRows(false)}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Page CSV
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={exporting || total === 0}
            onClick={() => exportRows(true)}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            All filtered
          </Button>
        </div>
      </div>

      <div className="mb-4 space-y-3 rounded-lg border border-border bg-background/40 p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            placeholder="User ID"
            value={draft.userId}
            onChange={(e) =>
              setDraft((d) => ({ ...d, userId: e.target.value }))
            }
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
          />
          <input
            placeholder="Session / game ID"
            value={draft.gameId}
            onChange={(e) =>
              setDraft((d) => ({ ...d, gameId: e.target.value }))
            }
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
          />
          <input
            list="xp-log-sources"
            placeholder="Source (exact)"
            value={draft.source}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                source: e.target.value,
                sourceContains: e.target.value ? "" : d.sourceContains,
              }))
            }
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
          />
          <datalist id="xp-log-sources">
            {sources.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <input
            placeholder="Source contains…"
            value={draft.sourceContains}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                sourceContains: e.target.value,
                source: e.target.value ? "" : d.source,
              }))
            }
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
          />
          <input
            placeholder="Min XP"
            type="number"
            value={draft.minXp}
            onChange={(e) =>
              setDraft((d) => ({ ...d, minXp: e.target.value }))
            }
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
          />
          <input
            placeholder="Max XP"
            type="number"
            value={draft.maxXp}
            onChange={(e) =>
              setDraft((d) => ({ ...d, maxXp: e.target.value }))
            }
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Time range</span>
          <div className="flex flex-wrap rounded-lg border border-border p-0.5">
            {(
              [
                ["all", "All time"],
                ["1h", "1h"],
                ["24h", "24h"],
                ["7d", "7d"],
                ["30d", "30d"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setDraft((d) => ({ ...d, datePreset: key }))
                }
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                  draft.datePreset === key
                    ? "bg-surface-hover text-white"
                    : "text-muted hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={applyFilters}>
            Apply filters
          </Button>
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              <X className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
          {hasActiveFilters && (
            <Badge variant="info" className="text-xs">
              Filtered
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-400">{error}</p>
      )}

      <div
        className={`overflow-x-auto ${loading ? "pointer-events-none opacity-60" : ""}`}
      >
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border">
              {(Object.keys(SORT_LABELS) as XpLogsSortField[]).map(
                (field) => (
                  <th
                    key={field}
                    className={thClass}
                    onClick={() => handleSort(field)}
                  >
                    {SORT_LABELS[field]}
                    <SortIcon
                      field={field}
                      sortBy={sortBy}
                      sortDir={sortDir}
                    />
                  </th>
                )
              )}
              <th className="pb-2 pr-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                Channel
              </th>
              <th className="pb-2 text-right text-xs font-medium uppercase tracking-wide text-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-8 text-center text-sm text-muted"
                >
                  No XP logs match your filters.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr
                  key={`${r.game_id}-${r.user_id}-${r.timestamp}-${i}`}
                  className="border-b border-border/50 hover:bg-surface-hover/30"
                >
                  <td className="whitespace-nowrap py-2 pr-3 text-xs text-muted">
                    {formatUnixTimestamp(r.timestamp)}
                  </td>
                  <td className="py-2 pr-3">
                    <DiscordUserChip userId={r.user_id} />
                  </td>
                  <td
                    className={`py-2 pr-3 font-mono tabular-nums ${
                      r.xp >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {r.xp >= 0 ? "+" : ""}
                    {formatNumber(r.xp)}
                  </td>
                  <td className="max-w-[200px] truncate py-2 pr-3 text-white/90">
                    {r.source || "—"}
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      className="font-mono text-xs text-accent hover:underline"
                      onClick={() => setSelectedGameId(r.game_id)}
                    >
                      #{r.game_id}
                    </button>
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-muted">
                    {r.channel_id || "—"}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      className="rounded p-1 text-muted hover:bg-surface-hover hover:text-white"
                      title="Copy row"
                      onClick={() => copyRow(r)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number]);
              setPage(1);
            }}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-white"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1 || loading}
            onClick={() => goToPage(1)}
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1 || loading}
            onClick={() => goToPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex items-center gap-1 px-2 text-sm text-muted">
            Page
            <input
              type="number"
              min={1}
              max={pageCount}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const n = parseInt(pageInput, 10);
                  if (Number.isFinite(n)) goToPage(n);
                }
              }}
              onBlur={() => {
                const n = parseInt(pageInput, 10);
                if (Number.isFinite(n)) goToPage(n);
                else setPageInput(String(page));
              }}
              className="w-14 rounded border border-border bg-background px-1.5 py-0.5 text-center text-sm text-white"
            />
            of {pageCount}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= pageCount || loading}
            onClick={() => goToPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= pageCount || loading}
            onClick={() => goToPage(pageCount)}
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedGameId != null && (
        <GamesSessionDrawer
          gameId={selectedGameId}
          userTier={userTier}
          onClose={() => setSelectedGameId(null)}
          onUpdated={load}
        />
      )}
    </Card>
  );
}
