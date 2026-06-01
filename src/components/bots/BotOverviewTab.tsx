"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { BotDefinition } from "@/lib/bots/registry";
import {
  formatBotUptime,
  useBotFleet,
  type BotProcessStatus,
} from "@/hooks/useBotFleet";
import { cn } from "@/lib/utils";
import { Play, RefreshCw, Square } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const STATUS_VARIANT: Record<
  BotProcessStatus,
  "success" | "danger" | "warning" | "default"
> = {
  online: "success",
  offline: "danger",
  starting: "warning",
  degraded: "warning",
  unknown: "default",
};

interface BotOverviewTabProps {
  bot: BotDefinition;
  canRestart: boolean;
}

export function BotOverviewTab({ bot, canRestart }: BotOverviewTabProps) {
  const { bots, loading, actionLoading, refresh, runAction } = useBotFleet(10000);
  const row = bots.find((b) => b.id === bot.id);
  const status = row?.status ?? "unknown";
  const [logPreview, setLogPreview] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/bots/${bot.id}/logs?lines=8`)
      .then((r) => r.json())
      .then((d) => setLogPreview((d.lines || []).slice(-8)))
      .catch(() => setLogPreview([]));
  }, [bot.id, status]);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Process status</p>
            <div className="mt-2 flex items-center gap-3">
              <Badge variant={STATUS_VARIANT[status]} className="text-sm">
                {status}
              </Badge>
              <span className="text-sm text-muted">
                Uptime {formatBotUptime(row?.uptimeSeconds)}
                {row?.pid ? ` · PID ${row.pid}` : ""}
              </span>
            </div>
          </div>
          {canRestart && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={!!actionLoading || status === "online"}
                onClick={() => runAction(bot.id, "start")}
              >
                <Play className="h-4 w-4" />
                Start
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!!actionLoading || status === "offline"}
                onClick={() => runAction(bot.id, "stop")}
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={!!actionLoading}
                onClick={() => runAction(bot.id, "restart")}
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4",
                    actionLoading === `${bot.id}-restart` && "animate-spin"
                  )}
                />
                Restart
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={refresh}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-white">Recent log lines</h3>
          <Link
            href={`/dashboard/bots/${bot.id}?tab=console`}
            className="text-sm text-accent-light hover:underline"
          >
            Open console
          </Link>
        </div>
        <pre className="max-h-40 overflow-auto rounded-lg bg-background p-3 font-mono text-xs text-green-300/90">
          {logPreview.length
            ? logPreview.join("\n")
            : "No logs available (bot offline or no log file)."}
        </pre>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { tab: "console", label: "Console" },
          { tab: "config", label: "Config" },
          { tab: "inbox", label: "DM inbox" },
          { tab: "actions", label: "Actions" },
        ].map((link) => (
          <Link
            key={link.tab}
            href={`/dashboard/bots/${bot.id}?tab=${link.tab}`}
            className="glass rounded-xl px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-accent/10"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
