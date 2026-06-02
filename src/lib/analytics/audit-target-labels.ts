import { BOT_REGISTRY } from "@/lib/bots/registry";

const SNOWFLAKE_RE = /^\d{17,20}$/;

const BOT_LABELS = Object.fromEntries(
  BOT_REGISTRY.map((b) => [b.id, b.shortName])
) as Record<string, string>;

export type AuditTargetCategory =
  | "ticket_channel"
  | "discord_channel"
  | "discord_user"
  | "bot"
  | "game"
  | "config"
  | "other";

export interface AuditTargetMeta {
  raw: string;
  category: AuditTargetCategory;
  /** Short label for chart axis */
  label: string;
  /** Extra context for tooltips / export */
  detail: string;
}

export function isDiscordSnowflake(value: string): boolean {
  return SNOWFLAKE_RE.test(value.trim());
}

function shortenPath(path: string, max = 36): string {
  const normalized = path.replace(/^games:/, "");
  if (normalized.length <= max) return normalized;
  const parts = normalized.split("/");
  const file = parts[parts.length - 1] ?? normalized;
  if (file.length <= max) return file;
  return `${file.slice(0, max - 1)}…`;
}

/** Human-readable label from the raw audit `target` string (no API lookups). */
export function describeAuditTargetSync(raw: string): AuditTargetMeta {
  const target = raw.trim() || "—";

  if (target === "—") {
    return {
      raw: target,
      category: "other",
      label: "Unknown",
      detail: "No target recorded",
    };
  }

  const botLabel = BOT_LABELS[target];
  if (botLabel) {
    return {
      raw: target,
      category: "bot",
      label: `${botLabel} bot`,
      detail: `Bot fleet: ${target}`,
    };
  }

  if (target === "dm" || target === "chat") {
    return {
      raw: target,
      category: "game",
      label: target === "dm" ? "DM games" : "Chat games",
      detail: `Games control: ${target}`,
    };
  }

  if (/^game:\d+\/user:\d+$/.test(target)) {
    const [, gameId, userId] =
      target.match(/^game:(\d+)\/user:(\d+)$/) ?? [];
    return {
      raw: target,
      category: "game",
      label: `Game ${gameId}`,
      detail: `Session ${gameId}, user ${userId}`,
    };
  }

  if (target.startsWith("game:")) {
    const id = target.slice(5);
    return {
      raw: target,
      category: "game",
      label: `Game ${id}`,
      detail: `Game session ${id}`,
    };
  }

  if (target.includes("/") || target.includes(".json")) {
    const short = shortenPath(target);
    return {
      raw: target,
      category: "config",
      label: short,
      detail: target,
    };
  }

  if (
    ["trivia", "unscramble", "wordle", "hangman", "counting"].includes(
      target.toLowerCase()
    )
  ) {
    return {
      raw: target,
      category: "game",
      label: target.charAt(0).toUpperCase() + target.slice(1),
      detail: `Games: ${target}`,
    };
  }

  if (isDiscordSnowflake(target)) {
    return {
      raw: target,
      category: "discord_user",
      label: `ID …${target.slice(-6)}`,
      detail: `Discord snowflake ${target}`,
    };
  }

  return {
    raw: target,
    category: "other",
    label: target.length > 28 ? `${target.slice(0, 26)}…` : target,
    detail: target,
  };
}

export function applyResolvedAuditTargetLabel(
  meta: AuditTargetMeta,
  resolved: {
    ticket?: { number: string; type: string; name: string };
    channelName?: string;
    userDisplay?: string;
  }
): AuditTargetMeta {
  if (resolved.ticket) {
    const t = resolved.ticket;
    const label = `Ticket #${t.number}`;
    return {
      raw: meta.raw,
      category: "ticket_channel",
      label,
      detail: `${label} · ${t.type}${t.name ? ` · ${t.name}` : ""}`,
    };
  }

  if (resolved.channelName) {
    return {
      raw: meta.raw,
      category: "discord_channel",
      label: `#${resolved.channelName}`,
      detail: `Channel ${meta.raw} (#${resolved.channelName})`,
    };
  }

  if (resolved.userDisplay) {
    return {
      raw: meta.raw,
      category: "discord_user",
      label: resolved.userDisplay,
      detail: `User ${meta.raw} (${resolved.userDisplay})`,
    };
  }

  return meta;
}
