"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useState } from "react";

export function GamesWipeSection() {
  const [month, setMonth] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    if (confirm !== "WIPE_LEVELS") {
      setResult("Type WIPE_LEVELS to confirm");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/games/wipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, confirm: "WIPE_LEVELS" }),
      });
      const d = await res.json();
      setResult(
        res.ok
          ? typeof d.result?.message === "string"
            ? d.result.message
            : "Wipe started — check Discord for tickets and logs."
          : d.error || "Failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-4">
      <p className="text-sm text-muted">
        Runs the full monthly wipe: top 10 reward tickets, CSV export, reset
        monthly leveling, update winners.json, winner role. This cannot be undone.
      </p>
      <input
        placeholder='Month label e.g. "June 2026"'
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
      />
      <input
        placeholder='Type WIPE_LEVELS to confirm'
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
      />
      <Button
        variant="danger"
        disabled={loading || !month.trim()}
        onClick={run}
      >
        {loading ? "Running…" : "Run monthly wipe"}
      </Button>
      {result && (
        <pre className="max-h-64 overflow-auto rounded bg-background p-3 text-xs text-muted whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </Card>
  );
}
