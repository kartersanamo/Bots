"use client";

import { GuildRolesProvider } from "@/components/discord/GuildRolesProvider";
import { GamesDiscordUsersProvider } from "@/components/games/GamesDiscordUsersProvider";

/** Discord user resolution + guild role colors for dashboard pages. */
export function DashboardDiscordProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GamesDiscordUsersProvider>
      <GuildRolesProvider>{children}</GuildRolesProvider>
    </GamesDiscordUsersProvider>
  );
}
