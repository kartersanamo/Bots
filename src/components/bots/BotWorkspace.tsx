"use client";

import { BotActionsTab } from "@/components/bots/BotActionsTab";
import { BotInfoTab } from "@/components/bots/BotInfoTab";
import { BotOverviewTab } from "@/components/bots/BotOverviewTab";
import { BOT_TABS, parseBotTab, type BotTab } from "@/components/bots/bot-tabs";
import { ConfigEditor } from "@/components/fleet/ConfigEditor";
import { DmInbox } from "@/components/fleet/DmInbox";
import { LogViewer } from "@/components/fleet/LogViewer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { BotDefinition } from "@/lib/bots/registry";
import {
  formatBotUptime,
  useBotFleet,
  type BotProcessStatus,
} from "@/hooks/useBotFleet";
import { can, type PermissionTier } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {
  Bot,
  Crown,
  Gamepad2,
  ChevronLeft,
  Play,
  RefreshCw,
  Shield,
  Square,
  Ticket,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ElementType } from "react";
import { useMemo } from "react";

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

interface BotWorkspaceProps {
  bot: BotDefinition;
  userTier: PermissionTier;
  canRestart: boolean;
  canEditConfig: boolean;
  canSendDm: boolean;
}

export function BotWorkspace({
  bot,
  userTier,
  canRestart,
  canEditConfig,
  canSendDm,
}: BotWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseBotTab(searchParams.get("tab"));
  const fleet = useBotFleet(30_000);
  const { bots, actionLoading, runAction } = fleet;
  const row = bots.find((b) => b.id === bot.id);
  const status = row?.status ?? "unknown";
  const Icon = ICON_MAP[bot.icon] || Bot;

  const visibleTabs = useMemo(
    () =>
      BOT_TABS.filter(
        (t) => !t.permission || can(userTier, t.permission)
      ),
    [userTier]
  );

  const activeTab: BotTab = visibleTabs.some((t) => t.id === tab)
    ? tab
    : visibleTabs[0]?.id ?? "overview";

  function setTab(next: BotTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.push(`/dashboard/bots/${bot.id}${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <Link
          href="/dashboard/bots"
          className="flex items-center gap-1 text-sm text-muted hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          All bots
        </Link>
      </div>

      <div className="sticky top-0 z-10 border-b border-border bg-background pb-0">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5" style={{ color: bot.accentColor }} />
            <div>
              <h1 className="text-lg font-semibold text-white">{bot.shortName}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
                <span>{formatBotUptime(row?.uptimeSeconds)}</span>
                {row?.pid ? <span>PID {row.pid}</span> : null}
              </div>
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
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!!actionLoading || status === "offline"}
                onClick={() => runAction(bot.id, "stop")}
              >
                <Square className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={!!actionLoading}
                onClick={() => runAction(bot.id, "restart")}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <nav className="flex gap-4">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "border-b-2 pb-2 text-sm transition-colors",
                activeTab === t.id
                  ? "border-accent text-white"
                  : "border-transparent text-muted hover:text-white"
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" && (
        <BotOverviewTab bot={bot} canRestart={canRestart} fleet={fleet} />
      )}
      {activeTab === "console" && can(userTier, "logs.view") && (
        <LogViewer botId={bot.id} />
      )}
      {activeTab === "config" && can(userTier, "config.view") && (
        <ConfigEditor botId={bot.id} canEdit={canEditConfig} />
      )}
      {activeTab === "inbox" && can(userTier, "dm.view") && (
        <DmInbox botId={bot.id} canSend={canSendDm} />
      )}
      {activeTab === "actions" && can(userTier, "bot.panels") && (
        <BotActionsTab bot={bot} />
      )}
      {activeTab === "info" && <BotInfoTab bot={bot} />}
    </div>
  );
}
