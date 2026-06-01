"use client";

import { Card } from "@/components/ui/Card";
import { GamesUserDrawer } from "@/components/games/GamesUserDrawer";
import { Button } from "@/components/ui/Button";
import { can, type PermissionTier } from "@/lib/permissions";
import { useState } from "react";

export function GamesUsersSection({ userTier }: { userTier: PermissionTier }) {
  const [userId, setUserId] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Card className="space-y-4">
      <p className="text-sm text-muted">Look up a player by Discord user ID.</p>
      <div className="flex flex-wrap gap-2">
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="User ID"
          className="min-w-[240px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
        />
        <Button
          size="sm"
          disabled={!userId.trim()}
          onClick={() => setOpen(userId.trim())}
        >
          Open
        </Button>
      </div>
      {open && (
        <GamesUserDrawer
          userId={open}
          onClose={() => setOpen(null)}
          canWrite={can(userTier, "games.write")}
        />
      )}
    </Card>
  );
}
