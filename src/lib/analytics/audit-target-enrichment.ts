import {
  applyResolvedAuditTargetLabel,
  describeAuditTargetSync,
  isDiscordSnowflake,
  type AuditTargetMeta,
} from "@/lib/analytics/audit-target-labels";
import type { NamedCount } from "@/lib/analytics/types";
import { fetchGuildChannels, isDiscordConfigured } from "@/lib/discord/api";
import {
  resolveDiscordUsers,
  type ResolvedDiscordUser,
} from "@/lib/discord/users.server";
import { isDbConfigured, query } from "@/lib/db/pool";

export interface EnrichedAuditTarget extends NamedCount {
  raw: string;
  category: string;
  detail: string;
}

export async function enrichAuditTargets(
  rows: NamedCount[]
): Promise<EnrichedAuditTarget[]> {
  const snowflakes = [
    ...new Set(rows.map((r) => r.name.trim()).filter(isDiscordSnowflake)),
  ];

  const ticketByChannel = new Map<
    string,
    { number: string; type: string; name: string }
  >();
  if (isDbConfigured() && snowflakes.length) {
    const placeholders = snowflakes.map(() => "?").join(",");
    const ticketRows = await query<{
      channelID: string;
      number: string;
      type: string;
      name: string;
    }>(
      `SELECT channel_id AS channelID, number, type, name FROM tickets
       WHERE channel_id IN (${placeholders})`,
      snowflakes
    ).catch(() => []);
    for (const row of ticketRows) {
      ticketByChannel.set(String(row.channelID), {
        number: String(row.number),
        type: String(row.type),
        name: String(row.name ?? ""),
      });
    }
  }

  const channelNameById = new Map<string, string>();
  if (isDiscordConfigured()) {
    const channels = await fetchGuildChannels().catch(() => []);
    for (const ch of channels) {
      channelNameById.set(ch.id, ch.name);
    }
  }

  const unresolvedUsers = snowflakes.filter(
    (id) => !ticketByChannel.has(id) && !channelNameById.has(id)
  );
  const users: Record<string, ResolvedDiscordUser> =
    unresolvedUsers.length > 0
      ? await resolveDiscordUsers(unresolvedUsers).catch(
          () => ({}) as Record<string, ResolvedDiscordUser>
        )
      : {};

  return rows.map((row) => {
    const base = describeAuditTargetSync(row.name);
    const resolved = applyResolvedAuditTargetLabel(base, {
      ticket: ticketByChannel.get(row.name),
      channelName: channelNameById.get(row.name),
      userDisplay: users[row.name]?.displayName,
    });
    return toEnriched(row.count, resolved);
  });
}

function toEnriched(count: number, meta: AuditTargetMeta): EnrichedAuditTarget {
  return {
    name: meta.label,
    count,
    raw: meta.raw,
    category: meta.category,
    detail: meta.detail,
  };
}
