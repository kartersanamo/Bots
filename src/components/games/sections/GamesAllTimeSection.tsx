"use client";

import { Card } from "@/components/ui/Card";
import { ALL_TIME_LEADERBOARD_TYPES } from "@/lib/games/types";
import { useEffect, useState } from "react";

export function GamesAllTimeSection() {
  const [type, setType] = useState("all_time_xp");
  const [entries, setEntries] = useState<
    { userId: string; value: number; rank: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/games/leaderboard/all-time?type=${type}&limit=100`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries || []))
      .finally(() => setLoading(false));
  }, [type]);

  return (
    <Card>
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="mb-4 rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
      >
        {ALL_TIME_LEADERBOARD_TYPES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-2 pr-4">Rank</th>
              <th className="pb-2 pr-4">User</th>
              <th className="pb-2">Value</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.userId} className="border-b border-border/50">
                <td className="py-2 pr-4">{e.rank}</td>
                <td className="py-2 pr-4 font-mono text-xs">{e.userId}</td>
                <td className="py-2">{e.value.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="py-6 text-center text-muted">Loading…</p>}
      </div>
    </Card>
  );
}
