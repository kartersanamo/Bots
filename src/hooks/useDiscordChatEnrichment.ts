"use client";

import { dashboardFetch } from "@/lib/api/dashboard-fetch";
import { fetchGuildRolesClient } from "@/lib/api/guild-info-fetch";
import type {
  DiscordChatMessage,
  DiscordResolvedMember,
  GuildRoleLite,
} from "@/lib/discord/chat-types";
import {
  extractMentionUserIds,
  extractMentionUserIdsFromEmbeds,
} from "@/lib/discord/markdown";
import { useEffect, useMemo, useState } from "react";

export function useDiscordChatEnrichment(messages: DiscordChatMessage[]) {
  const [guildRoles, setGuildRoles] = useState<GuildRoleLite[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<
    Record<string, DiscordResolvedMember>
  >({});
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(
    null
  );

  const roleById = useMemo(
    () => new Map(guildRoles.map((r) => [r.id, r])),
    [guildRoles]
  );

  async function loadGuildRoles() {
    const roles = await fetchGuildRolesClient();
    if (!roles.length) return;
    setGuildRoles(
      roles.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        color: Number(r.color ?? 0),
        position: Number(r.position ?? 0),
        icon: r.icon ?? null,
        unicode_emoji: r.unicode_emoji ?? null,
      }))
    );
  }

  async function loadAuthorProfiles(userIds: string[]) {
    const ids = userIds.filter((id) => !memberProfiles[id]);
    if (!ids.length) return;
    const res = await dashboardFetch(
      `/api/discord/users?ids=${encodeURIComponent(ids.join(","))}`
    );
    const payload = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) return;
    if (!res.ok || !payload.users || typeof payload.users !== "object") return;
    const mapped = payload.users as Record<string, DiscordResolvedMember>;
    setMemberProfiles((prev) => ({ ...prev, ...mapped }));
  }

  useEffect(() => {
    void loadGuildRoles();
  }, []);

  useEffect(() => {
    const authorIds = Array.from(
      new Set(
        messages
          .flatMap((m) => [
            String(m.author?.id || ""),
            ...extractMentionUserIds(m.content || ""),
            ...extractMentionUserIdsFromEmbeds(m.embeds),
          ])
          .filter(Boolean)
      )
    );
    if (authorIds.length) void loadAuthorProfiles(authorIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  return {
    guildRoles,
    memberProfiles,
    roleById,
    selectedProfileUserId,
    setSelectedProfileUserId,
  };
}
