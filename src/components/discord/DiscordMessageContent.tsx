"use client";

import type { DiscordResolvedMember } from "@/lib/discord/chat-types";
import { renderDiscordMarkdown } from "@/lib/discord/markdown";
import { useMemo } from "react";

export function DiscordMessageContent({
  content,
  memberProfiles,
  onUserMentionClick,
}: {
  content: string;
  memberProfiles: Record<string, DiscordResolvedMember>;
  onUserMentionClick: (userId: string) => void;
}) {
  const html = useMemo(
    () => renderDiscordMarkdown(content, memberProfiles),
    [content, memberProfiles]
  );
  if (!html) return null;
  return (
    <div
      className="mt-1 break-words text-sm text-white/90"
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={(e) => {
        const target = e.target as HTMLElement | null;
        const el = target?.closest?.("[data-user-id]") as HTMLElement | null;
        const userId = el?.getAttribute("data-user-id");
        if (userId) {
          e.preventDefault();
          onUserMentionClick(userId);
        }
      }}
    />
  );
}
