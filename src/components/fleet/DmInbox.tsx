"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface DmChannel {
  id: string;
  recipients?: { id: string; username: string; global_name?: string }[];
  last_message_id?: string;
}

interface DmMessage {
  id: string;
  content: string;
  author: { id: string; username: string; bot?: boolean };
  timestamp: string;
}

interface DmInboxProps {
  botId: string;
  canSend: boolean;
}

export function DmInbox({ botId, canSend }: DmInboxProps) {
  const [channels, setChannels] = useState<DmChannel[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadChannels = useCallback(async () => {
    const res = await fetch(`/api/bots/${botId}/dms`);
    const data = await res.json();
    if (data.error) setError(data.error);
    else setChannels(data.channels || []);
  }, [botId]);

  const loadMessages = useCallback(async (channelId: string) => {
    const res = await fetch(`/api/bots/${botId}/dms/${channelId}/messages`);
    const data = await res.json();
    setMessages((data.messages || []).reverse());
  }, [botId]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    if (selected) loadMessages(selected);
  }, [selected, loadMessages]);

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    const res = await fetch(`/api/bots/${botId}/dms/${selected}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: reply }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Send failed");
      return;
    }
    setReply("");
    loadMessages(selected);
  }

  function label(ch: DmChannel) {
    const r = ch.recipients?.[0];
    return r?.global_name || r?.username || ch.id;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1 max-h-[70vh] overflow-auto">
        <h3 className="mb-3 text-sm font-medium text-muted">DM Channels</h3>
        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
        <ul className="space-y-1">
          {channels.map((ch) => (
            <li key={ch.id}>
              <button
                type="button"
                onClick={() => setSelected(ch.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selected === ch.id
                    ? "bg-accent/20 text-white"
                    : "text-muted hover:bg-surface-hover"
                }`}
              >
                {label(ch)}
              </button>
            </li>
          ))}
          {!channels.length && (
            <p className="text-xs text-muted">No DMs or token not configured.</p>
          )}
        </ul>
      </Card>
      <Card className="lg:col-span-2 flex flex-col max-h-[70vh]">
        {selected ? (
          <>
            <div className="flex-1 overflow-auto space-y-2 mb-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    m.author.bot
                      ? "ml-8 bg-accent/10 text-white"
                      : "mr-8 bg-surface-hover text-muted"
                  }`}
                >
                  <span className="text-xs font-medium text-accent-light">
                    {m.author.username}
                  </span>
                  <p className="mt-1 whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
            </div>
            {canSend && (
              <div className="flex gap-2 border-t border-border pt-4">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
                  placeholder="Reply..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
                />
                <Button onClick={sendReply}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">Select a conversation</p>
        )}
      </Card>
    </div>
  );
}
