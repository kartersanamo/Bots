"use client";

import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { can, type PermissionTier } from "@/lib/permissions";
import { BarChart3, Gamepad2, Users, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export function GamesOverviewSection({ userTier }: { userTier: PermissionTier }) {
  const [data, setData] = useState<{
    overview: {
      activePlayers: number;
      everPlayed: number;
      openSessions: number;
      totalXpLogs: number;
    } | null;
    recentLogs: { user_id: string; xp: number; source: string | null }[];
    botStatus: { chatGamesRunning: boolean; dmGamesRunning: boolean } | null;
  } | null>(null);

  useEffect(() => {
    fetch("/api/games/overview")
      .then((r) => r.json())
      .then(setData);
  }, []);

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

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Recent XP</h3>
        {!data?.recentLogs?.length ? (
          <p className="text-sm text-muted">No recent logs.</p>
        ) : (
          <div className="space-y-1">
            {data.recentLogs.map((log, i) => (
              <div
                key={i}
                className="flex justify-between text-sm text-muted"
              >
                <span className="font-mono text-xs">{log.user_id}</span>
                <span>
                  +{log.xp} {log.source || ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
