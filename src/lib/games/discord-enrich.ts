import {
  resolveDiscordUsers,
} from "@/lib/discord/users.server";
import type { ResolvedDiscordUser } from "@/lib/discord/users.types";
import { collectSnowflakeIds, snowflakeString } from "@/lib/games/snowflake";

export { snowflakeString, collectSnowflakeIds };

export async function discordUsersForIds(
  ids: (string | number | bigint | null | undefined)[]
): Promise<Record<string, ResolvedDiscordUser>> {
  const unique = collectSnowflakeIds(ids);
  if (!unique.length) return {};
  const users = await resolveDiscordUsers(unique);
  const out: Record<string, ResolvedDiscordUser> = {};
  for (const u of Object.values(users)) {
    out[String(u.id)] = u;
  }
  return out;
}
