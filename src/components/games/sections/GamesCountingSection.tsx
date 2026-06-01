"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { useMergeDiscordUsersFromApi } from "@/components/games/GamesDiscordUsersProvider";
import type { ResolvedDiscordUser } from "@/lib/discord/users";
import { can, type PermissionTier } from "@/lib/permissions";
import { useEffect, useState } from "react";

export function GamesCountingSection({ userTier }: { userTier: PermissionTier }) {
  const [server, setServer] = useState<{
    last_number: number;
    total_counts?: number;
    highest_count?: number;
  } | null>(null);
  const [users, setUsers] = useState<
    { user_id: string; total_counts: number; mistakes: number }[]
  >([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [apiUsers, setApiUsers] = useState<Record<string, ResolvedDiscordUser>>({});
  useMergeDiscordUsersFromApi(apiUsers);

  function load() {
    fetch("/api/games/counting")
      .then((r) => r.json())
      .then((d) => {
        setServer(d.server);
        setUsers(d.users || []);
        if (d.discordUsers) setApiUsers(d.discordUsers);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function reset() {
    if (!confirm("Reset counting channel stats for all users?")) return;
    const res = await fetch("/api/games/counting/reset", { method: "POST" });
    setMsg(res.ok ? "Reset complete" : "Failed");
    load();
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="mb-2 text-sm font-semibold text-white">Server</h3>
        {server ? (
          <p className="text-sm text-muted">
            Last number: {server.last_number} · Total counts:{" "}
            {server.total_counts ?? "—"} · High: {server.highest_count ?? "—"}
          </p>
        ) : (
          <p className="text-sm text-muted">No counting data.</p>
        )}
        {can(userTier, "games.write") && (
          <Button size="sm" variant="danger" className="mt-3" onClick={reset}>
            Reset counting
          </Button>
        )}
        {msg && <p className="mt-2 text-xs text-accent-light">{msg}</p>}
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Top counters</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-2 pr-4">User</th>
              <th className="pb-2 pr-4">Counts</th>
              <th className="pb-2">Mistakes</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id} className="border-b border-border/50">
                <td className="py-2 pr-4">
                  <DiscordUserChip userId={u.user_id} />
                </td>
                <td className="py-2 pr-4">{u.total_counts}</td>
                <td className="py-2">{u.mistakes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
