"use client";

import { GamesAchievementsSection } from "@/components/games/sections/GamesAchievementsSection";
import { GamesAllTimeSection } from "@/components/games/sections/GamesAllTimeSection";
import { GamesConfigSection } from "@/components/games/sections/GamesConfigSection";
import { GamesControlSection } from "@/components/games/sections/GamesControlSection";
import { GamesCountingSection } from "@/components/games/sections/GamesCountingSection";
import { GamesDailySection } from "@/components/games/sections/GamesDailySection";
import { GamesMonthlySection } from "@/components/games/sections/GamesMonthlySection";
import { GamesOverviewSection } from "@/components/games/sections/GamesOverviewSection";
import { GamesSessionsSection } from "@/components/games/sections/GamesSessionsSection";
import { GamesUsersSection } from "@/components/games/sections/GamesUsersSection";
import { GamesWinnersSection } from "@/components/games/sections/GamesWinnersSection";
import { GamesWipeSection } from "@/components/games/sections/GamesWipeSection";
import { GamesXpLogsSection } from "@/components/games/sections/GamesXpLogsSection";
import { can, type PermissionTier } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";

export type GamesSection =
  | "overview"
  | "monthly"
  | "alltime"
  | "users"
  | "xplogs"
  | "sessions"
  | "daily"
  | "counting"
  | "achievements"
  | "control"
  | "config"
  | "wipe"
  | "winners";

const SECTIONS: { id: GamesSection; label: string; minAction?: "games.write" | "games.control" | "games.wipe" }[] = [
  { id: "overview", label: "Overview" },
  { id: "monthly", label: "Leaderboard" },
  { id: "alltime", label: "All-time" },
  { id: "users", label: "Users" },
  { id: "xplogs", label: "XP logs" },
  { id: "sessions", label: "Sessions" },
  { id: "daily", label: "Daily" },
  { id: "counting", label: "Counting" },
  { id: "achievements", label: "Achievements" },
  { id: "control", label: "Control", minAction: "games.control" },
  { id: "config", label: "Configs", minAction: "games.write" },
  { id: "wipe", label: "Monthly wipe", minAction: "games.wipe" },
  { id: "winners", label: "Winners" },
];

function parseSection(value: string | null): GamesSection {
  if (value && SECTIONS.some((s) => s.id === value)) {
    return value as GamesSection;
  }
  return "overview";
}

function sectionFromSearchParams(searchParams: URLSearchParams): GamesSection {
  return parseSection(
    searchParams.get("section") || searchParams.get("tab")
  );
}

const GAMES_BOT_ID = "games";

interface BotGamesTabProps {
  userTier: PermissionTier;
}

export function BotGamesTab({ userTier }: BotGamesTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = sectionFromSearchParams(searchParams);
  const configPath = searchParams.get("path");

  const visibleSections = SECTIONS.filter(
    (s) => !s.minAction || can(userTier, s.minAction)
  );

  function setSection(next: GamesSection) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tab");
    if (next === "overview") {
      params.delete("section");
      params.delete("path");
    } else {
      params.set("section", next);
      if (next !== "config") params.delete("path");
    }
    const qs = params.toString();
    router.push(`/dashboard/games${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      <aside className="lg:w-44 lg:shrink-0">
        <nav className="flex flex-wrap gap-1 lg:flex-col lg:gap-0.5">
          {visibleSections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                section === s.id
                  ? "bg-surface-hover text-white"
                  : "text-muted hover:bg-surface-hover hover:text-white"
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        {section === "overview" && <GamesOverviewSection userTier={userTier} />}
        {section === "monthly" && <GamesMonthlySection userTier={userTier} />}
        {section === "alltime" && <GamesAllTimeSection />}
        {section === "users" && <GamesUsersSection userTier={userTier} />}
        {section === "xplogs" && <GamesXpLogsSection userTier={userTier} />}
        {section === "sessions" && <GamesSessionsSection userTier={userTier} />}
        {section === "daily" && <GamesDailySection userTier={userTier} />}
        {section === "counting" && <GamesCountingSection userTier={userTier} />}
        {section === "achievements" && (
          <GamesAchievementsSection userTier={userTier} />
        )}
        {section === "control" && can(userTier, "games.control") && (
          <GamesControlSection />
        )}
        {section === "config" && can(userTier, "games.write") && (
          <GamesConfigSection
            botId={GAMES_BOT_ID}
            canEdit={can(userTier, "config.edit")}
            configPath={configPath}
          />
        )}
        {section === "wipe" && can(userTier, "games.wipe") && (
          <GamesWipeSection />
        )}
        {section === "winners" && <GamesWinnersSection />}
      </div>
    </div>
  );
}
