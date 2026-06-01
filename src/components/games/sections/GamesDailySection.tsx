"use client";

import { Card } from "@/components/ui/Card";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import {
  useMergeDiscordUsersFromApi,
  type DiscordUserProfile,
} from "@/components/games/GamesDiscordUsersProvider";
import { can, type PermissionTier } from "@/lib/permissions";
import { formatUnixTimestamp } from "@/lib/utils";
import { useEffect, useState } from "react";

export function GamesDailySection({ userTier }: { userTier: PermissionTier }) {
  const [rows, setRows] = useState<
    { user_id: string; streak: number; last_claimed: string | null }[]
  >([]);
  const [apiUsers, setApiUsers] = useState<Record<string, DiscordUserProfile>>(
    {}
  );
  useMergeDiscordUsersFromApi(apiUsers);

  useEffect(() => {
    fetch("/api/games/daily?limit=100")
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows || []);
        setApiUsers(d.users || {});
      });
  }, []);

  return (
    <Card>
      <p className="mb-3 text-sm text-muted">
        Daily claim streaks. Edit via user drawer or API.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-2 pr-4">User</th>
              <th className="pb-2 pr-4">Streak</th>
              <th className="pb-2">Last claimed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user_id} className="border-b border-border/50">
                <td className="py-2 pr-4">
                  <DiscordUserChip userId={r.user_id} />
                </td>
                <td className="py-2 pr-4">{r.streak}</td>
                <td className="py-2 text-muted">
                  {formatUnixTimestamp(r.last_claimed)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!can(userTier, "games.write") && (
        <p className="mt-2 text-xs text-muted">Read-only.</p>
      )}
    </Card>
  );
}
