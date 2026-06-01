"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { BotDefinition } from "@/lib/bots/registry";
import {
  Bot,
  Crown,
  Gamepad2,
  Shield,
  Ticket,
  Users,
  Wrench,
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

interface BotCardProps {
  bot: BotDefinition;
  status?: "online" | "offline" | "starting" | "degraded" | "unknown";
}

export function BotCard({ bot, status = "unknown" }: BotCardProps) {
  const Icon = ICON_MAP[bot.icon] || Bot;

  return (
    <Link href={`/dashboard/bots/${bot.id}`}>
      <Card hover className="h-full">
        <div className="flex items-start justify-between">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${bot.accentColor}20` }}
          >
            <Icon className="h-5 w-5" style={{ color: bot.accentColor }} />
          </div>
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
        <h3 className="mt-3 font-semibold text-white">{bot.shortName}</h3>
        <p className="mt-0.5 text-xs text-muted">{bot.name}</p>
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
