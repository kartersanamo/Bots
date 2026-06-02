"use client";

import { Card } from "@/components/ui/Card";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { useResolveDiscordUsers } from "@/components/games/GamesDiscordUsersProvider";
import { GAMES_LEADERBOARD_CATALOG } from "@/lib/games/types";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Entry = { userId: string; value: number; rank: number; extra?: string };

const SKELETON_ROWS = 12;

export function GamesAllTimeSection() {
  const [type, setType] = useState("all_time_xp");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Record<string, Entry[]>>({});
  const abortRef = useRef<AbortController | null>(null);

  const userIds = entries.map((e) => e.userId);
  useResolveDiscordUsers(userIds);

  const load = useCallback(async (leaderboardType: string) => {
    const cached = cacheRef.current[leaderboardType];
    if (cached) {
      setEntries(cached);
      setLoading(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);
    setEntries([]);

    try {
      const res = await fetch(
        `/api/games/leaderboard/all-time?type=${encodeURIComponent(leaderboardType)}&limit=100`,
        { signal: ac.signal }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load leaderboard");
      }
      const next = (data.entries || []) as Entry[];
      cacheRef.current[leaderboardType] = next;
      setEntries(next);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load");
      setEntries([]);
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(type);
    return () => abortRef.current?.abort();
  }, [type, load]);

  const typeLabel =
    GAMES_LEADERBOARD_CATALOG.find((t) => t.id === type)?.label ?? type;
  const showSkeleton = loading && entries.length === 0;
  const showOverlay = loading && entries.length > 0;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
        >
          {GAMES_LEADERBOARD_CATALOG.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        {loading && (
          <span className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-accent-light" />
            Loading {typeLabel}…
          </span>
        )}
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-400">{error}</p>
      )}

      <div className="relative overflow-x-auto">
        {showOverlay && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/70 backdrop-blur-[1px]"
            aria-busy="true"
            aria-label="Loading leaderboard"
          >
            <Loader2 className="h-8 w-8 animate-spin text-accent-light" />
          </div>
        )}

        <table
          className={cn(
            "w-full text-sm transition-opacity",
            showOverlay && "opacity-50"
          )}
        >
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-2 pr-4">Rank</th>
              <th className="pb-2 pr-4">User</th>
              <th className="pb-2">Value</th>
            </tr>
          </thead>
          <tbody>
            {showSkeleton &&
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-border/50">
                  <td className="py-2.5 pr-4">
                    <div className="h-4 w-6 animate-pulse rounded bg-surface-hover" />
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-surface-hover" />
                      <div className="h-4 w-28 animate-pulse rounded bg-surface-hover" />
                    </div>
                  </td>
                  <td className="py-2.5">
                    <div className="h-4 w-14 animate-pulse rounded bg-surface-hover" />
                  </td>
                </tr>
              ))}

            {!showSkeleton &&
              entries.map((e) => (
                <tr key={e.userId} className="border-b border-border/50">
                  <td className="py-2 pr-4 text-muted">{e.rank}</td>
                  <td className="py-2 pr-4">
                    <DiscordUserChip userId={e.userId} />
                  </td>
                  <td className="py-2 tabular-nums">
                    {e.value.toLocaleString()}
                    {e.extra ? (
                      <span className="ml-1 text-xs text-muted">{e.extra}</span>
                    ) : null}
                  </td>
                </tr>
              ))}

            {!loading && !error && entries.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-muted">
                  No entries for this leaderboard.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
