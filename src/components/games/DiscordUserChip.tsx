"use client";

import { Avatar } from "@/components/ui/Avatar";
import { useGamesDiscordUsers, useResolveDiscordUsers } from "@/components/games/GamesDiscordUsersProvider";
import { snowflakeString } from "@/lib/games/snowflake";
import { cn } from "@/lib/utils";

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

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex max-w-full items-center gap-2 text-left text-sm hover:opacity-90",
          className
        )}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={cn("flex max-w-full items-center gap-2 text-sm", className)}>
      {inner}
    </div>
  );
}
