"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { BotDefinition } from "@/lib/bots/registry";
import type { BotFleetRow, BotProcessStatus } from "@/hooks/useBotFleet";
import { formatBotUptime } from "@/hooks/useBotFleet";
import { cn } from "@/lib/utils";
import {
  Bot,
  Crown,
  Gamepad2,
  Play,
  RefreshCw,
  Shield,
  Square,
  Ticket,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import type { ElementType } from "react";

const ICON_MAP: Record<string, ElementType> = {
  Gamepad2,
  Ticket,
  Shield,
  Wrench,
  Users,
  Crown,
};

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

interface BotFleetCardProps {
  bot: BotDefinition;
  row?: BotFleetRow;
  canRestart: boolean;
  actionLoading: string | null;
  onAction: (botId: string, action: "start" | "stop" | "restart") => void;
}

export function BotFleetCard({
  bot,
  row,
  canRestart,
  actionLoading,
  onAction,
}: BotFleetCardProps) {
  const Icon = ICON_MAP[bot.icon] || Bot;
  const status = row?.status ?? "unknown";

  return (
    <Card className="flex h-full flex-col p-4">
      <Link href={`/dashboard/bots/${bot.id}`} className="block">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted" style={{ color: bot.accentColor }} />
            <span className="font-medium text-white">{bot.shortName}</span>
          </div>
          <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted">
          {formatBotUptime(row?.uptimeSeconds)}
          {row?.pid ? ` · ${row.pid}` : ""}
        </p>
      </Link>

      <div className="mt-3 flex gap-2 text-xs">
        <Link
          href={`/dashboard/bots/${bot.id}?tab=console`}
          className="text-muted hover:text-white"
        >
          Console
        </Link>
        <Link
          href={`/dashboard/bots/${bot.id}?tab=config`}
          className="text-muted hover:text-white"
        >
          Config
        </Link>
        <Link
          href={`/dashboard/bots/${bot.id}?tab=inbox`}
          className="text-muted hover:text-white"
        >
          DMs
        </Link>
      </div>

      {canRestart && (
        <div className="mt-3 flex gap-1 border-t border-border pt-3">
          <Button
            size="sm"
            variant="secondary"
            disabled={!!actionLoading || status === "online"}
            onClick={() => onAction(bot.id, "start")}
          >
            <Play className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!!actionLoading || status === "offline"}
            onClick={() => onAction(bot.id, "stop")}
          >
            <Square className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!!actionLoading}
            onClick={() => onAction(bot.id, "restart")}
          >
            <RefreshCw
              className={cn(
                "h-3 w-3",
                actionLoading === `${bot.id}-restart` && "animate-spin"
              )}
            />
          </Button>
        </div>
      )}
    </Card>
  );
}
