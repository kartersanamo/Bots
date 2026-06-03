"use client";

import { dashboardFetch } from "@/lib/api/dashboard-fetch";
import { formatErrorDetail } from "@/lib/api/error-message";

import { DiscordChatFeed } from "@/components/discord/DiscordChatFeed";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { useDiscordChatEnrichment } from "@/hooks/useDiscordChatEnrichment";
import type { DiscordChatMessage } from "@/lib/discord/chat-types";
import { MessageSquare, RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface DmChannel {
  id: string;
  recipient_id?: string;
  recipients?: {
    id: string;
    username: string;
    global_name?: string;
    avatar?: string | null;
    bot?: boolean;
  }[];
  last_message_id?: string;
}

interface DmInboxProps {
  botId: string;
  canSend: boolean;
}

function recipientId(ch: DmChannel): string | null {
  if (ch.recipient_id) return ch.recipient_id;
  const human = ch.recipients?.find((r) => !r.bot) ?? ch.recipients?.[0];
  return human?.id ?? null;
}

export function DmInbox({ botId, canSend }: DmInboxProps) {
  const [channels, setChannels] = useState<DmChannel[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DiscordChatMessage[]>([]);
  const [messageLimit, setMessageLimit] = useState(50);
  const [canLoadOlder, setCanLoadOlder] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadSeqRef = useRef(0);

  const enrichment = useDiscordChatEnrichment(messages);

  const loadChannels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardFetch(`/api/bots/${botId}/dms?limit=100`);
      const data = await res.json();
      if (!res.ok) {
        setError(formatErrorDetail(data.error ?? data.detail) || "Failed to load DMs");
        setChannels([]);
        return;
      }
      if (data.error) {
        setError(formatErrorDetail(data.error));
      }
      setChannels(data.channels || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load DMs");
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }, [botId]);

  const loadMessages = useCallback(
    async (channelId: string, limitOverride?: number) => {
      const seq = ++loadSeqRef.current;
      const limit = limitOverride ?? messageLimit;
      setMessagesLoading(true);
      try {
        const res = await dashboardFetch(
          `/api/bots/${botId}/dms/${channelId}/messages?limit=${limit}`
        );
        const data = await res.json();
        if (seq !== loadSeqRef.current) return;
        if (!res.ok) {
          setError(
            formatErrorDetail(data.error ?? data.detail) || "Failed to load messages"
          );
          return;
        }
        const next: DiscordChatMessage[] = Array.isArray(data.messages)
          ? (data.messages as DiscordChatMessage[])
          : [];
        setMessages(next);
        setCanLoadOlder(next.length >= limit && limit < 100);
        setError(null);
      } finally {
        if (seq === loadSeqRef.current) {
          setMessagesLoading(false);
        }
      }
    },
    [botId, messageLimit]
  );

  const selectConversation = useCallback(
    async (userId: string) => {
      loadSeqRef.current += 1;
      setSelectedRecipientId(userId);
      setMessages([]);
      setMessageLimit(50);
      setCanLoadOlder(false);
      setMessagesLoading(true);
      setError(null);

      try {
        const openRes = await dashboardFetch(`/api/bots/${botId}/dms/open`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });
        const openData = await openRes.json();
        if (!openRes.ok) {
          setError(
            formatErrorDetail(openData.error ?? openData.detail) ||
              "Failed to open DM channel"
          );
          setSelectedChannelId(null);
          setMessagesLoading(false);
          return;
        }
        const channelId = String(openData.channel?.id ?? "");
        if (!channelId) {
          setError("Discord did not return a DM channel");
          setMessagesLoading(false);
          return;
        }
        setSelectedChannelId(channelId);
        await loadMessages(channelId, 50);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to open conversation");
        setMessagesLoading(false);
      }
    },
    [botId, loadMessages]
  );

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  async function sendReply() {
    if (!selectedChannelId || !reply.trim()) return;
    setSending(true);
    try {
      const res = await dashboardFetch(
        `/api/bots/${botId}/dms/${selectedChannelId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: reply }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(formatErrorDetail(data.error ?? data.detail) || "Send failed");
        return;
      }
      setReply("");
      if (selectedRecipientId) {
        await loadMessages(selectedChannelId);
      }
      loadChannels();
    } finally {
      setSending(false);
    }
  }

  function label(ch: DmChannel) {
    const r = ch.recipients?.find((x) => !x.bot) ?? ch.recipients?.[0];
    return r?.global_name || r?.username || ch.recipient_id || ch.id;
  }

  const selectedChannel = channels.find(
    (c) => recipientId(c) === selectedRecipientId
  );
  const recipient =
    selectedChannel?.recipients?.find((r) => !r.bot) ??
    selectedChannel?.recipients?.[0];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1 max-h-[70vh] overflow-auto">
        <h3 className="mb-3 text-sm font-medium text-muted">DM Channels</h3>
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
        {loading && (
          <p className="text-xs text-muted">Loading conversations…</p>
        )}
        <ul className="space-y-1">
          {channels.map((ch) => {
            const uid = recipientId(ch);
            if (!uid) return null;
            return (
              <li key={uid}>
                <button
                  type="button"
                  onClick={() => void selectConversation(uid)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selectedRecipientId === uid
                      ? "bg-accent/20 text-white"
                      : "text-muted hover:bg-surface-hover"
                  }`}
                >
                  {ch.recipients?.[0] && (
                    <Avatar
                      userId={uid}
                      avatarHash={
                        (ch.recipients.find((r) => !r.bot) ?? ch.recipients[0])
                          ?.avatar ?? null
                      }
                      size={24}
                    />
                  )}
                  <span className="truncate">{label(ch)}</span>
                </button>
              </li>
            );
          })}
          {!loading && !channels.length && !error && (
            <p className="text-xs text-muted">
              No DM conversations found yet. Discord does not expose a bot&apos;s DM
              list via API — conversations appear here after players message the bot.
            </p>
          )}
        </ul>
      </Card>

      <div className="lg:col-span-2 flex min-h-0 flex-col">
        {selectedRecipientId ? (
          <section className="flex min-h-0 flex-1 flex-col">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-accent-light">
                <MessageSquare className="h-4 w-4" />
                {recipient ? (
                  <span className="inline-flex items-center gap-2">
                    <Avatar
                      userId={recipient.id}
                      avatarHash={recipient.avatar ?? null}
                      size={24}
                    />
                    {label(selectedChannel ?? { id: "", recipients: [recipient] })}
                  </span>
                ) : (
                  "DM conversation"
                )}
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (selectedChannelId && selectedRecipientId) {
                    void loadMessages(selectedChannelId);
                  } else if (selectedRecipientId) {
                    void selectConversation(selectedRecipientId);
                  }
                }}
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
              emptyLabel="No messages in this DM."
              canLoadOlder={canLoadOlder}
              loadOlderLoading={messagesLoading}
              onLoadOlder={() => {
                if (!selectedChannelId || !selectedRecipientId) return;
                const next = Math.min(100, messageLimit + 30);
                setMessageLimit(next);
                void loadMessages(selectedChannelId, next);
              }}
              maxHeightClass="max-h-[calc(70vh-120px)]"
              memberProfiles={enrichment.memberProfiles}
              roleById={enrichment.roleById}
              selectedProfileUserId={enrichment.selectedProfileUserId}
              setSelectedProfileUserId={enrichment.setSelectedProfileUserId}
              footer={
                canSend ? (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <div className="flex gap-2">
                      <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" || e.shiftKey) return;
                          e.preventDefault();
                          if (!sending && reply.trim()) void sendReply();
                        }}
                        placeholder="Message…"
                        rows={2}
                        maxLength={2000}
                        className="flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
                      />
                      <Button
                        variant="primary"
                        onClick={() => void sendReply()}
                        disabled={sending || !reply.trim()}
                      >
                        <Send className="h-4 w-4" />
                        {sending ? "Sending…" : "Send"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 border-t border-border pt-3 text-xs text-muted">
                    You have read-only access to DM messages.
                  </p>
                )
              }
            />
          </section>
        ) : (
          <Card className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm text-muted">Select a conversation</p>
          </Card>
        )}
      </div>
    </div>
  );
}
