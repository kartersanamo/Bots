"use client";

import { Card } from "@/components/ui/Card";
import { DiscordUserChip } from "@/components/games/DiscordUserChip";
import { useEffect, useState } from "react";

export function GamesWinnersSection() {
  const [months, setMonths] = useState<Record<string, Record<string, number>>>(
    {}
  );

  useEffect(() => {
    fetch("/api/games/winners")
      .then((r) => r.json())
      .then((d) => setMonths(d.months || {}));
  }, []);

  const entries = Object.entries(months);

  return (
    <Card>
      <p className="mb-3 text-sm text-muted">
        Past monthly winners from winners.json (user ID → level at wipe).
      </p>
      {!entries.length ? (
        <p className="text-sm text-muted">No winner history.</p>
      ) : (
        <div className="space-y-4">
          {entries.map(([month, winners]) => (
            <div key={month}>
              <h3 className="text-sm font-semibold text-white">{month}</h3>
              <ul className="mt-1 space-y-0.5 text-xs text-muted">
                {Object.entries(winners).map(([uid, lvl]) => (
                  <li key={uid} className="flex items-center gap-2">
                    <DiscordUserChip userId={uid} />
                    <span>— level {lvl}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
