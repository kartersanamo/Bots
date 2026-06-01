"use client";

import { Card } from "@/components/ui/Card";
import { can, type PermissionTier } from "@/lib/permissions";
import { useEffect, useState } from "react";

export function GamesAchievementsSection({
  userTier,
}: {
  userTier: PermissionTier;
}) {
  const [grants, setGrants] = useState<
    { user_id: string; achievement_id: string; earned_at: string | null }[]
  >([]);

  useEffect(() => {
    fetch("/api/games/achievements")
      .then((r) => r.json())
      .then((d) => setGrants(d.grants || []));
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
                <td className="py-2 pr-4 font-mono text-xs">{g.user_id}</td>
                <td className="py-2 pr-4 text-xs">{g.achievement_id}</td>
                <td className="py-2 text-xs text-muted">
                  {g.earned_at || "—"}
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
