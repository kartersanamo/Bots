"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getAllBots } from "@/lib/bots/registry";
import { cn } from "@/lib/utils";
import { Play, RefreshCw, Square } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type BotStatus = "online" | "offline" | "starting" | "degraded" | "unknown";

interface BotRow {
  id: string;
  name: string;
  shortName: string;
  accentColor: string;
  status: BotStatus;
  pid?: number | null;
  uptimeSeconds?: number | null;
}

const STATUS_VARIANT: Record<
  BotStatus,
  "success" | "danger" | "warning" | "default"
> = {
  online: "success",
  offline: "danger",
  starting: "warning",
  degraded: "warning",
  unknown: "default",
};

function formatUptime(seconds: number | null | undefined) {
  if (!seconds || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function FleetControl({ canRestart, canRestartAll }: { canRestart: boolean; canRestartAll: boolean }) {
  const [bots, setBots] = useState<BotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/bots");
      if (!res.ok) return;
      const data = await res.json();
      setBots(
        data.bots.map((b: BotRow & { status: BotStatus }) => ({
          id: b.id,
          name: b.name,
          shortName: b.shortName,
          accentColor: b.accentColor,
          status: b.status,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  async function runAction(botId: string, action: "start" | "stop" | "restart") {
    setActionLoading(`${botId}-${action}`);
    try {
      await fetch(`/api/bots/${botId}/${action}`, { method: "POST" });
      await refresh();
    } finally {
      setActionLoading(null);
    }
  }

  async function restartAll() {
    if (!window.confirm("Restart ALL bots? You will be asked to type RESTART_ALL.")) return;
    const typed = window.prompt("Type RESTART_ALL to confirm");
    if (typed !== "RESTART_ALL") return;
    setActionLoading("all");
    try {
      await fetch("/api/fleet/restart-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESTART_ALL" }),
      });
      await refresh();
    } finally {
      setActionLoading(null);
    }
  }

  const registry = getAllBots();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-muted">Refreshes every 15s.</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          {canRestartAll && (
            <Button
              variant="danger"
              size="sm"
              onClick={restartAll}
              disabled={!!actionLoading}
            >
              Restart All
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {registry.map((bot) => {
          const row = bots.find((b) => b.id === bot.id);
          const status = row?.status ?? "unknown";
          return (
            <Card key={bot.id} className="h-full">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-white">{bot.shortName}</h3>
                    <p className="text-xs text-muted">{bot.name}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
                </div>
                <p className="mt-3 text-xs text-muted">
                  Uptime: {formatUptime(row?.uptimeSeconds)}
                  {row?.pid ? ` · PID ${row.pid}` : ""}
                </p>
                {canRestart && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!!actionLoading || status === "online"}
                      onClick={() => runAction(bot.id, "start")}
                    >
                      <Play className="h-3 w-3" />
                      Start
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!!actionLoading || status === "offline"}
                      onClick={() => runAction(bot.id, "stop")}
                    >
                      <Square className="h-3 w-3" />
                      Stop
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={!!actionLoading}
                      onClick={() => runAction(bot.id, "restart")}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Restart
                    </Button>
                  </div>
                )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
