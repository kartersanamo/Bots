"use client";

import { GuildRolesProvider } from "@/components/discord/GuildRolesProvider";
import { ViewerHighlightProvider } from "@/components/discord/ViewerHighlightProvider";
import { GamesDiscordUsersProvider } from "@/components/games/GamesDiscordUsersProvider";

/** Discord user resolution + guild role colors for dashboard pages. */
export function DashboardDiscordProviders({
  viewerId,
  viewerRoleIds = [],
  children,
}: {
  viewerId?: string;
  viewerRoleIds?: string[];
  children: React.ReactNode;
}) {
  const inner = (
    <GamesDiscordUsersProvider>
      <GuildRolesProvider>{children}</GuildRolesProvider>
    </GamesDiscordUsersProvider>
  );

  if (!viewerId) return inner;

  return (
    <ViewerHighlightProvider viewerId={viewerId} viewerRoleIds={viewerRoleIds}>
      {inner}
    </ViewerHighlightProvider>
  );
}
