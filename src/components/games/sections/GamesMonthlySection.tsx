"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GamesUserDrawer } from "@/components/games/GamesUserDrawer";
import { can, type PermissionTier } from "@/lib/permissions";
import { useEffect, useState } from "react";

interface Row {
  user_id: string;
  xp: number;
  level: number;
  active: string | number;
}

export function GamesMonthlySection({ userTier }: { userTier: PermissionTier }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "50",
    });
    if (search) params.set("search", search);
    fetch(`/api/games/leaderboard/monthly?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows || []);
        setTotal(d.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page, search]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            placeholder="Search user ID…"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch((e.target as HTMLInputElement).value);
                setPage(1);
              }
            }}
          />
          <Button size="sm" variant="secondary" onClick={() => setPage(1)}>
            Search
          </Button>
        </div>
        <p className="mb-2 text-xs text-muted">{total} players</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">User</th>
                <th className="pb-2 pr-4">Level</th>
                <th className="pb-2 pr-4">XP</th>
                <th className="pb-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.user_id}
                  className="cursor-pointer border-b border-border/50 hover:bg-surface-hover"
                  onClick={() => setSelectedUser(r.user_id)}
                >
                  <td className="py-2 pr-4 text-muted">
                    {(page - 1) * 50 + i + 1}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.user_id}</td>
                  <td className="py-2 pr-4">{r.level}</td>
                  <td className="py-2 pr-4">{r.xp}</td>
                  <td className="py-2">{String(r.active)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className="py-6 text-center text-muted">Loading…</p>}
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

      {selectedUser && (
        <GamesUserDrawer
          userId={selectedUser}
          onClose={() => setSelectedUser(null)}
          canWrite={can(userTier, "games.write")}
        />
      )}
    </div>
  );
}
