"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useState } from "react";

interface BotPanelsProps {
  botId: string;
}

export function BotPanels({ botId }: BotPanelsProps) {
  const [userId, setUserId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [xp, setXp] = useState("");
  const [level, setLevel] = useState("1");
  const [message, setMessage] = useState<string | null>(null);

  async function closeTicket() {
    if (!channelId) return;
    const res = await fetch(`/api/tickets/${channelId}/close`, { method: "POST" });
    setMessage(res.ok ? "Ticket closed in DB" : "Failed");
  }

  async function setLeveling() {
    if (!userId) return;
    const res = await fetch(`/api/leveling/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ xp: Number(xp), level: Number(level) }),
    });
    setMessage(res.ok ? "Leveling updated" : "Failed");
  }

  async function timeoutUser() {
    if (!userId) return;
    const res = await fetch("/api/discord/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "timeout",
        userId,
        durationSeconds: 3600,
        reason: "Dashboard action",
      }),
    });
    setMessage(res.ok ? "User timed out (1h)" : "Failed");
  }

  return (
    <div className="space-y-6">
      {message && (
        <p className="text-sm text-accent-light">{message}</p>
      )}

      {(botId === "tickets" || botId === "management") && (
        <Card>
          <h3 className="font-medium text-white mb-3">Tickets</h3>
          <div className="flex gap-2 flex-wrap">
            <input
              placeholder="Channel ID"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
            />
            <Button size="sm" onClick={closeTicket}>
              Close ticket (DB)
            </Button>
          </div>
        </Card>
      )}

      {botId === "games" && (
        <Card>
          <h3 className="font-medium text-white mb-3">Leveling</h3>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
            />
            <input
              placeholder="XP"
              value={xp}
              onChange={(e) => setXp(e.target.value)}
              className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
            />
            <input
              placeholder="Level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
            />
            <Button size="sm" onClick={setLeveling}>
              Set XP/Level
            </Button>
          </div>
        </Card>
      )}

      {botId === "management" && (
        <Card>
          <h3 className="font-medium text-white mb-3">Moderation</h3>
          <div className="flex gap-2 flex-wrap">
            <input
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
            />
            <Button size="sm" variant="danger" onClick={timeoutUser}>
              Timeout 1h
            </Button>
          </div>
        </Card>
      )}

      {botId === "leader" && (
        <Card>
          <h3 className="font-medium text-white mb-3">Factions</h3>
          <p className="text-sm text-muted">
            Edit factions via PATCH /api/factions/[id] — use API or extend this panel.
          </p>
        </Card>
      )}

      {botId === "staff" && (
        <Card>
          <h3 className="font-medium text-white mb-3">Staff stats</h3>
          <p className="text-sm text-muted">
            Adjust statistics via PATCH /api/staff/stats (leaderboard corrections).
          </p>
        </Card>
      )}
    </div>
  );
}
