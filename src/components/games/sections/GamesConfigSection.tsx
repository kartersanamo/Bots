"use client";

import { Card } from "@/components/ui/Card";
import Link from "next/link";

const QUICK_CONFIGS = [
  { path: "assets/Configs/games/chat.json", label: "Chat games" },
  { path: "assets/Configs/games/dm.json", label: "DM games" },
  { path: "assets/Configs/leveling.json", label: "Level thresholds" },
  { path: "assets/Configs/rewards.json", label: "Rewards copy" },
  { path: "assets/Configs/milestones.json", label: "Milestones" },
  { path: "assets/Configs/games/trivia.json", label: "Trivia bank" },
  { path: "assets/Configs/discord.json", label: "Discord IDs" },
];

export function GamesConfigSection({
  botId,
  canEdit,
}: {
  botId: string;
  canEdit: boolean;
}) {
  return (
    <Card>
      <p className="mb-4 text-sm text-muted">
        Open a config file in the full editor (Config tab). After saving, use
        Control → Reload config so the bot picks up changes.
      </p>
      <ul className="space-y-2">
        {QUICK_CONFIGS.map((c) => (
          <li key={c.path}>
            <Link
              href={`/dashboard/bots/${botId}?tab=config&path=${encodeURIComponent(c.path)}`}
              className="text-sm text-accent-light hover:underline"
            >
              {c.label}
            </Link>
            <span className="ml-2 font-mono text-xs text-muted">{c.path}</span>
          </li>
        ))}
      </ul>
      {!canEdit && (
        <p className="mt-3 text-xs text-muted">Read-only (config.edit required).</p>
      )}
    </Card>
  );
}
