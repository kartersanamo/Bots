export interface BotDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  accentColor: string;
  icon: string;
  features: string[];
  commands: string[];
  configFiles: string[];
  databaseTables: string[];
}

export const BOT_REGISTRY: BotDefinition[] = [
  {
    id: "games",
    name: "MinecadiaGames",
    shortName: "Games",
    description:
      "Community games bot — DM games, chat games, XP/leveling, achievements, counting, daily rewards, and leaderboards.",
    accentColor: "#8b5cf6",
    icon: "Gamepad2",
    features: [
      "DM Games (Wordle, Hangman, Tic-Tac-Toe, Connect Four, Minesweeper, Memory, 2048)",
      "Chat Games (Trivia, Unscramble, Flag Guesser, Math Quiz, Emoji Quiz)",
      "XP & Leveling system with monthly wipe",
      "Achievements & milestones",
      "Counting channel",
      "Daily rewards",
      "Leaderboards & statistics",
    ],
    commands: [
      "/daily",
      "/level",
      "/statistics",
      "/milestones",
      "/game-manager",
      "/wipe-levels",
      "/config-manager",
    ],
    configFiles: [
      "assets/Configs/bot.json",
      "assets/Configs/discord.json",
      "assets/Configs/games/chat.json",
      "assets/Configs/games/dm.json",
      "assets/Configs/leveling.json",
      "assets/Configs/milestones.json",
      "assets/Configs/rewards.json",
      "assets/Configs/games/trivia.json",
      "assets/Configs/winners.json",
    ],
    databaseTables: [
      "leveling",
      "xp_logs",
      "daily_claims",
      "user_achievements",
      "games",
      "counting_server",
    ],
  },
  {
    id: "tickets",
    name: "MinecadiaTickets",
    shortName: "Tickets",
    description:
      "Primary support ticket system — creation panels, lifecycle management, blacklists, transcripts, and analytics.",
    accentColor: "#f1c40f",
    icon: "Ticket",
    features: [
      "Ticket creation via button panels",
      "Add/remove/rename/move/close/private tickets",
      "Blacklist management with auto-expiry",
      "Transcript generation",
      "Active ticket tracking",
      "Ticket logs browser",
      "Voice channel ticket count",
    ],
    commands: [
      "/send-tickets",
      "/manage-tickets",
      "/close",
      "/blacklist",
      "/ticket-logs",
      "/active-tickets",
      "/ticket-count",
    ],
    configFiles: ["Assets/config.json", "Assets/tickets.json"],
    databaseTables: ["tickets", "blacklists", "statistics"],
  },
  {
    id: "management",
    name: "MinecadiaManagement",
    shortName: "Management",
    description:
      "Guild moderation & media management — bans, timeouts, media ranks, YouTube checker, and admin logging.",
    accentColor: "#ef4444",
    icon: "Shield",
    features: [
      "Ban/unban with appeal tracking",
      "Timeout management",
      "Staff mention protection",
      "Media rank workflow",
      "YouTube community video approval",
      "Ticket analytics (SQL reports)",
      "Admin event logging",
    ],
    commands: [
      "/ban",
      "/unban",
      "/timeout",
      "/media-accept",
      "/media-list",
      "/analyze",
    ],
    configFiles: ["Assets/config.json", "Assets/yt_info.json"],
    databaseTables: ["bans", "media", "tickets", "statistics"],
  },
  {
    id: "utilities",
    name: "MinecadiaUtilities",
    shortName: "Utilities",
    description:
      "General utility bot — account sync, polls, tags, screenshares, player count, applications, and helper auto-replies.",
    accentColor: "#06b6d4",
    icon: "Wrench",
    features: [
      "Minecraft ↔ Discord account sync",
      "Polls with button voting",
      "Presaved tags",
      "Screenshare management",
      "Live player count",
      "Staff/QA applications",
      "Helper auto-replies",
      "Message counter & suggestions",
    ],
    commands: [
      "/poll",
      "/manage-polls",
      "/tags",
      "/start-screenshare",
      "/player-count",
      "/send-message",
      "/suggestion-list",
    ],
    configFiles: [
      "Assets/config.json",
      "Assets/applications.json",
      "Assets/tags.json",
    ],
    databaseTables: ["statistics", "polls", "tickets"],
  },
  {
    id: "staff",
    name: "MinecadiaStaff",
    shortName: "Staff",
    description:
      "Staff guild bot — activity leaderboard, strike workflows, trainer management, and log formatting.",
    accentColor: "#10b981",
    icon: "Users",
    features: [
      "Staff activity leaderboard",
      "Strike report voting workflow",
      "Trainer/trainee management",
      "Punishment request tracking",
      "Log channel auto-formatting",
      "Staff activity export",
    ],
    commands: [
      "/leaderboard",
      "/user-info",
      "/strike-report",
      "/submit-report",
      "/trainer-list",
      "/dump",
      "/wipe",
    ],
    configFiles: ["Assets/config.json"],
    databaseTables: [
      "statistics",
      "strike_reports",
      "strike_votes",
      "trainers",
    ],
  },
  {
    id: "leader",
    name: "MinecadiaLeader",
    shortName: "Leader",
    description:
      "Factions leader ticket bot — faction registration, co-leader management, support requests, and transcripts.",
    accentColor: "#f97316",
    icon: "Crown",
    features: [
      "Faction signup & co-leader management",
      "Kitmap bundle ticket toggle",
      "Support request forms with Telegram alerts",
      "Thread lock/close/rename",
      "Faction registry",
    ],
    commands: [
      "/edit",
      "/toggle-tickets",
      "/request",
      "/lock",
      "/close",
      "/rename",
      "/admin-list",
    ],
    configFiles: ["Assets/config.json", "Cogs/config.json"],
    databaseTables: ["leader_factions", "statistics"],
  },
];

export function getBotById(id: string): BotDefinition | undefined {
  return BOT_REGISTRY.find((b) => b.id === id);
}

export function getAllBots(): BotDefinition[] {
  return BOT_REGISTRY;
}
