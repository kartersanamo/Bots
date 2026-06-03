"use client";

import { DiscordEmbedCard } from "@/components/discord/DiscordEmbedCard";
import { DiscordMessageContent } from "@/components/discord/DiscordMessageContent";
import { ViewerHighlightSpan } from "@/components/discord/ViewerHighlightProvider";
import { DiscordUserProfileCard } from "@/components/games/DiscordUserProfileCard";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type {
  DiscordChatMessage,
  DiscordResolvedMember,
  GuildRoleLite,
} from "@/lib/discord/chat-types";
import { roleColorHex, topRoleForMember } from "@/lib/discord/guild-roles";
import { formatRelativeTime } from "@/lib/utils";
import type { ReactNode } from "react";

function roleIconUrl(role: {
  id: string;
  icon?: string | null;
}): string | null {
  if (!role.icon) return null;
  return `https://cdn.discordapp.com/role-icons/${role.id}/${role.icon}.png?size=64`;
}

export function DiscordChatFeed({
  messages,
  memberProfiles,
  roleById,
  selectedProfileUserId,
  setSelectedProfileUserId,
  loading = false,
  emptyLabel = "No messages found.",
  canLoadOlder = false,
  onLoadOlder,
  loadOlderLoading = false,
  maxHeightClass = "max-h-[calc(100vh-220px)]",
  footer,
}: {
  messages: DiscordChatMessage[];
  memberProfiles: Record<string, DiscordResolvedMember>;
  roleById: Map<string, GuildRoleLite>;
  selectedProfileUserId: string | null;
  setSelectedProfileUserId: (id: string | null) => void;
  loading?: boolean;
  emptyLabel?: string;
  canLoadOlder?: boolean;
  onLoadOlder?: () => void;
  loadOlderLoading?: boolean;
  maxHeightClass?: string;
  footer?: ReactNode;
}) {

  return (
    <>
      <div className="rounded-xl border border-border bg-background p-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-md bg-surface-hover"
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">{emptyLabel}</p>
        ) : (
          <div className={`${maxHeightClass} space-y-3 overflow-y-auto pr-1`}>
            {canLoadOlder && onLoadOlder && (
              <div className="flex justify-center pb-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={loadOlderLoading}
                  onClick={onLoadOlder}
                >
                  Load older messages
                </Button>
              </div>
            )}
            {messages.map((m) => {
              const displayName =
                m.author.global_name || m.author.username || m.author.id;
              const authorProfile = memberProfiles[m.author.id];
              const topRole = topRoleForMember(authorProfile?.roles, roleById);
              const nameColor = roleColorHex(topRole?.color);
              const iconUrl = topRole ? roleIconUrl(topRole) : null;
              const body = m.content?.trim() || "";

              return (
                <div key={m.id} className="flex gap-3">
                  <Avatar
                    userId={m.author.id}
                    avatarHash={m.author.avatar ?? null}
                    size={32}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedProfileUserId(m.author.id)}
                        className="inline-flex items-center gap-1 rounded px-0.5 text-sm font-medium hover:bg-white/5"
                        style={{ color: nameColor ?? "#ffffff" }}
                      >
                        <ViewerHighlightSpan
                          userId={m.author.id}
                          className="inline-flex items-center gap-1"
                        >
                          {topRole?.unicode_emoji && (
                            <span>{topRole.unicode_emoji}</span>
                          )}
                          {displayName}
                          {iconUrl && (
                            <img
                              src={iconUrl}
                              alt="Role icon"
                              className="h-4 w-4 rounded"
                            />
                          )}
                        </ViewerHighlightSpan>
                      </button>
                      {m.author.bot && (
                        <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent-light">
                          BOT
                        </span>
                      )}
                      <span className="text-xs text-muted">
                        {formatRelativeTime(new Date(m.timestamp))}
                      </span>
                    </div>
                    {body ? (
                      <DiscordMessageContent
                        content={body}
                        memberProfiles={memberProfiles}
                        onUserMentionClick={(id) => setSelectedProfileUserId(id)}
                      />
                    ) : m.embeds?.length ? null : (
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-white/90">
                        (attachment/system)
                      </p>
                    )}
                    {m.embeds?.map((embed, i) => (
                      <DiscordEmbedCard
                        key={`${m.id}-embed-${i}`}
                        embed={embed}
                        memberProfiles={memberProfiles}
                        onUserMentionClick={(id) => setSelectedProfileUserId(id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {footer}
      </div>

      {selectedProfileUserId && (
        <DiscordUserProfileCard
          user={{
            id: selectedProfileUserId,
            username:
              memberProfiles[selectedProfileUserId]?.username ?? "unknown",
            displayName:
              memberProfiles[selectedProfileUserId]?.displayName ??
              memberProfiles[selectedProfileUserId]?.username ??
              selectedProfileUserId,
            avatar: memberProfiles[selectedProfileUserId]?.avatar ?? null,
            nick: memberProfiles[selectedProfileUserId]?.nick ?? null,
            roles: memberProfiles[selectedProfileUserId]?.roles ?? [],
            joinedAt: memberProfiles[selectedProfileUserId]?.joinedAt ?? null,
          }}
          onClose={() => setSelectedProfileUserId(null)}
        />
      )}
    </>
  );
}
