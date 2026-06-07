"use client";

import { ConfigEditor } from "@/components/fleet/ConfigEditor";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

const QUICK_CONFIGS = [
  { path: "assets/configs/games/chat.json", label: "Chat games" },
  { path: "assets/configs/games/dm.json", label: "DM games" },
  { path: "assets/configs/leveling.json", label: "Level thresholds" },
  { path: "assets/configs/rewards.json", label: "Rewards copy" },
  { path: "assets/configs/milestones.json", label: "Milestones" },
  { path: "assets/configs/games/trivia.json", label: "Trivia bank" },
  { path: "assets/configs/discord.json", label: "Discord IDs" },
];

export function GamesConfigSection({
  botId,
  canEdit,
  configPath,
}: {
  botId: string;
  canEdit: boolean;
  configPath?: string | null;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <p className="mb-4 text-sm text-muted">
          Open a config file below. After saving, use Control → Reload config so
          the bot picks up changes.
        </p>
        <ul className="space-y-2">
          {QUICK_CONFIGS.map((c) => (
            <li key={c.path}>
              <Link
                href={`/dashboard/games?section=config&path=${encodeURIComponent(c.path)}`}
                className="text-sm text-accent-light hover:underline"
              >
                {c.label}
              </Link>
              <span className="ml-2 font-mono text-xs text-muted">{c.path}</span>
            </li>
          ))}
        </ul>
        {!canEdit && (
          <p className="mt-3 text-xs text-muted">
            Read-only (config.edit required).
          </p>
        )}
      </Card>

      <ConfigEditor
        botId={botId}
        canEdit={canEdit}
        initialPath={configPath}
      />
    </div>
  );
}
