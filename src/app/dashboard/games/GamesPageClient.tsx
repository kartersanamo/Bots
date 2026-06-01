"use client";

import { Header } from "@/components/layout/Header";
import { BotGamesTab } from "@/components/games/BotGamesTab";
import { GamesDiscordUsersProvider } from "@/components/games/GamesDiscordUsersProvider";
import type { PermissionTier } from "@/lib/permissions";

interface GamesPageClientProps {
  userTier: PermissionTier;
}

export function GamesPageClient({ userTier }: GamesPageClientProps) {
  return (
    <>
      <Header
        title="Games"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Games" },
        ]}
      />
      <GamesDiscordUsersProvider>
        <BotGamesTab userTier={userTier} />
      </GamesDiscordUsersProvider>
    </>
  );
}
