"use client";

import { GuildRolesProvider } from "@/components/discord/GuildRolesProvider";
import { ViewerHighlightProvider } from "@/components/discord/ViewerHighlightProvider";
import { GamesDiscordUsersProvider } from "@/components/games/GamesDiscordUsersProvider";
import { GamesPlayerDrawerProvider } from "@/components/games/GamesPlayerDrawerProvider";
import type { GuildRoleLite } from "@/lib/discord/guild-roles";
import type { PermissionTier } from "@/lib/permissions";

/** Discord user resolution + guild role colors for dashboard pages. */
export function DashboardDiscordProviders({
  viewerId,
  viewerRoleIds = [],
  userTier,
  initialRoles,
  children,
}: {
  viewerId?: string;
  viewerRoleIds?: string[];
  userTier: PermissionTier;
  initialRoles?: GuildRoleLite[];
  children: React.ReactNode;
}) {
  const inner = (
    <GamesDiscordUsersProvider>
      <GamesPlayerDrawerProvider userTier={userTier}>
        <GuildRolesProvider initialRoles={initialRoles}>
          {children}
        </GuildRolesProvider>
      </GamesPlayerDrawerProvider>
    </GamesDiscordUsersProvider>
  );

  if (!viewerId) return inner;

  return (
    <ViewerHighlightProvider viewerId={viewerId} viewerRoleIds={viewerRoleIds}>
      {inner}
    </ViewerHighlightProvider>
  );
}
