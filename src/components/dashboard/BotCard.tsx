"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { BotDefinition } from "@/lib/bots/registry";
import { motion } from "framer-motion";
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
  index: number;
  status?: "online" | "offline" | "starting" | "degraded" | "unknown";
}

export function BotCard({ bot, index, status = "unknown" }: BotCardProps) {
  const Icon = ICON_MAP[bot.icon] || Bot;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
    >
      <Link href={`/dashboard/bots/${bot.id}`}>
        <Card hover className="group h-full">
          <div className="flex items-start justify-between">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
              style={{ backgroundColor: `${bot.accentColor}20` }}
            >
              <Icon className="h-6 w-6" style={{ color: bot.accentColor }} />
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
          <h3 className="mt-4 text-lg font-semibold text-white">
            {bot.shortName}
          </h3>
          <p className="mt-1 text-xs text-muted">{bot.name}</p>
          <p className="mt-3 line-clamp-2 text-sm text-muted">
            {bot.description}
          </p>
          <div className="mt-4 flex items-center gap-1 text-sm text-accent-light opacity-0 transition-opacity group-hover:opacity-100">
            View details
            <ChevronRight className="h-4 w-4" />
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

interface BotGridProps {
  bots: BotDefinition[];
}

export function BotGrid({ bots }: BotGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {bots.map((bot, i) => (
        <BotCard key={bot.id} bot={bot} index={i} />
      ))}
    </div>
  );
}
