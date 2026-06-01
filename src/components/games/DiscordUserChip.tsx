"use client";

import { Avatar } from "@/components/ui/Avatar";
import { useGamesDiscordUsers, useResolveDiscordUsers } from "@/components/games/GamesDiscordUsersProvider";
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
  useResolveDiscordUsers([userId]);
  const { users } = useGamesDiscordUsers();
  const user = users[userId];

  const inner = (
    <>
      <Avatar
        userId={userId}
        avatarHash={user?.avatar ?? null}
        size={24}
        className="shrink-0"
      />
      <span className="min-w-0 truncate">
        {user ? (
          <>
            <span className="text-white">{user.displayName}</span>
            {showId && (
              <span className="ml-1 font-mono text-xs text-muted">{userId}</span>
            )}
          </>
        ) : (
          <span className="font-mono text-xs text-muted">{userId}</span>
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
