"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { BotDefinition } from "@/lib/bots/registry";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface BotCardProps {
  bot: BotDefinition;
  status?: "online" | "offline" | "starting" | "degraded" | "unknown";
}

export function BotCard({ bot, status = "unknown" }: BotCardProps) {
  return (
    <Link href={`/dashboard/bots/${bot.id}`}>
      <Card hover className="h-full">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-white">{bot.shortName}</h3>
          <Badge
            variant={
              status === "online"
                ? "success"
                : status === "offline"
                  ? "danger"
                  : status === "starting" || status === "degraded"
                    ? "warning"
                    : "default"
            }
          >
            {status}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted">{bot.name}</p>
        <div className="mt-3 flex items-center gap-1 text-xs text-muted">
          Open
          <ChevronRight className="h-3 w-3" />
        </div>
      </Card>
    </Link>
  );
}

interface BotGridProps {
  bots: BotDefinition[];
}

export function BotGrid({ bots }: BotGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {bots.map((bot) => (
        <BotCard key={bot.id} bot={bot} />
      ))}
    </div>
  );
}
