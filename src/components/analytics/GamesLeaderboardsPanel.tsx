"use client";

import { AnalyticsTable } from "@/components/analytics/AnalyticsDataTable";
import { AnalyticsLabelWithHint } from "@/components/analytics/AnalyticsHint";
import {
  TableRowLimitSelect,
  useAnalyticsTableRowLimit,
} from "@/components/analytics/table-row-limit";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { useResolveDiscordUsers } from "@/components/games/GamesDiscordUsersProvider";
import {
  GAMES_LEADERBOARD_CATALOG,
  type GamesLeaderboardCatalogItem,
  type GamesLeaderboardType,
  type LeaderboardEntry,
} from "@/lib/games/types";
import { cn, formatNumber } from "@/lib/utils";
import { downloadCsv } from "@/components/analytics/download";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";

function formatEntryValue(
  def: GamesLeaderboardCatalogItem,
  entry: LeaderboardEntry
): string {
  const base = formatNumber(entry.value);
  if (def.id === "monthly_level" && entry.extra) {
    return `Lv ${base} (${entry.extra})`;
  }
  if (def.id === "all_time_level" && entry.extra === "xp") {
    return `${base} XP`;
  }
  return base;
}

export function GamesLeaderboardsPanel({
  leaderboards,
}: {
  leaderboards: Partial<Record<GamesLeaderboardType, LeaderboardEntry[]>>;
}) {
  const visibleCatalog = useMemo(
    () =>
      GAMES_LEADERBOARD_CATALOG.filter((def) => {
        if (def.id === "counting_counts") {
          return (leaderboards[def.id]?.length ?? 0) > 0;
        }
        return true;
      }),
    [leaderboards]
  );

  const [activeId, setActiveId] = useState<GamesLeaderboardType>(
    visibleCatalog[0]?.id ?? "all_time_xp"
  );

  const activeDef =
    visibleCatalog.find((d) => d.id === activeId) ?? visibleCatalog[0];
  const entries = activeDef ? (leaderboards[activeDef.id] ?? []) : [];

  const userIds = useMemo(() => entries.map((e) => e.userId), [entries]);
  useResolveDiscordUsers(userIds);

  const { slice, tableRowLimit } = useAnalyticsTableRowLimit(10);
  const { value: rowLimit, onChange: setRowLimit } = tableRowLimit;
  const visibleEntries = slice(entries);

  if (!activeDef) return null;

  const periodNote =
    activeDef.period === "monthly"
      ? "Current monthly period (resets on /wipe-levels)."
      : activeDef.period === "live"
        ? "Live snapshot from daily_claims."
        : "All-time (never reset by monthly wipe).";

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <AnalyticsLabelWithHint
          as="h3"
          className="text-sm font-medium text-white"
          label="Games leaderboards"
          meta="games.leaderboards"
        />
        <p className="mt-1 text-xs text-muted">
          Same categories as the MinecadiaGames all-time leaderboard menu. Select
          a category to view the top players.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row">
        <nav
          className="max-h-[28rem] overflow-y-auto border-b border-border lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r"
          aria-label="Leaderboard categories"
        >
          {visibleCatalog.map((def) => {
            const count = leaderboards[def.id]?.length ?? 0;
            const selected = def.id === activeId;
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => setActiveId(def.id)}
                className={cn(
                  "flex w-full border-b border-border/50 px-4 py-3 text-left transition-colors last:border-b-0",
                  selected
                    ? "bg-accent/10"
                    : "hover:bg-surface-hover"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      selected ? "text-white" : "text-slate-200"
                    )}
                  >
                    {def.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted line-clamp-2">
                    {def.description}
                  </span>
                  {count > 0 && (
                    <span className="mt-1 block text-[10px] text-muted">
                      Top {count} loaded
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-white">
                {activeDef.label}
              </p>
              <p className="text-xs text-muted">{periodNote}</p>
            </div>
            <div className="flex items-center gap-2">
              <TableRowLimitSelect value={rowLimit} onChange={setRowLimit} />
              <button
                type="button"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-hover hover:text-white"
                onClick={() =>
                  downloadCsv(
                    `games-leaderboard-${activeDef.id}.csv`,
                    ["rank", "userId", "value"],
                    entries.map((e) => ({
                      rank: e.rank,
                      userId: e.userId,
                      value: e.value,
                    }))
                  )
                }
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              No entries for this leaderboard yet.
            </p>
          ) : (
            <AnalyticsTable>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Player</th>
                  <th className="px-2 py-2">{activeDef.valueLabel}</th>
                </tr>
              </thead>
              <tbody>
                {visibleEntries.map((e) => (
                  <tr key={e.userId} className="border-b border-border/50">
                    <td className="px-2 py-2 text-muted">{e.rank}</td>
                    <td className="px-2 py-2">
                      <DiscordUserChip userId={e.userId} />
                    </td>
                    <td className="px-2 py-2 font-medium tabular-nums text-white">
                      {formatEntryValue(activeDef, e)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </AnalyticsTable>
          )}
        </div>
      </div>
    </div>
  );
}
