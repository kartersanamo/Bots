"use client";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getAllBots } from "@/lib/bots/registry";
import { useBotFleet } from "@/hooks/useBotFleet";
import { BotFleetCard } from "@/components/bots/BotFleetCard";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
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
    if (
      !window.confirm(
        "Restart ALL bots? You will be asked to type RESTART_ALL."
      )
    )
      return;
    const typed = window.prompt("Type RESTART_ALL to confirm");
    if (typed !== "RESTART_ALL") return;
    await restartAll();
  }

  return (
    <div className="space-y-6">
      <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={counts.online > 0 ? "success" : "default"}>
            {counts.online} online
          </Badge>
          <Badge variant="danger">{counts.offline} offline</Badge>
          {counts.other > 0 && (
            <Badge variant="warning">{counts.other} other</Badge>
          )}
          {!controlApiOk && (
            <Badge variant="warning">Control API unreachable</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-surface-hover/50 p-1">
          {(["all", "online", "offline"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm capitalize transition-colors",
                filter === f
                  ? "bg-accent/25 text-accent-light"
                  : "text-muted hover:text-white"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-white"
        >
          <option value="name">Sort by name</option>
          <option value="status">Sort by status</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map(({ bot, row }, i) => (
          <motion.div
            key={bot.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <BotFleetCard
              bot={bot}
              row={row}
              canRestart={canRestart}
              actionLoading={actionLoading}
              onAction={runAction}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
