"use client";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getAllBots } from "@/lib/bots/registry";
import { useBotFleet } from "@/hooks/useBotFleet";
import { BotFleetCard } from "@/components/bots/BotFleetCard";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

interface BotsHubProps {
  canRestart: boolean;
  canRestartAll: boolean;
}

type StatusFilter = "all" | "online" | "offline";
type SortMode = "name" | "status";

export function BotsHub({ canRestart, canRestartAll }: BotsHubProps) {
  const registry = getAllBots();
  const {
    bots,
    loading,
    controlApiOk,
    actionLoading,
    refresh,
    runAction,
    restartAll,
    counts,
  } = useBotFleet(15000);

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortMode>("name");

  const merged = useMemo(() => {
    return registry.map((bot) => ({
      bot,
      row: bots.find((b) => b.id === bot.id),
    }));
  }, [registry, bots]);

  const filtered = useMemo(() => {
    let list = merged;
    if (filter === "online") {
      list = list.filter((x) => x.row?.status === "online");
    } else if (filter === "offline") {
      list = list.filter((x) => x.row?.status === "offline");
    }
    if (sort === "name") {
      list = [...list].sort((a, b) =>
        a.bot.shortName.localeCompare(b.bot.shortName)
      );
    } else {
      const order: Record<string, number> = {
        online: 0,
        starting: 1,
        degraded: 2,
        unknown: 3,
        offline: 4,
      };
      list = [...list].sort(
        (a, b) =>
          (order[a.row?.status ?? "unknown"] ?? 5) -
          (order[b.row?.status ?? "unknown"] ?? 5)
      );
    }
    return list;
  }, [merged, filter, sort]);

  async function handleRestartAll() {
    if (!window.confirm("Restart all bots? Type RESTART_ALL to confirm."))
      return;
    const typed = window.prompt("Type RESTART_ALL");
    if (typed !== "RESTART_ALL") return;
    await restartAll();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={counts.online > 0 ? "success" : "default"}>
            {counts.online} online
          </Badge>
          <Badge variant="default">{counts.offline} offline</Badge>
          {!controlApiOk && (
            <span className="text-xs text-amber-400">API offline</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          {canRestartAll && (
            <Button
              size="sm"
              variant="danger"
              onClick={handleRestartAll}
              disabled={!!actionLoading}
            >
              Restart all
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "online", "offline"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm capitalize transition-colors",
              filter === f
                ? "bg-surface-hover text-white"
                : "text-muted hover:text-white"
            )}
          >
            {f}
          </button>
        ))}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="ml-auto rounded-md border border-border bg-background px-2 py-1 text-sm text-white"
        >
          <option value="name">Name</option>
          <option value="status">Status</option>
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map(({ bot, row }) => (
          <BotFleetCard
            key={bot.id}
            bot={bot}
            row={row}
            canRestart={canRestart}
            actionLoading={actionLoading}
            onAction={runAction}
          />
        ))}
      </div>
    </div>
  );
}
