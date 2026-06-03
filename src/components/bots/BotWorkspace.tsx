"use client";

import { BotInfoTab } from "@/components/bots/BotInfoTab";
import { BotOverviewTab } from "@/components/bots/BotOverviewTab";
import { BOT_TABS, parseBotTab, type BotTab } from "@/components/bots/bot-tabs";
import { PanelFallback } from "@/components/ui/panel-fallback";
import { Badge } from "@/components/ui/Badge";
import dynamic from "next/dynamic";

const TmuxConsole = dynamic(
  () =>
    import("@/components/fleet/TmuxConsole").then((m) => ({
      default: m.TmuxConsole,
    })),
  { loading: () => <PanelFallback /> }
);
const BotLogFileViewer = dynamic(
  () =>
    import("@/components/fleet/BotLogFileViewer").then((m) => ({
      default: m.BotLogFileViewer,
    })),
  { loading: () => <PanelFallback /> }
);
const ConfigEditor = dynamic(
  () =>
    import("@/components/fleet/ConfigEditor").then((m) => ({
      default: m.ConfigEditor,
    })),
  { loading: () => <PanelFallback /> }
);
const DmInbox = dynamic(
  () =>
    import("@/components/fleet/DmInbox").then((m) => ({ default: m.DmInbox })),
  { loading: () => <PanelFallback /> }
);
const BotActionsTab = dynamic(
  () =>
    import("@/components/bots/BotActionsTab").then((m) => ({
      default: m.BotActionsTab,
    })),
  { loading: () => <PanelFallback /> }
);
import { Button } from "@/components/ui/Button";
import { ScrollableTabNav } from "@/components/ui/ScrollableTabNav";
import type { BotDefinition } from "@/lib/bots/registry";
import {
  formatBotUptime,
  useBotFleet,
  type BotProcessStatus,
} from "@/hooks/useBotFleet";
import { can, type PermissionTier } from "@/lib/permissions";
import {
  ChevronLeft,
  Play,
  RefreshCw,
  Square,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

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

  const visibleTabs = useMemo(
    () =>
      BOT_TABS.filter((t) => !t.permission || can(userTier, t.permission)),
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

      <div className="sticky top-0 z-[30] -mx-4 border-b border-border bg-background px-4 pb-0 sm:-mx-5 sm:px-5 lg:mx-0 lg:px-0 lg:top-0 lg:z-10">
        <div className="flex flex-col gap-3 pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-white sm:text-xl">
              {bot.shortName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
              <span>{formatBotUptime(row?.uptimeSeconds)}</span>
              {row?.pid ? <span>PID {row.pid}</span> : null}
            </div>
          </div>
          {canRestart && (
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                className="min-w-11"
                variant="secondary"
                disabled={!!actionLoading || status === "online"}
                onClick={() => runAction(bot.id, "start")}
              >
                <Play className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="min-w-11"
                disabled={!!actionLoading || status === "offline"}
                onClick={() => runAction(bot.id, "stop")}
              >
                <Square className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="primary"
                className="min-w-11"
                disabled={!!actionLoading}
                onClick={() => runAction(bot.id, "restart")}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <ScrollableTabNav
          tabs={visibleTabs.map((t) => ({ id: t.id, label: t.label }))}
          activeId={activeTab}
          onSelect={setTab}
        />
      </div>

      {activeTab === "overview" && (
        <BotOverviewTab bot={bot} canRestart={canRestart} fleet={fleet} />
      )}
      {activeTab === "console" && can(userTier, "logs.view") && (
        <TmuxConsole botId={bot.id} />
      )}
      {activeTab === "logs" && can(userTier, "logs.view") && (
        <BotLogFileViewer botId={bot.id} />
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
