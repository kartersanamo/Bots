"use client";

import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { GamesXpLogsExplorer } from "@/components/games/GamesXpLogsExplorer";
import { fetchDedup } from "@/lib/api/fetch-dedup";
import { can, type PermissionTier } from "@/lib/permissions";
import { BarChart3, Gamepad2, Users, Zap } from "lucide-react";
import { useEffect, useState } from "react";

type OverviewData = {
  overview: {
    activePlayers: number;
    everPlayed: number;
    openSessions: number;
    totalXpLogs: number;
  } | null;
  botStatus: { chatGamesRunning: boolean; dmGamesRunning: boolean } | null;
};

type OverviewFull = OverviewData & {
  xpSources?: string[];
  xpLogs?: unknown[];
  xpLogsTotal?: number;
};

export function GamesOverviewSection({
  userTier,
  initialOverview,
}: {
  userTier: PermissionTier;
  initialOverview?: OverviewFull | null;
}) {
  const [data, setData] = useState<OverviewFull | null>(initialOverview ?? null);

  useEffect(() => {
    if (initialOverview) return;
    fetchDedup<OverviewFull>("/api/games/overview-full").then((d) => setData(d));
  }, [initialOverview]);

  const o = data?.overview;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active this month"
          value={o?.activePlayers ?? "—"}
          icon={Users}
          loading={!data}
        />
        <StatCard
          label="Ever played"
          value={o?.everPlayed ?? "—"}
          icon={Gamepad2}
          loading={!data}
        />
        <StatCard
          label="Game sessions"
          value={o?.openSessions ?? "—"}
          icon={BarChart3}
          loading={!data}
        />
        <StatCard
          label="XP log rows"
          value={o?.totalXpLogs ?? "—"}
          icon={Zap}
          loading={!data}
        />
      </div>

      {data?.botStatus && can(userTier, "games.control") && (
        <Card className="flex flex-wrap gap-4 p-4">
          <div>
            <p className="text-xs text-muted">Chat games</p>
            <p className="text-sm font-medium text-white">
              {data.botStatus.chatGamesRunning ? "Running" : "Stopped"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">DM games</p>
            <p className="text-sm font-medium text-white">
              {data.botStatus.dmGamesRunning ? "Running" : "Stopped"}
            </p>
          </div>
        </Card>
      )}

      <GamesXpLogsExplorer
        title="Recent XP"
        description="Sort, filter, and paginate all XP log entries. Click a session ID to open details."
        userTier={userTier}
        defaultPageSize={50}
        initialSources={data?.xpSources}
        initialRows={data?.xpLogs as never}
        initialTotal={data?.xpLogsTotal}
        skipInitialMetaFetch={!!data?.xpSources}
      />
    </div>
  );
}
