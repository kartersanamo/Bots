"use client";

import type { TicketStats } from "@/lib/tickets/types";
import { Badge } from "@/components/ui/Badge";

interface TicketStatsBarProps {
  stats: TicketStats | null;
  loading: boolean;
}

export function TicketStatsBar({ stats, loading }: TicketStatsBarProps) {
  if (loading && !stats) {
    return (
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 w-24 animate-pulse rounded-lg bg-surface-hover"
          />
        ))}
      </div>
    );
  }
  if (!stats) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="success">{stats.openCount} open</Badge>
      <Badge variant="default">{stats.closedCount} closed</Badge>
      <Badge variant="info">{stats.openedToday} opened today</Badge>
      {stats.byType.slice(0, 4).map((t) => (
        <Badge key={t.type} variant="default" className="text-xs">
          {t.type}: {t.count}
        </Badge>
      ))}
    </div>
  );
}
