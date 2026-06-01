"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { formatUnixTimestamp } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

interface GamesUserDrawerProps {
  userId: string;
  onClose: () => void;
  canWrite: boolean;
}

export function GamesUserDrawer({
  userId,
  onClose,
  canWrite,
}: GamesUserDrawerProps) {
  const [profile, setProfile] = useState<{
    leveling: { xp: number; level: number };
    daily: { streak: number; last_claimed: string | null } | null;
    allTimeXp: number;
    achievements: { achievement_id: string }[];
  } | null>(null);
  const [xp, setXp] = useState("");
  const [level, setLevel] = useState("1");
  const [addXp, setAddXp] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/games/users/${userId}`)
      .then((r) => r.json())
      .then((d) => {
        setProfile(d.profile);
        if (d.profile?.leveling) {
          setXp(String(d.profile.leveling.xp));
          setLevel(String(d.profile.leveling.level));
        }
      });
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    const res = await fetch(`/api/games/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ xp: Number(xp), level: Number(level) }),
    });
    setMsg(res.ok ? "Saved" : "Failed");
    load();
  }

  async function add() {
    const res = await fetch(`/api/games/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addXp: Number(addXp), log: true }),
    });
    setMsg(res.ok ? "XP added" : "Failed");
    load();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <Card className="h-full w-full max-w-md overflow-y-auto rounded-none border-l p-6">
        <div className="mb-4 flex items-center justify-between">
          <DiscordUserChip userId={userId} showId className="font-semibold" />
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        {profile && (
          <div className="space-y-4 text-sm">
            <p className="text-muted">
              Level {profile.leveling.level} · {profile.leveling.xp} XP (monthly)
            </p>
            <p className="text-muted">
              All-time XP (logs): {profile.allTimeXp}
            </p>
            {profile.daily && (
              <p className="text-muted">
                Daily streak {profile.daily.streak} · last{" "}
                {formatUnixTimestamp(profile.daily.last_claimed)}
              </p>
            )}
            <p className="text-muted">
              Achievements: {profile.achievements.length}
            </p>
          </div>
        )}
        {canWrite && (
          <div className="mt-6 space-y-3 border-t border-border pt-4">
            <div className="grid grid-cols-2 gap-2">
              <input
                value={xp}
                onChange={(e) => setXp(e.target.value)}
                placeholder="XP"
                className="rounded border border-border bg-background px-2 py-1 text-sm text-white"
              />
              <input
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="Level"
                className="rounded border border-border bg-background px-2 py-1 text-sm text-white"
              />
            </div>
            <Button size="sm" onClick={save}>
              Set XP / level
            </Button>
            <div className="flex gap-2">
              <input
                value={addXp}
                onChange={(e) => setAddXp(e.target.value)}
                placeholder="Add XP"
                className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm text-white"
              />
              <Button size="sm" variant="secondary" onClick={add}>
                Add
              </Button>
            </div>
            {msg && <p className="text-xs text-accent-light">{msg}</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
