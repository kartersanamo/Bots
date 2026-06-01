"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useEffect, useState } from "react";
import type { AuditEntry } from "@/lib/audit";

export function AuditLogClient() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    fetch("/api/audit?limit=200")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries || []));
  }, []);

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-2 pr-4">Time</th>
              <th className="pb-2 pr-4">Actor</th>
              <th className="pb-2 pr-4">Action</th>
              <th className="pb-2 pr-4">Target</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-border/50">
                <td className="py-2 pr-4 text-xs text-muted whitespace-nowrap">
                  {new Date(e.timestamp).toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-white">
                  {e.actorUsername || e.actorId}
                  <span className="ml-1 text-xs text-muted">({e.tier})</span>
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-accent-light">
                  {e.action}
                </td>
                <td className="py-2 pr-4 text-muted truncate max-w-[200px]">
                  {e.target}
                </td>
                <td className="py-2">
                  <Badge variant={e.success ? "success" : "danger"}>
                    {e.success ? "ok" : "fail"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!entries.length && (
          <p className="py-8 text-center text-muted">No audit entries yet.</p>
        )}
      </div>
    </Card>
  );
}
