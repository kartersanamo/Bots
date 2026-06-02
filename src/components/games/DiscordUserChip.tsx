"use client";

import { Avatar } from "@/components/ui/Avatar";
import { DiscordUserProfileCard } from "@/components/games/DiscordUserProfileCard";
import { useGamesDiscordUsers, useResolveDiscordUsers } from "@/components/games/GamesDiscordUsersProvider";
import { snowflakeString } from "@/lib/games/snowflake";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface DiscordUserChipProps {
  userId: string;
  className?: string;
  showId?: boolean;
  onClick?: () => void;
}

export function DiscordUserChip({
  userId,
  className,
  showId = false,
  onClick,
}: DiscordUserChipProps) {
  const [openProfile, setOpenProfile] = useState(false);
  const id = snowflakeString(userId);
  useResolveDiscordUsers([id]);
  const { users } = useGamesDiscordUsers();
  const user = id ? users[id] : undefined;

  const inner = (
    <>
      <Avatar
        userId={id}
        avatarHash={user?.avatar ?? null}
        size={24}
        className="shrink-0"
      />
      <span className="min-w-0 truncate">
        {user ? (
          <>
            <span className="text-white">{user.displayName}</span>
            {showId && (
              <span className="ml-1 font-mono text-xs text-muted">{id}</span>
            )}
          </>
        ) : (
          <span className="font-mono text-xs text-muted">{id}</span>
        )}
      </span>
    </>
  );

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
        {inner}
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
