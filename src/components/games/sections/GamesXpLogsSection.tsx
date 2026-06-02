"use client";

import { GamesXpLogsExplorer } from "@/components/games/GamesXpLogsExplorer";
import type { PermissionTier } from "@/lib/permissions";

export function GamesXpLogsSection({ userTier }: { userTier: PermissionTier }) {
  return (
    <GamesXpLogsExplorer
      title="XP logs"
      description="Full history with sorting, filters, and export."
      userTier={userTier}
      defaultPageSize={50}
    />
  );
}
