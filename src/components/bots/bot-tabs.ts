import type { PermissionAction } from "@/lib/permissions";

export type BotTab =
  | "overview"
  | "console"
  | "logs"
  | "config"
  | "inbox"
  | "actions"
  | "info";

export const BOT_TABS: {
  id: BotTab;
  label: string;
  permission?: PermissionAction;
}[] = [
  { id: "overview", label: "Overview" },
  { id: "console", label: "Console", permission: "logs.view" },
  { id: "logs", label: "Logs", permission: "logs.view" },
  { id: "config", label: "Config", permission: "config.view" },
  { id: "inbox", label: "DMs", permission: "dm.view" },
  { id: "actions", label: "Actions", permission: "bot.panels" },
  { id: "info", label: "Info" },
];

export function parseBotTab(value: string | null | undefined): BotTab {
  const valid: BotTab[] = [
    "overview",
    "console",
    "logs",
    "config",
    "inbox",
    "actions",
    "info",
  ];
  if (value && valid.includes(value as BotTab)) return value as BotTab;
  return "overview";
}
