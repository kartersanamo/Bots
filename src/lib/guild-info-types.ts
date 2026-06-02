import type { GuildRoleLite } from "@/lib/discord/guild-roles";

export type GuildInfoPayload = {
  configured: boolean;
  guild: {
    id: string;
    name: string;
    icon: string | null;
    memberCount: number;
    approximatePresenceCount?: number;
    premiumTier: number;
  } | null;
  roles: GuildRoleLite[];
  channels: {
    id: string;
    name: string;
    type: number;
    parentId: string | null;
  }[];
};
