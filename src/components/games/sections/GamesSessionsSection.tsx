"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useEffect, useState } from "react";

export function GamesSessionsSection() {
  const [sessions, setSessions] = useState<
    {
      game_id: number;
      game_name: string;
      refreshed_at: string | null;
      dm_game: number | string | null;
    }[]
  >([]);

  useEffect(() => {
    fetch("/api/games/sessions?limit=80")
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions || []));
  }, []);

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-2 pr-4">ID</th>
              <th className="pb-2 pr-4">Game</th>
              <th className="pb-2 pr-4">Type</th>
              <th className="pb-2">Refreshed</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.game_id} className="border-b border-border/50">
                <td className="py-2 pr-4 font-mono">{s.game_id}</td>
                <td className="py-2 pr-4">{s.game_name}</td>
                <td className="py-2 pr-4">
                  <Badge variant={s.dm_game ? "info" : "default"}>
                    {s.dm_game ? "DM" : "Chat"}
                  </Badge>
                </td>
                <td className="py-2 text-xs text-muted">
                  {s.refreshed_at || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
