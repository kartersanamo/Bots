"use client";

import { useCallback, useEffect, useState } from "react";

export type BotProcessStatus =
  | "online"
  | "offline"
  | "starting"
  | "degraded"
  | "unknown";

export interface BotFleetRow {
  id: string;
  name: string;
  shortName: string;
  accentColor: string;
  status: BotProcessStatus;
  pid?: number | null;
  uptimeSeconds?: number | null;
}

export function formatBotUptime(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function useBotFleet(pollMs = 15000) {
  const [bots, setBots] = useState<BotFleetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [controlApiOk, setControlApiOk] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/bots");
      if (!res.ok) {
        setControlApiOk(false);
        return;
      }
      const data = await res.json();
      setControlApiOk(true);
      setBots(
        (data.bots || []).map(
          (b: BotFleetRow & { status: BotProcessStatus }) => ({
            id: b.id,
            name: b.name,
            shortName: b.shortName,
            accentColor: b.accentColor,
            status: b.status,
            pid: b.pid ?? null,
            uptimeSeconds: b.uptimeSeconds ?? null,
          })
        )
      );
    } catch {
      setControlApiOk(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (pollMs <= 0) return;
    const t = setInterval(refresh, pollMs);
    return () => clearInterval(t);
  }, [refresh, pollMs]);

  const runAction = useCallback(
    async (botId: string, action: "start" | "stop" | "restart") => {
      setActionLoading(`${botId}-${action}`);
      try {
        await fetch(`/api/bots/${botId}/${action}`, { method: "POST" });
        await refresh();
      } finally {
        setActionLoading(null);
      }
    },
    [refresh]
  );

  const restartAll = useCallback(async () => {
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
  }, [refresh]);

  const counts = {
    online: bots.filter((b) => b.status === "online").length,
    offline: bots.filter((b) => b.status === "offline").length,
    other: bots.filter(
      (b) => !["online", "offline"].includes(b.status)
    ).length,
  };

  return {
    bots,
    loading,
    controlApiOk,
    actionLoading,
    refresh,
    runAction,
    restartAll,
    counts,
  };
}
