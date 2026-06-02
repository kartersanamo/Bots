"use client";

import { Button } from "@/components/ui/Button";
import type { TicketRow } from "@/lib/tickets/types";
import { isTicketOpen } from "@/lib/tickets/types";
import type { TicketEnrichment } from "@/lib/discord/tickets";
import { formatRelativeTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
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
import { useEffect, useState } from "react";
import { can } from "@/lib/permissions";
import type { PermissionTier } from "@/lib/permissions";

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

function openedAtDate(openedAt: string): Date {
  const n = Number(openedAt);
  if (!Number.isNaN(n) && n > 0) return new Date(n * 1000);
  return new Date(openedAt);
}

function embedBorderColor(color?: number): string {
  if (!color || color <= 0) return "#5865F2";
  return `#${color.toString(16).padStart(6, "0")}`;
}

function DiscordEmbedCard({ embed }: { embed: DiscordEmbed }) {
  return (
    <div
      className="mt-2 rounded-md border border-border/60 bg-surface/70 p-3"
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
        <p className="mt-1 whitespace-pre-wrap text-sm text-white/90">
          {embed.description}
        </p>
      )}
      {embed.fields && embed.fields.length > 0 && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {embed.fields.map((f, i) => (
            <div key={`${f.name ?? "field"}-${i}`} className={f.inline ? "" : "sm:col-span-2"}>
              {f.name && <p className="text-xs font-medium text-accent-light">{f.name}</p>}
              {f.value && (
                <p className="whitespace-pre-wrap text-xs text-white/85">{f.value}</p>
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
        <p className="mt-2 text-[11px] text-muted">
          {[embed.footer?.text, embed.timestamp ? formatRelativeTime(new Date(embed.timestamp)) : null]
            .filter(Boolean)
            .join(" • ")}
        </p>
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
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [composer, setComposer] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendNotice, setSendNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!channelId) {
      setData(null);
      setShowCloseForm(false);
      setCloseReason("");
      setCloseError(null);
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
      setMessages(Array.isArray(payload.messages) ? payload.messages : []);
      setSendError(null);
    } finally {
      setMessagesLoading(false);
    }
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
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setCloseError(null);
                          setShowCloseForm(true);
                        }}
                        disabled={closing}
                      >
                        Close ticket
                      </Button>
                    )}
                  </div>

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
                        <p className="font-medium text-white">
                          {data.owner.global_name || data.owner.username}
                        </p>
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
                          <div className="max-h-[380px] space-y-3 overflow-y-auto pr-1">
                            {messages.map((m) => {
                              const displayName =
                                m.author.global_name || m.author.username || m.author.id;
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
                                      <p className="text-sm font-medium text-white">
                                        {displayName}
                                      </p>
                                      {m.author.bot && (
                                        <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent-light">
                                          BOT
                                        </span>
                                      )}
                                      <span className="text-xs text-muted">
                                        {formatRelativeTime(new Date(m.timestamp))}
                                      </span>
                                    </div>
                                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-white/90">
                                      {body || (m.embeds?.length ? null : "(attachment/system)")}
                                    </p>
                                    {m.embeds?.map((embed, i) => (
                                      <DiscordEmbedCard key={`${m.id}-embed-${i}`} embed={embed} />
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
                              Messages sent here are posted by the configured bot account.
                            </p>
                            <p className="text-xs text-muted">
                              Commands: <code>/close [reason]</code>,{" "}
                              <code>/rename name</code>, <code>/slowmode seconds</code>,{" "}
                              <code>/topic text</code>
                            </p>
                            <div className="flex gap-2">
                              <textarea
                                value={composer}
                                onChange={(e) => setComposer(e.target.value)}
                                placeholder="Reply or run command (e.g. /close resolved)…"
                                rows={2}
                                maxLength={2000}
                                className="flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
                              />
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
    </>
  );

  if (embedded) {
    return (
      <div className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-lg border border-border bg-surface">
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
