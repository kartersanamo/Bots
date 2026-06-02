"use client";

import { Avatar } from "@/components/ui/Avatar";
import { useGuildRoles } from "@/components/discord/GuildRolesProvider";
import { useViewerHighlight } from "@/components/discord/ViewerHighlightProvider";
import { DiscordUserProfileCard } from "@/components/games/DiscordUserProfileCard";
import {
  GamesDiscordUsersStateContext,
  useResolveDiscordUsers,
} from "@/components/games/GamesDiscordUsersProvider";
import { roleColorHex, roleIconUrl } from "@/lib/discord/guild-roles";
import { snowflakeString } from "@/lib/games/snowflake";
import { cn } from "@/lib/utils";
import { memo, useContext, useState } from "react";

interface DiscordUserChipProps {
  userId: string;
  className?: string;
  showId?: boolean;
  onClick?: () => void;
  /** Smaller avatar + text for dense tables */
  compact?: boolean;
}

function DiscordUserChipInner({
  userId,
  className,
  showId = false,
  onClick,
  compact = false,
}: DiscordUserChipProps) {
  const [openProfile, setOpenProfile] = useState(false);
  const id = snowflakeString(userId);
  useResolveDiscordUsers([id]);
  const users = useContext(GamesDiscordUsersStateContext) ?? {};
  const { getTopRole } = useGuildRoles();
  const user = id ? users[id] : undefined;
  const topRole = user ? getTopRole(user.roles) : null;
  const nameColor = roleColorHex(topRole?.color);
  const iconUrl = topRole ? roleIconUrl(topRole) : null;
  const { isViewer, highlightStyle } = useViewerHighlight(id);
  const avatarSize = compact ? 20 : 24;

  const displayName = user?.displayName ?? id;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
          setOpenProfile(true);
        }}
        className={cn(
          "flex max-w-full items-center gap-2 text-left text-sm hover:opacity-90",
          className
        )}
      >
        <Avatar
          userId={id}
          avatarHash={user?.avatar ?? null}
          size={avatarSize}
          className="shrink-0"
        />
        <span className="min-w-0 truncate">
          {user ? (
            <span
              className={cn(
                "inline-flex max-w-full items-center gap-1 font-medium",
                isViewer && "box-decoration-clone px-0.5"
              )}
              style={{
                color: nameColor ?? "#ffffff",
                ...(isViewer ? highlightStyle : undefined),
              }}
            >
              {topRole?.unicode_emoji && (
                <span className="shrink-0">{topRole.unicode_emoji}</span>
              )}
              <span className="truncate">{displayName}</span>
              {iconUrl && (
                <img
                  src={iconUrl}
                  alt=""
                  loading="lazy"
                  className={cn("shrink-0 rounded", compact ? "h-3.5 w-3.5" : "h-4 w-4")}
                />
              )}
            </span>
          ) : (
            <span className="font-mono text-xs text-muted">{id}</span>
          )}
          {showId && user && (
            <span className="ml-1 font-mono text-xs text-muted">{id}</span>
          )}
        </span>
      </button>
      {openProfile && (
        <DiscordUserProfileCard
          user={
            user ?? {
              id,
              username: "unknown",
              displayName: id,
              avatar: null,
              nick: null,
              roles: [],
              joinedAt: null,
            }
          }
          onClose={() => setOpenProfile(false)}
        />
      )}
    </>
  );
}

export const DiscordUserChip = memo(DiscordUserChipInner);
