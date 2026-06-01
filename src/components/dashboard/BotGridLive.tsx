"use client";

import type { BotDefinition } from "@/lib/bots/registry";
import { BotCard } from "./BotCard";
import { useEffect, useState } from "react";

export function BotGridLive({ bots }: { bots: BotDefinition[] }) {
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/bots")
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, string> = {};
        for (const b of d.bots || []) {
          map[b.id] = b.status;
        }
        setStatuses(map);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {bots.map((bot) => (
        <BotCard
          key={bot.id}
          bot={bot}
          status={
            (statuses[bot.id] as
              | "online"
              | "offline"
              | "starting"
              | "degraded"
              | "unknown") || "unknown"
          }
        />
      ))}
    </div>
  );
}
