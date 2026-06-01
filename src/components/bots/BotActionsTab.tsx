"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { BotDefinition } from "@/lib/bots/registry";
import { Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface BotActionsTabProps {
  bot: BotDefinition;
}

function ActionMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      className={`text-sm ${message.startsWith("Error") ? "text-red-400" : "text-accent-light"}`}
    >
      {message}
    </p>
  );
}

export function BotActionsTab({ bot }: BotActionsTabProps) {
  const [userId, setUserId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [closeReason, setCloseReason] = useState("");
  const [pollId, setPollId] = useState("");
  const [factionId, setFactionId] = useState("");
  const [statField, setStatField] = useState("tickets_closed");
  const [statDelta, setStatDelta] = useState("1");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function closeTicket() {
    if (!channelId.trim() || closeReason.trim().length < 2) {
      setMessage("Error: channel ID and reason (2+ chars) required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${channelId.trim()}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: closeReason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      setMessage(
        res.ok
          ? "Ticket close dispatched via bot /close"
          : `Error: ${data.error || "Failed"}`
      );
    } finally {
      setLoading(false);
    }
  }

  async function moderate(action: string) {
    if (!userId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/discord/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userId: userId.trim(),
          durationSeconds: 3600,
          reason: "Dashboard action",
        }),
      });
      const data = await res.json().catch(() => ({}));
      setMessage(
        res.ok ? `${action} applied` : `Error: ${data.error || "Failed"}`
      );
    } finally {
      setLoading(false);
    }
  }

  async function closePoll() {
    if (!pollId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/polls/${pollId.trim()}/close`, {
        method: "POST",
      });
      setMessage(res.ok ? "Poll closed" : "Error: failed to close poll");
    } finally {
      setLoading(false);
    }
  }

  async function adjustStaffStat() {
    if (!userId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/staff/stats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId.trim(),
          field: statField,
          delta: Number(statDelta),
        }),
      });
      setMessage(res.ok ? "Statistics adjusted" : "Error: failed");
    } finally {
      setLoading(false);
    }
  }

  function copyCommand(cmd: string) {
    navigator.clipboard.writeText(cmd);
    setMessage(`Copied ${cmd}`);
  }

  const inputClass =
    "rounded-lg border border-border bg-background px-3 py-2 text-sm text-white";

  return (
    <div className="space-y-6">
      <ActionMessage message={message} />

      {(bot.id === "tickets" || bot.id === "management") && (
        <Card>
          <h3 className="mb-3 font-medium text-white">Close ticket</h3>
          <div className="flex flex-col gap-2">
            <input
              placeholder="Ticket channel ID"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className={inputClass}
            />
            <textarea
              placeholder="Close reason"
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              rows={2}
              className={inputClass}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={closeTicket} disabled={loading}>
                Close ticket
              </Button>
              <Link href="/dashboard/tickets">
                <Button size="sm" variant="secondary">
                  <ExternalLink className="h-4 w-4" />
                  Tickets hub
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {bot.id === "management" && (
        <Card>
          <h3 className="mb-3 font-medium text-white">Moderation</h3>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className={inputClass}
            />
            <Button
              size="sm"
              variant="danger"
              onClick={() => moderate("timeout")}
              disabled={loading}
            >
              Timeout 1h
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => moderate("untimeout")}
              disabled={loading}
            >
              Remove timeout
            </Button>
          </div>
        </Card>
      )}

      {bot.id === "utilities" && (
        <Card>
          <h3 className="mb-3 font-medium text-white">Polls</h3>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="Poll ID"
              value={pollId}
              onChange={(e) => setPollId(e.target.value)}
              className={inputClass}
            />
            <Button size="sm" onClick={closePoll} disabled={loading}>
              Close poll
            </Button>
          </div>
        </Card>
      )}

      {bot.id === "leader" && (
        <Card>
          <h3 className="mb-3 font-medium text-white">Factions</h3>
          <p className="mb-2 text-xs text-muted">
            PATCH /api/factions/[id] — load faction by ID in API or extend panel
            later.
          </p>
          <input
            placeholder="Faction ID"
            value={factionId}
            onChange={(e) => setFactionId(e.target.value)}
            className={inputClass}
          />
        </Card>
      )}

      {bot.id === "staff" && (
        <Card>
          <h3 className="mb-3 font-medium text-white">Staff statistics</h3>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="Staff user ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className={inputClass}
            />
            <select
              value={statField}
              onChange={(e) => setStatField(e.target.value)}
              className={inputClass}
            >
              <option value="tickets_closed">tickets_closed</option>
              <option value="messages_sent">messages_sent</option>
              <option value="warnings">warnings</option>
              <option value="mutes">mutes</option>
              <option value="bans">bans</option>
            </select>
            <input
              placeholder="Delta (+/-)"
              value={statDelta}
              onChange={(e) => setStatDelta(e.target.value)}
              className={`w-24 ${inputClass}`}
            />
            <Button size="sm" onClick={adjustStaffStat} disabled={loading}>
              Adjust stat
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <h3 className="mb-3 font-medium text-white">Command catalog</h3>
        <p className="mb-3 text-xs text-muted">
          Reference only — run these in Discord. Click to copy.
        </p>
        <div className="flex flex-wrap gap-2">
          {bot.commands.map((cmd) => (
            <button
              key={cmd}
              type="button"
              onClick={() => copyCommand(cmd)}
              className="inline-flex items-center gap-1 rounded bg-surface-hover px-2 py-1 font-mono text-xs text-accent-light hover:bg-accent/20"
            >
              {cmd}
              <Copy className="h-3 w-3 opacity-50" />
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
