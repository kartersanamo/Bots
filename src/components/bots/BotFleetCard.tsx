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
  ScrollText,
  Shield,
  Square,
  Ticket,
  Users,
  Wrench,
  FileJson,
  Inbox,
  ChevronRight,
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
    <Card className="flex h-full flex-col">
      <Link
        href={`/dashboard/bots/${bot.id}`}
        className="group flex flex-1 flex-col"
      >
        <div className="flex items-start justify-between gap-2">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
            style={{ backgroundColor: `${bot.accentColor}20` }}
          >
            <Icon className="h-6 w-6" style={{ color: bot.accentColor }} />
          </div>
          <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-white group-hover:text-accent-light">
          {bot.shortName}
        </h3>
        <p className="text-xs text-muted">{bot.name}</p>
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">
          {bot.description}
        </p>
        <p className="mt-2 text-xs text-muted">
          Uptime {formatBotUptime(row?.uptimeSeconds)}
          {row?.pid ? ` · PID ${row.pid}` : ""}
        </p>
        <span className="mt-2 flex items-center gap-1 text-sm text-accent-light opacity-0 transition-opacity group-hover:opacity-100">
          Open workspace
          <ChevronRight className="h-4 w-4" />
        </span>
      </Link>

      <div className="mt-3 flex flex-wrap gap-1 border-t border-border pt-3">
        <Link
          href={`/dashboard/bots/${bot.id}?tab=console`}
          className="rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-hover hover:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <ScrollText className="mr-1 inline h-3 w-3" />
          Console
        </Link>
        <Link
          href={`/dashboard/bots/${bot.id}?tab=config`}
          className="rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-hover hover:text-white"
        >
          <FileJson className="mr-1 inline h-3 w-3" />
          Config
        </Link>
        <Link
          href={`/dashboard/bots/${bot.id}?tab=inbox`}
          className="rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-hover hover:text-white"
        >
          <Inbox className="mr-1 inline h-3 w-3" />
          DMs
        </Link>
      </div>

      {canRestart && (
        <div className="mt-3 flex flex-wrap gap-2">
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
