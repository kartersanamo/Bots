"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GamesSessionDrawer } from "@/components/games/GamesSessionDrawer";
import { cn, formatUnixTimestamp } from "@/lib/utils";
import type { PermissionTier } from "@/lib/permissions";
import { useCallback, useEffect, useState } from "react";

type DmFilter = "all" | "chat" | "dm";

export function GamesSessionsSection({ userTier }: { userTier: PermissionTier }) {
  const [sessions, setSessions] = useState<
    {
      game_id: number;
      game_name: string;
      refreshed_at: string | null;
      dm_game: number | string | null;
      active?: boolean;
    }[]
  >([]);
  const [dmFilter, setDmFilter] = useState<DmFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: "80" });
    if (dmFilter !== "all") params.set("dm", dmFilter);
    if (search) params.set("search", search);
    fetch(`/api/games/sessions?${params}`)
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions || []));
  }, [dmFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            placeholder="Search game name or ID…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput.trim());
              }
            }}
            className="min-w-[200px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSearch(searchInput.trim())}
          >
            Search
          </Button>
          <div className="flex rounded-lg border border-border p-0.5">
            {(["all", "chat", "dm"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setDmFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs capitalize transition-colors ${
                  dmFilter === f
                    ? "bg-surface-hover text-white"
                    : "text-muted hover:text-white"
                }`}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="pb-2 pr-4">ID</th>
                <th className="pb-2 pr-4">Game</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2">Refreshed</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const isDm = s.dm_game === 1 || s.dm_game === "1";
                const isLive = !!s.active;
                return (
                  <tr
                    key={s.game_id}
                    className={cn(
                      "cursor-pointer border-b border-border/50 hover:bg-surface-hover",
                      isLive &&
                        "border-l-2 border-l-emerald-500/70 bg-emerald-500/[0.08] hover:bg-emerald-500/[0.12]"
                    )}
                    onClick={() => setSelectedId(s.game_id)}
                  >
                    <td
                      className={cn(
                        "py-2 pr-4 font-mono",
                        isLive && "text-emerald-200"
                      )}
                    >
                      {s.game_id}
                    </td>
                    <td
                      className={cn(
                        "py-2 pr-4",
                        isLive && "font-medium text-emerald-100"
                      )}
                    >
                      {s.game_name}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={isDm ? "info" : "default"}>
                          {isDm ? "DM" : "Chat"}
                        </Badge>
                        {isLive && (
                          <Badge variant="success">Live</Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2 text-xs text-muted">
                      {formatUnixTimestamp(s.refreshed_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!sessions.length && (
            <p className="py-6 text-center text-sm text-muted">No sessions found.</p>
          )}
        </div>
      </Card>

      {selectedId != null && (
        <GamesSessionDrawer
          gameId={selectedId}
          userTier={userTier}
          onClose={() => setSelectedId(null)}
          onUpdated={load}
        />
      )}
    </div>
  );
}
