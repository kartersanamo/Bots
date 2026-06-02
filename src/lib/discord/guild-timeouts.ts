import type { DiscordAuditEntry } from "@/lib/discord/audit";
import { fetchGuildAuditLogs } from "@/lib/discord/audit";
import { guildBanAvatarUrl } from "@/lib/discord/guild-bans";
import { env, envRequired } from "@/lib/env";

const DISCORD_API = "https://discord.com/api/v10";

function isDiscordConfigured(): boolean {
  return !!(env("DISCORD_BOT_TOKEN") && env("DISCORD_GUILD_ID"));
}

function botHeaders(): HeadersInit {
  return { Authorization: `Bot ${envRequired("DISCORD_BOT_TOKEN")}` };
}

interface GuildMemberPayload {
  user?: {
    id: string;
    username: string;
    global_name?: string | null;
    avatar?: string | null;
    discriminator?: string;
  };
  communication_disabled_until?: string | null;
}

export interface GuildTimeoutRow {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  timeoutUntil: string;
  timeoutUntilMs: number;
  reason: string | null;
  moderatedBy: string | null;
}

function isActiveTimeout(until: string | null | undefined, now = Date.now()): boolean {
  if (!until) return false;
  const ms = Date.parse(until);
  return Number.isFinite(ms) && ms > now;
}

function mapMemberRow(
  member: GuildMemberPayload,
  auditByUser: Map<string, { reason: string | null; moderatedBy: string | null }>
): GuildTimeoutRow | null {
  const user = member.user;
  const until = member.communication_disabled_until;
  if (!user?.id || !until || !isActiveTimeout(until)) return null;

  const audit = auditByUser.get(user.id);
  return {
    userId: user.id,
    username: user.username,
    displayName: user.global_name?.trim() || user.username,
    avatarUrl: guildBanAvatarUrl(user.id, user.avatar ?? null),
    timeoutUntil: until,
    timeoutUntilMs: Date.parse(until),
    reason: audit?.reason ?? null,
    moderatedBy: audit?.moderatedBy ?? null,
  };
}

function isTimeoutAuditEntry(entry: DiscordAuditEntry): boolean {
  if (entry.action_type === 145) return true;
  if (entry.action_type !== 24) return false;
  return (
    entry.changes?.some(
      (c) =>
        c.key === "communication_disabled_until" &&
        c.new_value != null &&
        (c.old_value == null || c.old_value === "")
    ) ?? false
  );
}

/** Latest timeout reason per target from recent audit log pages. */
async function fetchTimeoutAuditByUser(): Promise<
  Map<string, { reason: string | null; moderatedBy: string | null }>
> {
  const map = new Map<string, { reason: string | null; moderatedBy: string | null }>();
  let before: string | undefined;

  for (let page = 0; page < 5; page++) {
    const { entries } = await fetchGuildAuditLogs({
      limit: 100,
      before,
    });

    if (!entries.length) break;

    for (const entry of entries) {
      if (!entry.target_id || !isTimeoutAuditEntry(entry)) continue;
      if (map.has(entry.target_id)) continue;
      map.set(entry.target_id, {
        reason: entry.reason?.trim() || null,
        moderatedBy: entry.user_id,
      });
    }

    const last = entries[entries.length - 1];
    if (!last?.id) break;
    before = last.id;
  }

  return map;
}

/** Members with an active communication timeout. Requires Server Members Intent. */
export async function fetchGuildTimeouts(): Promise<GuildTimeoutRow[] | null> {
  if (!isDiscordConfigured()) return null;

  const guildId = envRequired("DISCORD_GUILD_ID");
  const auditByUser = await fetchTimeoutAuditByUser().catch(() => new Map());
  const rows: GuildTimeoutRow[] = [];
  let after: string | undefined;

  for (;;) {
    const url = new URL(`${DISCORD_API}/guilds/${guildId}/members`);
    url.searchParams.set("limit", "1000");
    if (after) url.searchParams.set("after", after);

    const res = await fetch(url.toString(), {
      headers: botHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[discord] fetchGuildTimeouts failed:", res.status, text);
      return null;
    }

    const batch = (await res.json()) as GuildMemberPayload[];
    if (!batch.length) break;

    for (const member of batch) {
      const row = mapMemberRow(member, auditByUser);
      if (row) rows.push(row);
    }

    if (batch.length < 1000) break;
    const lastId = batch[batch.length - 1]?.user?.id;
    if (!lastId) break;
    after = lastId;
  }

  return rows.sort((a, b) => a.timeoutUntilMs - b.timeoutUntilMs);
}

export async function fetchGuildTimeoutCount(): Promise<number | null> {
  const rows = await fetchGuildTimeouts();
  return rows ? rows.length : null;
}
