"use client";

import { Button } from "@/components/ui/Button";
import type { TicketRow } from "@/lib/tickets/types";
import { isTicketOpen } from "@/lib/tickets/types";
import type { TicketEnrichment } from "@/lib/discord/tickets";
import { formatRelativeTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { DiscordUserProfileCard } from "@/components/games/DiscordUserProfileCard";
import {
  X,
  ExternalLink,
  Copy,
  MessageSquare,
  FileText,
  RefreshCw,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { can } from "@/lib/permissions";
import type { PermissionTier } from "@/lib/permissions";
import { TICKET_BOT_COMMANDS } from "@/lib/tickets/commands";
import { topRoleForMember } from "@/lib/discord/guild-roles";

interface TicketDetailDrawerProps {
  channelId: string | null;
  onClose: () => void;
  userTier: PermissionTier;
  onClosed?: () => void;
  /** Render inside a column (no overlay) for split layouts */
  embedded?: boolean;
}

interface DetailData {
  ticket: TicketRow;
  enrichment: TicketEnrichment | null;
  owner: {
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
  } | null;
  discordUrl: string;
}

interface TicketMessage {
  id: string;
  content: string;
  timestamp: string;
  author: {
    id: string;
    username?: string;
    global_name?: string | null;
    avatar?: string | null;
    bot?: boolean;
  };
  embeds?: DiscordEmbed[];
}

interface DiscordEmbed {
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

interface GuildRoleLite {
  id: string;
  name: string;
  color: number;
  position: number;
  icon?: string | null;
  unicode_emoji?: string | null;
}

interface DiscordResolvedMember {
  id: string;
  displayName: string;
  username: string;
  avatar: string | null;
  roles: string[];
  nick?: string | null;
  joinedAt?: string | null;
}

const USER_MENTION_RE = /<@!?(\d{15,22})>/g;

function openedAtDate(openedAt: string): Date {
  const n = Number(openedAt);
  if (!Number.isNaN(n) && n > 0) return new Date(n * 1000);
  return new Date(openedAt);
}

function embedBorderColor(color?: number): string {
  if (!color || color <= 0) return "#5865F2";
  return `#${color.toString(16).padStart(6, "0")}`;
}

function roleColorHex(color?: number): string | undefined {
  if (!color || color <= 0) return undefined;
  return `#${color.toString(16).padStart(6, "0")}`;
}

function roleIconUrl(role: GuildRoleLite): string | null {
  if (!role.icon) return null;
  return `https://cdn.discordapp.com/role-icons/${role.id}/${role.icon}.png?size=64`;
}

function extractMentionUserIds(content: string): string[] {
  return Array.from(content.matchAll(USER_MENTION_RE), (m) => m[1]);
}

function formatDiscordTimestampToken(unixSeconds: number, style?: string): string {
  if (!Number.isFinite(unixSeconds)) return "";
  const date = new Date(unixSeconds * 1000);
  if (Number.isNaN(date.getTime())) return "";

  const locale = undefined;
  const shortDate = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const longDate = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const shortTime = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
  const longTime = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
  const longDateTime = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  switch (style) {
    case "t":
      return shortTime.format(date);
    case "T":
      return longTime.format(date);
    case "d":
      return shortDate.format(date);
    case "D":
      return longDate.format(date);
    case "f":
      return `${longDate.format(date)} ${shortTime.format(date)}`;
    case "F":
      return longDateTime.format(date);
    case "R": {
      const now = Date.now();
      const diffSec = Math.round((date.getTime() - now) / 1000);
      const abs = Math.abs(diffSec);
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
      if (abs < 60) return rtf.format(diffSec, "second");
      if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
      if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
      if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), "day");
      if (abs < 31536000) return rtf.format(Math.round(diffSec / 2592000), "month");
      return rtf.format(Math.round(diffSec / 31536000), "year");
    }
    default:
      return `${longDate.format(date)} ${shortTime.format(date)}`;
  }
}

function extractMentionUserIdsFromEmbeds(embeds: DiscordEmbed[] | undefined): string[] {
  if (!embeds?.length) return [];
  const out: string[] = [];
  for (const embed of embeds) {
    if (embed.title) out.push(...extractMentionUserIds(embed.title));
    if (embed.description) out.push(...extractMentionUserIds(embed.description));
    if (embed.footer?.text) out.push(...extractMentionUserIds(embed.footer.text));
    for (const field of embed.fields ?? []) {
      if (field.name) out.push(...extractMentionUserIds(field.name));
      if (field.value) out.push(...extractMentionUserIds(field.value));
    }
  }
  return out;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderDiscordMarkdown(
  raw: string,
  memberProfiles: Record<string, DiscordResolvedMember>
): string {
  if (!raw.trim()) return "";
  const token = {
    mention: (i: number) => `[[[MENTION${i}]]]`,
    block: (i: number) => `[[[BLOCK${i}]]]`,
    inline: (i: number) => `[[[INLINE${i}]]]`,
  };

  const mentionLinks: string[] = [];
  let text = raw
    .replace(USER_MENTION_RE, (_, id: string) => {
      const p = memberProfiles[id];
      const name = p?.displayName || p?.username || id;
      const html = `<button type="button" data-user-id="${id}" class="rounded bg-accent/25 px-1 text-accent-light hover:underline">@${escapeHtml(
        name
      )}</button>`;
      const idx = mentionLinks.push(html);
      return token.mention(idx - 1);
    })
    .replace(/<@&(\d{15,22})>/g, (_m, id: string) => `@role:${id}`)
    .replace(/<#(\d{15,22})>/g, (_m, id: string) => `#channel:${id}`)
    .replace(/@everyone/g, "@everyone")
    .replace(/@here/g, "@here");

  text = text.replace(
    /<t:(\d{1,12})(?::([tTdDfFR]))?>?/g,
    (_m, unixRaw: string, styleRaw?: string) => {
      const rendered = formatDiscordTimestampToken(
        Number(unixRaw),
        styleRaw || undefined
      );
      return rendered || `<t:${unixRaw}${styleRaw ? `:${styleRaw}` : ""}>`;
    }
  );

  text = escapeHtml(text).replaceAll("\r\n", "\n");

  const blockCodes: string[] = [];
  text = text.replace(/```([a-zA-Z0-9+\-_.]*)?\n?([\s\S]*?)```/g, (_, lang, body) => {
    const idx = blockCodes.push(
      `<pre class="my-2 overflow-x-auto rounded bg-black/30 p-2"><code>${
        lang ? `<span class="mr-2 text-[10px] uppercase text-muted">${lang}</span>\n` : ""
      }${body}</code></pre>`
    );
    return token.block(idx - 1);
  });

  const inlineCodes: string[] = [];
  text = text.replace(/`([^`\n]+)`/g, (_, body) => {
    const idx = inlineCodes.push(
      `<code class="rounded bg-black/35 px-1 py-0.5 text-[0.95em]">${body}</code>`
    );
    return token.inline(idx - 1);
  });

  text = text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent-light underline">$1</a>')
    .replace(/&lt;(https?:\/\/[^&\s]+)&gt;/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-accent-light underline">$1</a>')
    .replace(/\|\|([^|]+)\|\|/g, '<span class="rounded bg-white/10 px-1 text-transparent hover:text-white">$1</span>')
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<u>$1</u>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/_([^_\n]+)_/g, "<em>$1</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>");

  const lines = text.split("\n");
  const formattedLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("&gt; ")) {
      formattedLines.push(
        `<blockquote class="my-1 border-l-2 border-border pl-2 text-white/85">${line.slice(5)}</blockquote>`
      );
      continue;
    }
    if (line.startsWith("&gt;&gt;&gt; ")) {
      formattedLines.push(
        `<blockquote class="my-1 border-l-2 border-border pl-2 text-white/85">${line.slice(13)}</blockquote>`
      );
      continue;
    }
    formattedLines.push(line);
  }
  text = formattedLines.join("<br />");

  text = text
    .replace(/\[\[\[INLINE(\d+)\]\]\]/g, (_, i: string) => inlineCodes[Number(i)] ?? "")
    .replace(/\[\[\[BLOCK(\d+)\]\]\]/g, (_, i: string) => blockCodes[Number(i)] ?? "")
    .replace(/\[\[\[MENTION(\d+)\]\]\]/g, (_, i: string) => mentionLinks[Number(i)] ?? "");

  return text;
}

function DiscordMessageContent({
  content,
  memberProfiles,
  onUserMentionClick,
}: {
  content: string;
  memberProfiles: Record<string, DiscordResolvedMember>;
  onUserMentionClick: (userId: string) => void;
}) {
  const html = useMemo(
    () => renderDiscordMarkdown(content, memberProfiles),
    [content, memberProfiles]
  );
  if (!html) return null;
  return (
    <div
      className="mt-1 break-words text-sm text-white/90"
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={(e) => {
        const target = e.target as HTMLElement | null;
        const el = target?.closest?.("[data-user-id]") as HTMLElement | null;
        const userId = el?.getAttribute("data-user-id");
        if (userId) {
          e.preventDefault();
          onUserMentionClick(userId);
        }
      }}
    />
  );
}

function DiscordEmbedCard({
  embed,
  memberProfiles,
  onUserMentionClick,
}: {
  embed: DiscordEmbed;
  memberProfiles: Record<string, DiscordResolvedMember>;
  onUserMentionClick: (userId: string) => void;
}) {
  const descriptionHtml = embed.description
    ? renderDiscordMarkdown(embed.description, memberProfiles)
    : "";
  return (
    <div
      className="mt-2 max-w-[520px] rounded-md border border-border/60 bg-surface/70 p-3"
      style={{ borderLeftWidth: 4, borderLeftColor: embedBorderColor(embed.color) }}
    >
      {embed.author?.name && (
        <p className="text-xs font-medium text-muted">{embed.author.name}</p>
      )}
      {embed.title && (
        <p className="mt-1 text-sm font-semibold text-white">
          {embed.url ? (
            <a href={embed.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {embed.title}
            </a>
          ) : (
            embed.title
          )}
        </p>
      )}
      {embed.description && (
        <div
          className="mt-1 break-words text-sm text-white/90"
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          onClick={(e) => {
            const target = e.target as HTMLElement | null;
            const el = target?.closest?.("[data-user-id]") as HTMLElement | null;
            const userId = el?.getAttribute("data-user-id");
            if (userId) {
              e.preventDefault();
              onUserMentionClick(userId);
            }
          }}
        />
      )}
      {embed.fields && embed.fields.length > 0 && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {embed.fields.map((f, i) => (
            <div key={`${f.name ?? "field"}-${i}`} className={f.inline ? "" : "sm:col-span-2"}>
              {f.name && (
                <div
                  className="text-xs font-medium text-accent-light"
                  dangerouslySetInnerHTML={{
                    __html: renderDiscordMarkdown(f.name, memberProfiles),
                  }}
                />
              )}
              {f.value && (
                <div
                  className="break-words text-xs text-white/85"
                  dangerouslySetInnerHTML={{
                    __html: renderDiscordMarkdown(f.value, memberProfiles),
                  }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement | null;
                    const el = target?.closest?.("[data-user-id]") as HTMLElement | null;
                    const userId = el?.getAttribute("data-user-id");
                    if (userId) {
                      e.preventDefault();
                      onUserMentionClick(userId);
                    }
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {embed.thumbnail?.url && (
        <img
          src={embed.thumbnail.url}
          alt="Embed thumbnail"
          className="mt-2 h-16 w-16 rounded object-cover"
        />
      )}
      {embed.image?.url && (
        <img
          src={embed.image.url}
          alt="Embed image"
          className="mt-2 max-h-80 w-full rounded object-contain"
        />
      )}
      {(embed.footer?.text || embed.timestamp) && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
          {embed.footer?.icon_url && (
            <img
              src={embed.footer.icon_url}
              alt="Footer icon"
              className="h-3.5 w-3.5 rounded"
            />
          )}
          <p>
            {[embed.footer?.text, embed.timestamp ? formatRelativeTime(new Date(embed.timestamp)) : null]
              .filter(Boolean)
              .join(" • ")}
          </p>
        </div>
      )}
    </div>
  );
}

export function TicketDetailDrawer({
  channelId,
  onClose,
  userTier,
  onClosed,
  embedded = false,
}: TicketDetailDrawerProps) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [closeError, setCloseError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [showRenameForm, setShowRenameForm] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [composer, setComposer] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendNotice, setSendNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [guildRoles, setGuildRoles] = useState<GuildRoleLite[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<
    Record<string, DiscordResolvedMember>
  >({});
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(
    null
  );
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  const roleById = useMemo(
    () => new Map(guildRoles.map((r) => [r.id, r])),
    [guildRoles]
  );

  useEffect(() => {
    if (!channelId) {
      setData(null);
      setShowCloseForm(false);
      setCloseReason("");
      setCloseError(null);
      setShowRenameForm(false);
      setRenameValue("");
      setRenameError(null);
      return;
    }
    setLoading(true);
    fetch(`/api/tickets/${channelId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ticket) setData(d as DetailData);
        else setData(null);
      })
      .finally(() => setLoading(false));
  }, [channelId]);

  async function loadMessages() {
    if (!channelId) return;
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/tickets/${channelId}/messages?limit=80`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to load ticket messages"
        );
        return;
      }
      const nextMessages: TicketMessage[] = Array.isArray(payload.messages)
        ? (payload.messages as TicketMessage[])
        : [];
      setMessages(nextMessages);
      if (payload.channelUnavailable === true) {
        setSendError(
          "This Discord ticket channel is unavailable (deleted or no longer accessible by the bot)."
        );
      }
      const authorIds = Array.from(
        new Set(
          nextMessages
            .flatMap((m) => [
              String(m.author?.id || ""),
              ...extractMentionUserIds(m.content || ""),
              ...extractMentionUserIdsFromEmbeds(m.embeds),
            ])
            .filter(Boolean)
        )
      );
      if (authorIds.length) {
        void loadAuthorProfiles(authorIds);
      }
      if (payload.channelUnavailable !== true) {
        setSendError(null);
      }
    } finally {
      setMessagesLoading(false);
    }
  }

  async function loadGuildRoles() {
    const res = await fetch("/api/server/info?roles=all");
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(payload.roles)) return;
    setGuildRoles(
      payload.roles.map((r: GuildRoleLite) => ({
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
    const res = await fetch(
      `/api/discord/users?ids=${encodeURIComponent(ids.join(","))}`
    );
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.users || typeof payload.users !== "object") return;
    const mapped = payload.users as Record<string, DiscordResolvedMember>;
    setMemberProfiles((prev) => ({ ...prev, ...mapped }));
  }

  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      setComposer("");
      setSendError(null);
      return;
    }
    void loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  useEffect(() => {
    void loadGuildRoles();
    // one-time role catalog for role color/icon rendering
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
  }

  async function submitCloseTicket() {
    if (!channelId) return;
    const reason = closeReason.trim();
    if (reason.length < 2) {
      setCloseError("Please enter a reason (at least 2 characters).");
      return;
    }
    setCloseError(null);
    setClosing(true);
    try {
      const res = await fetch(`/api/tickets/${channelId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCloseError(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to close ticket"
        );
        return;
      }
      setShowCloseForm(false);
      onClosed?.();
      onClose();
    } finally {
      setClosing(false);
    }
  }

  async function submitRenameTicket() {
    if (!channelId) return;
    const name = renameValue.trim();
    if (!name) {
      setRenameError("Enter a channel name.");
      return;
    }
    if (name.length > 100) {
      setRenameError("Channel name must be 100 characters or fewer.");
      return;
    }
    setRenameError(null);
    setRenaming(true);
    try {
      const res = await fetch(`/api/tickets/${channelId}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: `/rename ${name}` }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRenameError(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to rename ticket"
        );
        return;
      }
      setShowRenameForm(false);
      setRenameValue("");
      setSendNotice(
        typeof payload.detail === "string"
          ? payload.detail
          : `Channel renamed to ${name}.`
      );
      await loadMessages();
    } finally {
      setRenaming(false);
    }
  }

  async function sendMessage() {
    if (!channelId) return;
    const content = composer.trim();
    if (!content) return;
    setSending(true);
    setSendError(null);
    setSendNotice(null);
    try {
      const isCommand = content.startsWith("/");
      const url = isCommand
        ? `/api/tickets/${channelId}/commands`
        : `/api/tickets/${channelId}/messages`;
      const payload = isCommand ? { command: content } : { content };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(
          typeof out.error === "string" ? out.error : "Failed to send message"
        );
        return;
      }
      setComposer("");
      if (isCommand && typeof out.detail === "string") {
        setSendNotice(out.detail);
      }
      await loadMessages();
    } finally {
      setSending(false);
    }
  }

  const canWrite = can(userTier, "tickets.write");
  const ticketOpen = data ? isTicketOpen(data.ticket.active) : false;
  const commandQuery = composer.trimStart();
  const isCommandMode = commandQuery.startsWith("/");
  const typedCommand = isCommandMode
    ? commandQuery.slice(1).split(/\s+/)[0]?.toLowerCase() ?? ""
    : "";
  const filteredCommands = isCommandMode
    ? TICKET_BOT_COMMANDS.filter((c) => c.name.startsWith(typedCommand))
    : [];

  const body = (
    <>
            <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
              <h2 className="text-lg font-semibold text-white">
                Ticket #{data?.ticket.number ?? "…"}
              </h2>
              {!embedded && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 min-h-0">
              {loading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-lg bg-surface-hover"
                    />
                  ))}
                </div>
              )}

              {data && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {ticketOpen && (
                      <a
                        href={data.discordUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="primary">
                          <ExternalLink className="h-4 w-4" />
                          Open in Discord
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyText(data.ticket.channelID)}
                    >
                      <Copy className="h-4 w-4" />
                      Channel ID
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyText(data.ticket.ownerID)}
                    >
                      <Copy className="h-4 w-4" />
                      Owner ID
                    </Button>
                    {canWrite && ticketOpen && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setRenameError(null);
                            setShowCloseForm(false);
                            setShowRenameForm(true);
                          }}
                          disabled={renaming || closing}
                        >
                          Rename ticket
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setCloseError(null);
                            setShowRenameForm(false);
                            setShowCloseForm(true);
                          }}
                          disabled={closing || renaming}
                        >
                          Close ticket
                        </Button>
                      </>
                    )}
                  </div>

                  {showRenameForm && (
                    <div className="rounded-lg border border-border p-4 space-y-3">
                      <p className="text-sm font-medium text-white">Rename ticket</p>
                      <label className="block text-xs text-muted">
                        New channel name
                      </label>
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        placeholder="e.g. media-app-johndoe"
                        maxLength={100}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !renaming && renameValue.trim()) {
                            e.preventDefault();
                            void submitRenameTicket();
                          }
                        }}
                      />
                      <p className="text-xs text-muted">
                        Runs <code>/rename</code> on this ticket channel (Discord
                        naming rules apply).
                      </p>
                      {renameError && (
                        <p className="text-sm text-red-400">{renameError}</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => void submitRenameTicket()}
                          disabled={renaming}
                        >
                          {renaming ? "Renaming…" : "Rename"}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setShowRenameForm(false);
                            setRenameError(null);
                          }}
                          disabled={renaming}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {showCloseForm && (
                    <div className="rounded-lg border border-border p-4 space-y-3">
                      <p className="text-sm font-medium text-white">Close ticket</p>
                      <label className="block text-xs text-muted">Reason</label>
                      <textarea
                        value={closeReason}
                        onChange={(e) => setCloseReason(e.target.value)}
                        placeholder="e.g. Resolved — player unbanned"
                        rows={3}
                        maxLength={500}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white resize-none"
                      />
                      {closeError && (
                        <p className="text-sm text-red-400">{closeError}</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={submitCloseTicket}
                          disabled={closing}
                        >
                          {closing ? "Closing…" : "Close"}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setShowCloseForm(false);
                            setCloseError(null);
                          }}
                          disabled={closing}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {data.owner && (
                    <div className="flex items-center gap-3">
                      <Avatar
                        userId={data.owner.id}
                        avatarHash={data.owner.avatar}
                        size={40}
                        alt={data.owner.username}
                      />
                      <div>
                        {(() => {
                          const ownerProfile = memberProfiles[data.owner.id];
                          const ownerTopRole = topRoleForMember(
                            ownerProfile?.roles,
                            roleById
                          );
                          const ownerColor = roleColorHex(ownerTopRole?.color);
                          const ownerIcon = ownerTopRole ? roleIconUrl(ownerTopRole) : null;
                          return (
                            <p
                              className="flex items-center gap-1 font-medium"
                              style={{ color: ownerColor ?? "#ffffff" }}
                            >
                              {ownerTopRole?.unicode_emoji && (
                                <span>{ownerTopRole.unicode_emoji}</span>
                              )}
                              {data.owner.global_name || data.owner.username}
                              {ownerIcon && (
                                <img
                                  src={ownerIcon}
                                  alt="Role icon"
                                  className="h-4 w-4 rounded"
                                />
                              )}
                            </p>
                          );
                        })()}
                        <p className="text-xs text-muted">@{data.owner.username}</p>
                      </div>
                    </div>
                  )}

                  {ticketOpen && (
                    <section>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-accent-light">
                          <MessageSquare className="h-4 w-4" />
                          Ticket chat history
                        </h3>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void loadMessages()}
                          disabled={messagesLoading}
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${messagesLoading ? "animate-spin" : ""}`}
                          />
                          Refresh
                        </Button>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-3">
                        {messagesLoading ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="h-14 animate-pulse rounded-md bg-surface-hover"
                              />
                            ))}
                          </div>
                        ) : messages.length === 0 ? (
                          <p className="py-4 text-center text-sm text-muted">
                            No channel messages found.
                          </p>
                        ) : (
                          <div className="max-h-[calc(100vh-220px)] space-y-3 overflow-y-auto pr-1">
                            {messages.map((m) => {
                              const displayName =
                                m.author.global_name || m.author.username || m.author.id;
                              const authorProfile = memberProfiles[m.author.id];
                              const topRole = topRoleForMember(authorProfile?.roles, roleById);
                              const nameColor = roleColorHex(topRole?.color);
                              const iconUrl = topRole ? roleIconUrl(topRole) : null;
                              const body = m.content?.trim() || "";
                              return (
                                <div key={m.id} className="flex gap-3">
                                  <Avatar
                                    userId={m.author.id}
                                    avatarHash={m.author.avatar ?? null}
                                    size={32}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedProfileUserId(m.author.id)}
                                        className="inline-flex items-center gap-1 rounded px-0.5 text-sm font-medium hover:bg-white/5"
                                        style={{ color: nameColor ?? "#ffffff" }}
                                      >
                                        {topRole?.unicode_emoji && (
                                          <span>{topRole.unicode_emoji}</span>
                                        )}
                                        {displayName}
                                        {iconUrl && (
                                          <img
                                            src={iconUrl}
                                            alt="Role icon"
                                            className="h-4 w-4 rounded"
                                          />
                                        )}
                                      </button>
                                      {m.author.bot && (
                                        <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent-light">
                                          BOT
                                        </span>
                                      )}
                                      <span className="text-xs text-muted">
                                        {formatRelativeTime(new Date(m.timestamp))}
                                      </span>
                                    </div>
                                    {body ? (
                                      <DiscordMessageContent
                                        content={body}
                                        memberProfiles={memberProfiles}
                                        onUserMentionClick={(id) => setSelectedProfileUserId(id)}
                                      />
                                    ) : m.embeds?.length ? null : (
                                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-white/90">
                                        (attachment/system)
                                      </p>
                                    )}
                                    {m.embeds?.map((embed, i) => (
                                      <DiscordEmbedCard
                                        key={`${m.id}-embed-${i}`}
                                        embed={embed}
                                        memberProfiles={memberProfiles}
                                        onUserMentionClick={(id) =>
                                          setSelectedProfileUserId(id)
                                        }
                                      />
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {sendError && (
                          <p className="mt-3 text-sm text-red-400">{sendError}</p>
                        )}
                        {sendNotice && (
                          <p className="mt-3 text-sm text-emerald-300">{sendNotice}</p>
                        )}
                        {canWrite && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs text-muted">
                              Messages sent here use ticket webhooks to mimic your staff name/avatar when possible.
                            </p>
                            <p className="text-xs text-muted">
                              Commands: <code>/close</code>, <code>/rename</code>,{" "}
                              <code>/add</code>, <code>/remove</code>, <code>/move</code>,{" "}
                              <code>/private</code>, <code>/management</code>
                            </p>
                            <div className="relative flex gap-2">
                              <textarea
                                value={composer}
                                onChange={(e) => {
                                  setComposer(e.target.value);
                                  setSelectedCommandIndex(0);
                                }}
                                onKeyDown={(e) => {
                                  if (
                                    isCommandMode &&
                                    filteredCommands.length > 0 &&
                                    (e.key === "ArrowDown" || e.key === "ArrowUp")
                                  ) {
                                    e.preventDefault();
                                    const delta = e.key === "ArrowDown" ? 1 : -1;
                                    setSelectedCommandIndex((prev) => {
                                      const next = prev + delta;
                                      if (next < 0) return filteredCommands.length - 1;
                                      if (next >= filteredCommands.length) return 0;
                                      return next;
                                    });
                                    return;
                                  }
                                  if (
                                    isCommandMode &&
                                    filteredCommands.length > 0 &&
                                    (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey))
                                  ) {
                                    const onlyCommandTyped = /^\/\S*$/.test(commandQuery);
                                    if (onlyCommandTyped) {
                                      e.preventDefault();
                                      const picked =
                                        filteredCommands[
                                          Math.min(
                                            selectedCommandIndex,
                                            filteredCommands.length - 1
                                          )
                                        ];
                                      if (picked) {
                                        setComposer(`/${picked.name} `);
                                      }
                                      return;
                                    }
                                  }
                                  if (e.key !== "Enter" || e.shiftKey) return;
                                  e.preventDefault();
                                  if (!sending && composer.trim()) {
                                    void sendMessage();
                                  }
                                }}
                                placeholder="Reply or run command (e.g. /close resolved)…"
                                rows={2}
                                maxLength={2000}
                                className="flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
                              />
                              {isCommandMode && filteredCommands.length > 0 && (
                                <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-20 overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
                                  {filteredCommands.slice(0, 8).map((cmd, idx) => (
                                    <button
                                      key={cmd.name}
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => {
                                        setComposer(`/${cmd.name} `);
                                      }}
                                      className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left ${
                                        idx === selectedCommandIndex
                                          ? "bg-surface-hover"
                                          : "hover:bg-surface-hover"
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold text-white">
                                          /{cmd.name}
                                        </p>
                                        <p className="truncate text-[11px] text-muted">
                                          {cmd.description}
                                        </p>
                                      </div>
                                      <span className="shrink-0 text-[10px] text-muted">
                                        {cmd.usage}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                              <Button
                                variant="primary"
                                onClick={sendMessage}
                                disabled={sending || !composer.trim()}
                              >
                                <Send className="h-4 w-4" />
                                {sending ? "Sending…" : "Send"}
                              </Button>
                            </div>
                          </div>
                        )}
                        {!canWrite && (
                          <p className="mt-3 text-xs text-muted">
                            You have read-only access to ticket messages.
                          </p>
                        )}
                      </div>
                    </section>
                  )}

                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-accent-light">
                      <FileText className="h-4 w-4" />
                      Ticket record
                    </h3>
                    <dl className="grid gap-2 text-sm">
                      {[
                        ["Channel ID", data.ticket.channelID],
                        ["Owner ID", data.ticket.ownerID],
                        ["Type", data.ticket.type],
                        ["Name", data.ticket.name?.trim() || "—"],
                        ["Number", data.ticket.number],
                        ["Status", ticketOpen ? "Open" : "Closed"],
                        [
                          "Opened",
                          formatRelativeTime(
                            openedAtDate(data.ticket.opened_at)
                          ),
                        ],
                        ["Privated", data.ticket.privated?.trim() || "Public"],
                        ["Closed by", data.ticket.closed_by?.trim() || "—"],
                        ["Reason", data.ticket.reason?.trim() || "—"],
                      ].map(([k, v]) => (
                        <div
                          key={k}
                          className="flex justify-between gap-4 border-b border-border/40 py-1.5"
                        >
                          <dt className="text-muted">{k}</dt>
                          <dd className="text-right font-mono text-xs text-white break-all">
                            {v}
                          </dd>
                        </div>
                      ))}
                      {data.ticket.transcript?.trim() &&
                        data.ticket.transcript.startsWith("http") && (
                          <div className="pt-2">
                            <a
                              href={data.ticket.transcript.trim()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent-light hover:underline"
                            >
                              View transcript
                            </a>
                          </div>
                        )}
                    </dl>
                  </section>
                </>
              )}
            </div>
      {selectedProfileUserId && (
        <DiscordUserProfileCard
          user={{
            id: selectedProfileUserId,
            username:
              memberProfiles[selectedProfileUserId]?.username ??
              "unknown",
            displayName:
              memberProfiles[selectedProfileUserId]?.displayName ??
              memberProfiles[selectedProfileUserId]?.username ??
              selectedProfileUserId,
            avatar: memberProfiles[selectedProfileUserId]?.avatar ?? null,
            nick: memberProfiles[selectedProfileUserId]?.nick ?? null,
            roles: memberProfiles[selectedProfileUserId]?.roles ?? [],
            joinedAt: memberProfiles[selectedProfileUserId]?.joinedAt ?? null,
          }}
          onClose={() => setSelectedProfileUserId(null)}
        />
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="flex h-full max-h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
        {!channelId ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted">
            Select a ticket from the queue to view details and resolve it.
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">{body}</div>
        )}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {channelId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-surface shadow-2xl"
          >
            {body}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
