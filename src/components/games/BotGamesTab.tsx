"use client";

import { PanelFallback } from "@/components/ui/panel-fallback";
import { can, type PermissionTier } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";

const GamesOverviewSection = dynamic(
  () =>
    import("@/components/games/sections/GamesOverviewSection").then((m) => ({
      default: m.GamesOverviewSection,
    })),
  { loading: () => <PanelFallback /> }
);
const GamesMonthlySection = dynamic(
  () =>
    import("@/components/games/sections/GamesMonthlySection").then((m) => ({
      default: m.GamesMonthlySection,
    })),
  { loading: () => <PanelFallback /> }
);
const GamesAllTimeSection = dynamic(
  () =>
    import("@/components/games/sections/GamesAllTimeSection").then((m) => ({
      default: m.GamesAllTimeSection,
    })),
  { loading: () => <PanelFallback /> }
);
const GamesXpLogsSection = dynamic(
  () =>
    import("@/components/games/sections/GamesXpLogsSection").then((m) => ({
      default: m.GamesXpLogsSection,
    })),
  { loading: () => <PanelFallback /> }
);
const GamesSessionsSection = dynamic(
  () =>
    import("@/components/games/sections/GamesSessionsSection").then((m) => ({
      default: m.GamesSessionsSection,
    })),
  { loading: () => <PanelFallback /> }
);
const GamesDailySection = dynamic(
  () =>
    import("@/components/games/sections/GamesDailySection").then((m) => ({
      default: m.GamesDailySection,
    })),
  { loading: () => <PanelFallback /> }
);
const GamesCountingSection = dynamic(
  () =>
    import("@/components/games/sections/GamesCountingSection").then((m) => ({
      default: m.GamesCountingSection,
    })),
  { loading: () => <PanelFallback /> }
);
const GamesAchievementsSection = dynamic(
  () =>
    import("@/components/games/sections/GamesAchievementsSection").then((m) => ({
      default: m.GamesAchievementsSection,
    })),
  { loading: () => <PanelFallback /> }
);
const GamesControlSection = dynamic(
  () =>
    import("@/components/games/sections/GamesControlSection").then((m) => ({
      default: m.GamesControlSection,
    })),
  { loading: () => <PanelFallback /> }
);
const GamesConfigSection = dynamic(
  () =>
    import("@/components/games/sections/GamesConfigSection").then((m) => ({
      default: m.GamesConfigSection,
    })),
  { loading: () => <PanelFallback /> }
);
const GamesWipeSection = dynamic(
  () =>
    import("@/components/games/sections/GamesWipeSection").then((m) => ({
      default: m.GamesWipeSection,
    })),
  { loading: () => <PanelFallback /> }
);
const GamesWinnersSection = dynamic(
  () =>
    import("@/components/games/sections/GamesWinnersSection").then((m) => ({
      default: m.GamesWinnersSection,
    })),
  { loading: () => <PanelFallback /> }
);

export type GamesSection =
  | "overview"
  | "monthly"
  | "alltime"
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
  if (value === "users") return "overview";
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

type GamesOverviewFull = Awaited<
  ReturnType<typeof import("@/lib/data/games-overview").getGamesOverviewFullPayload>
>;

interface BotGamesTabProps {
  userTier: PermissionTier;
  initialOverview?: GamesOverviewFull | null;
}

export function BotGamesTab({ userTier, initialOverview }: BotGamesTabProps) {
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
        {section === "overview" && (
          <GamesOverviewSection
            userTier={userTier}
            initialOverview={initialOverview}
          />
        )}
        {section === "monthly" && <GamesMonthlySection />}
        {section === "alltime" && <GamesAllTimeSection />}
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
