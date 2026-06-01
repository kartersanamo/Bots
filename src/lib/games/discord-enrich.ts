import {
  resolveDiscordUsers,
  type ResolvedDiscordUser,
} from "@/lib/discord/users";

/** Stable string Discord snowflake (avoids JSON number precision loss). */
export function snowflakeString(
  value: string | number | bigint | null | undefined
): string {
  if (value == null || value === "") return "";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return String(Math.trunc(value));
  }
  const s = String(value).trim();
  if (/e/i.test(s)) {
    try {
      return BigInt(s).toString();
    } catch {
      return s.split(".")[0] ?? s;
    }
  }
  return s;
}

export function collectSnowflakeIds(
  values: (string | number | bigint | null | undefined)[]
): string[] {
  return [
    ...new Set(
      values
        .map(snowflakeString)
        .filter((id) => /^\d{15,22}$/.test(id))
    ),
  ];
}

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
