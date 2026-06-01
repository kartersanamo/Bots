import type { PermissionAction } from "@/lib/permissions";

export type BotTab =
  | "games"
  | "overview"
  | "console"
  | "config"
  | "inbox"
  | "actions"
  | "info";

export const BOT_TABS: {
  id: BotTab;
  label: string;
  permission?: PermissionAction;
  gamesOnly?: boolean;
}[] = [
  { id: "games", label: "Games", permission: "games.read", gamesOnly: true },
  { id: "overview", label: "Overview" },
  { id: "console", label: "Console", permission: "logs.view" },
  { id: "config", label: "Config", permission: "config.view" },
  { id: "inbox", label: "DMs", permission: "dm.view" },
  { id: "actions", label: "Actions", permission: "bot.panels" },
  { id: "info", label: "Info" },
];

export function parseBotTab(
  value: string | null | undefined,
  opts?: { defaultTab?: BotTab; isGamesBot?: boolean }
): BotTab {
  const valid: BotTab[] = [
    "games",
    "overview",
    "console",
    "config",
    "inbox",
    "actions",
    "info",
  ];
  if (value && valid.includes(value as BotTab)) return value as BotTab;
  if (opts?.isGamesBot && opts?.defaultTab === "games") return "games";
  return "overview";
}

export function tabsForBot(botId: string) {
  if (botId === "games") {
    return [
      BOT_TABS.find((t) => t.id === "games")!,
      ...BOT_TABS.filter((t) => t.id !== "games"),
    ];
  }
  return BOT_TABS.filter((t) => !t.gamesOnly);
}
