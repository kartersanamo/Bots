/** Shared types for Discord live chat previews (tickets, DMs, etc.). */

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  author?: {
    name?: string;
    icon_url?: string;
  };
  fields?: { name?: string; value?: string; inline?: boolean }[];
  thumbnail?: { url?: string };
  image?: { url?: string };
  footer?: { text?: string; icon_url?: string };
  timestamp?: string;
}

export interface DiscordChatAuthor {
  id: string;
  username?: string;
  global_name?: string | null;
  avatar?: string | null;
  bot?: boolean;
}

export interface DiscordChatMessage {
  id: string;
  content: string;
  timestamp: string;
  author: DiscordChatAuthor;
  embeds?: DiscordEmbed[];
}

export interface DiscordResolvedMember {
  id: string;
  displayName: string;
  username: string;
  avatar: string | null;
  roles: string[];
  nick?: string | null;
  joinedAt?: string | null;
}

export interface GuildRoleLite {
  id: string;
  name: string;
  color: number;
  position: number;
  icon?: string | null;
  unicode_emoji?: string | null;
}
