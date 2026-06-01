import { isDiscordConfigured } from "@/lib/discord/api";
import { envRequired } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/fetch-timeout";

const DISCORD_API = "https://discord.com/api/v10";
const FETCH_MS = 5000;

export const AUDIT_ACTION_LABELS: Record<number, string> = {
  1: "Server updated",
  10: "Channel created",
  11: "Channel updated",
  12: "Channel deleted",
  13: "Channel permission created",
  14: "Channel permission updated",
  15: "Channel permission deleted",
  20: "Member kicked",
  21: "Members pruned",
  22: "Member banned",
  23: "Member unbanned",
  24: "Member updated",
  25: "Member roles updated",
  26: "Member moved (voice)",
  27: "Member disconnected (voice)",
  28: "Bot added",
  30: "Role created",
  31: "Role updated",
  32: "Role deleted",
  40: "Invite created",
  41: "Invite updated",
  42: "Invite deleted",
  50: "Webhook created",
  51: "Webhook updated",
  52: "Webhook deleted",
  60: "Emoji created",
  61: "Emoji updated",
  62: "Emoji deleted",
  72: "Message deleted",
  73: "Messages bulk deleted",
  74: "Message pinned",
  75: "Message unpinned",
  80: "Integration created",
  81: "Integration updated",
  82: "Integration deleted",
  83: "Stage created",
  84: "Stage updated",
  85: "Stage deleted",
  90: "Sticker created",
  91: "Sticker updated",
  92: "Sticker deleted",
  100: "Event created",
  101: "Event updated",
  102: "Event deleted",
  110: "Thread created",
  111: "Thread updated",
  112: "Thread deleted",
  121: "App command permissions updated",
  140: "Auto mod rule created",
  141: "Auto mod rule updated",
  142: "Auto mod rule deleted",
  143: "Auto mod message blocked",
  144: "Auto mod message flagged",
  145: "Auto mod timeout",
  146: "Auto mod quarantine",
};

export interface DiscordAuditChange {
  key: string;
  old_value?: unknown;
  new_value?: unknown;
}

export interface DiscordAuditEntry {
  id: string;
  action_type: number;
  user_id: string | null;
  target_id: string | null;
  changes?: DiscordAuditChange[];
  options?: Record<string, string>;
  reason?: string;
}

export interface DiscordAuditUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}

export interface DiscordAuditLogResult {
  entries: DiscordAuditEntry[];
  users: DiscordAuditUser[];
}

export function auditActionLabel(actionType: number): string {
  return AUDIT_ACTION_LABELS[actionType] ?? `Action ${actionType}`;
}

export function snowflakeToDate(snowflake: string): Date {
  const ms = Number(BigInt(snowflake) >> BigInt(22)) + 1420070400000;
  return new Date(ms);
}

export function formatAuditChanges(changes: DiscordAuditChange[] | undefined): string {
  if (!changes?.length) return "";
  return changes
    .slice(0, 3)
    .map((c) => {
      const key = c.key.replace(/_/g, " ");
      if (c.old_value !== undefined && c.new_value !== undefined) {
        return `${key}: ${String(c.old_value)} → ${String(c.new_value)}`;
      }
      if (c.new_value !== undefined) return `${key}: ${String(c.new_value)}`;
      return key;
    })
    .join(" · ");
}

export function formatAuditTarget(entry: DiscordAuditEntry): string {
  if (entry.options?.channel_name) {
    return `#${entry.options.channel_name}`;
  }
  if (entry.options?.role_name) return entry.options.role_name;
  if (entry.target_id) return entry.target_id;
  if (entry.options?.count) return `${entry.options.count} members`;
  return "—";
}

function botHeaders(): HeadersInit {
  return { Authorization: `Bot ${envRequired("DISCORD_BOT_TOKEN")}` };
}

export async function fetchGuildAuditLogs(opts: {
  limit?: number;
  before?: string;
  userId?: string;
}): Promise<DiscordAuditLogResult> {
  if (!isDiscordConfigured()) {
    throw new Error("Discord API not configured");
  }

  const guildId = envRequired("DISCORD_GUILD_ID");
  const params = new URLSearchParams();
  params.set("limit", String(Math.min(100, Math.max(1, opts.limit ?? 50))));
  if (opts.before) params.set("before", opts.before);
  if (opts.userId) params.set("user_id", opts.userId);

  const res = await fetchWithTimeout(
    `${DISCORD_API}/guilds/${guildId}/audit-logs?${params}`,
    { headers: botHeaders() },
    FETCH_MS
  );

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 403) {
      throw new Error(
        "Bot lacks View Audit Log permission (needs VIEW_AUDIT_LOG on the server)"
      );
    }
    throw new Error(text || res.statusText);
  }

  const data = await res.json();
  return {
    entries: data.audit_log_entries ?? [],
    users: (data.users ?? []).map(
      (u: {
        id: string;
        username: string;
        global_name?: string | null;
        avatar?: string | null;
      }) => ({
        id: u.id,
        username: u.username,
        global_name: u.global_name ?? null,
        avatar: u.avatar ?? null,
      })
    ),
  };
}
