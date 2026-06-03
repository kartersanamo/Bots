"use client";

import { dashboardFetch } from "@/lib/api/dashboard-fetch";
import { Button } from "@/components/ui/Button";
import type { TicketRow } from "@/lib/tickets/types";
import { isTicketOpen } from "@/lib/tickets/types";
import type { TicketEnrichment } from "@/lib/discord/tickets";
import { formatRelativeTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { DiscordChatFeed } from "@/components/discord/DiscordChatFeed";
import { useDiscordChatEnrichment } from "@/hooks/useDiscordChatEnrichment";
import type { DiscordChatMessage } from "@/lib/discord/chat-types";
import { roleColorHex, topRoleForMember } from "@/lib/discord/guild-roles";
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
import { TICKET_BOT_COMMANDS } from "@/lib/tickets/commands";
import { ViewerHighlightSpan } from "@/components/discord/ViewerHighlightProvider";

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


function openedAtDate(openedAt: string): Date {
  const n = Number(openedAt);
  if (!Number.isNaN(n) && n > 0) return new Date(n * 1000);
  return new Date(openedAt);
}

function roleIconUrl(role: { id: string; icon?: string | null }): string | null {
  if (!role.icon) return null;
  return `https://cdn.discordapp.com/role-icons/${role.id}/${role.icon}.png?size=64`;
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
  const [messages, setMessages] = useState<DiscordChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageLimit, setMessageLimit] = useState(30);
  const [canLoadOlderMessages, setCanLoadOlderMessages] = useState(false);
  const [composer, setComposer] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendNotice, setSendNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  const {
    memberProfiles,
    roleById,
    selectedProfileUserId,
    setSelectedProfileUserId,
  } = useDiscordChatEnrichment(messages);

  useEffect(() => {
    if (!channelId) {
      setData(null);
      setShowCloseForm(false);
      setCloseReason("");
      setCloseError(null);
      setShowRenameForm(false);
      setRenameValue("");
      setRenameError(null);
      setMessageLimit(30);
      setCanLoadOlderMessages(false);
      return;
    }
    setLoading(true);
    dashboardFetch(`/api/tickets/${channelId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ticket) setData(d as DetailData);
        else setData(null);
      })
      .finally(() => setLoading(false));
  }, [channelId]);

  async function loadMessages(limitOverride?: number) {
    if (!channelId) return;
    const limit = limitOverride ?? messageLimit;
    setMessagesLoading(true);
    try {
      const res = await dashboardFetch(
        `/api/tickets/${channelId}/messages?limit=${limit}`
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to load ticket messages"
        );
        return;
      }
      const nextMessages: DiscordChatMessage[] = Array.isArray(payload.messages)
        ? (payload.messages as DiscordChatMessage[])
        : [];
      setMessages(nextMessages);
      setCanLoadOlderMessages(nextMessages.length >= limit && limit < 100);
      if (payload.channelUnavailable === true) {
        setSendError(
          "This Discord ticket channel is unavailable (deleted or no longer accessible by the bot)."
        );
      } else {
        setSendError(null);
      }
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
      const res = await dashboardFetch(`/api/tickets/${channelId}/close`, {
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
      const res = await dashboardFetch(`/api/tickets/${channelId}/commands`, {
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
      const res = await dashboardFetch(url, {
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
                              <ViewerHighlightSpan userId={data.owner.id}>
                                {data.owner.global_name || data.owner.username}
                              </ViewerHighlightSpan>
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
                      <DiscordChatFeed
                        messages={messages}
                        loading={messagesLoading}
                        emptyLabel="No channel messages found."
                        canLoadOlder={canLoadOlderMessages}
                        loadOlderLoading={messagesLoading}
                        onLoadOlder={() => {
                          const next = Math.min(100, messageLimit + 30);
                          setMessageLimit(next);
                          void loadMessages(next);
                        }}
                        memberProfiles={memberProfiles}
                        roleById={roleById}
                        selectedProfileUserId={selectedProfileUserId}
                        setSelectedProfileUserId={setSelectedProfileUserId}
                        footer={
                          <>
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
                          </>
                        }
                      />
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
