"use client";

import { dashboardFetch } from "@/lib/api/dashboard-fetch";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useState } from "react";

export function ModerationPanel() {
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("3600");
  const [msg, setMsg] = useState<string | null>(null);

  async function act(action: string) {
    const res = await dashboardFetch("/api/discord/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        userId,
        reason: reason || undefined,
        durationSeconds: Number(duration),
        deleteMessageDays: 1,
      }),
    });
    const data = await res.json();
    setMsg(res.ok ? `${action} succeeded` : data.error || "Failed");
  }

  return (
    <Card className="max-w-lg space-y-4">
      <input
        placeholder="Discord User ID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
      />
      <input
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
      />
      <input
        placeholder="Timeout seconds"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => act("timeout")}>
          Timeout
        </Button>
        <Button size="sm" variant="secondary" onClick={() => act("untimeout")}>
          Remove timeout
        </Button>
        <Button size="sm" variant="secondary" onClick={() => act("kick")}>
          Kick
        </Button>
        <Button size="sm" variant="danger" onClick={() => act("ban")}>
          Ban
        </Button>
        <Button size="sm" variant="ghost" onClick={() => act("unban")}>
          Unban
        </Button>
      </div>
      {msg && <p className="text-sm text-accent-light">{msg}</p>}
    </Card>
  );
}
