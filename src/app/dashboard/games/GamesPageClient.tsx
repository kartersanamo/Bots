"use client";

import { Header } from "@/components/layout/Header";
import { BotGamesTab } from "@/components/games/BotGamesTab";
import type { PermissionTier } from "@/lib/permissions";

type GamesOverviewFull = Awaited<
  ReturnType<typeof import("@/lib/data/games-overview").getGamesOverviewFullPayload>
>;

interface GamesPageClientProps {
  userTier: PermissionTier;
  initialOverview?: GamesOverviewFull | null;
}

export function GamesPageClient({
  userTier,
  initialOverview,
}: GamesPageClientProps) {
  return (
    <>
      <Header
        title="Games"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Games" },
        ]}
      />
      <BotGamesTab userTier={userTier} initialOverview={initialOverview} />
    </>
  );
}
