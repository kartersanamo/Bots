export interface ResolvedDiscordUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  nick: string | null;
  roles: string[];
  joinedAt: string | null;
}
