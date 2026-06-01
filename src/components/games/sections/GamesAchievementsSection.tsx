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

export function GamesAchievementsSection({
  userTier,
}: {
  userTier: PermissionTier;
}) {
  const [grants, setGrants] = useState<
    { user_id: string; achievement_id: string; earned_at: string | null }[]
  >([]);
  const [apiUsers, setApiUsers] = useState<Record<string, DiscordUserProfile>>(
    {}
  );
  useMergeDiscordUsersFromApi(apiUsers);

  useEffect(() => {
    fetch("/api/games/achievements")
      .then((r) => r.json())
      .then((d) => {
        setGrants(d.grants || []);
        setApiUsers(d.users || {});
      });
  }, []);

  return (
    <Card>
      <p className="mb-3 text-sm text-muted">
        Recent achievement grants. Definitions live in milestones.json (Config
        tab).
      </p>
      <div className="overflow-x-auto max-h-[480px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-2 pr-4">User</th>
              <th className="pb-2 pr-4">Achievement</th>
              <th className="pb-2">Earned</th>
            </tr>
          </thead>
          <tbody>
            {grants.map((g, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-2 pr-4">
                  <DiscordUserChip userId={g.user_id} />
                </td>
                <td className="py-2 pr-4 text-xs">{g.achievement_id}</td>
                <td className="py-2 text-xs text-muted">
                  {formatUnixTimestamp(g.earned_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!can(userTier, "games.write") && (
        <p className="mt-2 text-xs text-muted">Grant/revoke requires admin.</p>
      )}
    </Card>
  );
}
