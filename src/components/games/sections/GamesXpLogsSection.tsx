"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import {
  useMergeDiscordUsersFromApi,
  type DiscordUserProfile,
} from "@/components/games/GamesDiscordUsersProvider";
import { formatUnixTimestamp } from "@/lib/utils";
import { useEffect, useState } from "react";

export function GamesXpLogsSection() {
  const [rows, setRows] = useState<
    {
      user_id: string;
      xp: number;
      source: string | null;
      game_id: number;
      timestamp: string | null;
    }[]
  >([]);
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState("");
  const [total, setTotal] = useState(0);
  const [apiUsers, setApiUsers] = useState<Record<string, DiscordUserProfile>>(
    {}
  );
  useMergeDiscordUsersFromApi(apiUsers);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (userId) params.set("userId", userId);
    fetch(`/api/games/xp-logs?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows || []);
        setTotal(d.total || 0);
        setApiUsers(d.users || {});
      });
  }, [page, userId]);

  return (
    <Card>
      <div className="mb-4 flex gap-2">
        <input
          placeholder="Filter user ID"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setUserId((e.target as HTMLInputElement).value);
              setPage(1);
            }
          }}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-2 pr-4">Time</th>
              <th className="pb-2 pr-4">User</th>
              <th className="pb-2 pr-4">XP</th>
              <th className="pb-2 pr-4">Source</th>
              <th className="pb-2">Game</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-2 pr-4 text-xs text-muted">
                  {formatUnixTimestamp(r.timestamp)}
                </td>
                <td className="py-2 pr-4">
                  <DiscordUserChip userId={r.user_id} />
                </td>
                <td className="py-2 pr-4">{r.xp}</td>
                <td className="py-2 pr-4">{r.source || "—"}</td>
                <td className="py-2">{r.game_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Prev
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={page * 50 >= total}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </Card>
  );
}
