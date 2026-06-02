export interface LevelingRow {
  user_id: string;
  xp: number;
  level: number;
  active: number | string;
  ever_played: number | string;
}

export interface XpLogRow {
  game_id: number | string;
  user_id: string;
  xp: number;
  channel_id: string | null;
  source: string | null;
  timestamp: string | null;
}

export interface GameSessionRow {
  game_id: number;
  game_name: string;
  refreshed_at: string | null;
  dm_game: number | string | null;
  status?: string | null;
}

export interface DailyClaimRow {
  user_id: string;
  last_claimed: string | null;
  streak: number;
}

export interface CountingServerRow {
  guild_id: string;
  last_number: number;
  total_counts?: number;
  highest_count?: number;
}

export interface CountingUserRow {
  user_id: string;
  total_counts: number;
  highest_count: number;
  mistakes: number;
}

export interface UserAchievementRow {
  user_id: string;
  achievement_id: string;
  earned_at: string | null;
}

export interface GamesOverview {
  activePlayers: number;
  everPlayed: number;
  openSessions: number;
  totalXpLogs: number;
}

export const ALL_TIME_LEADERBOARD_TYPES = [
  { id: "all_time_xp", label: "Total XP" },
  { id: "all_time_level", label: "Highest level" },
  { id: "trivia_wins", label: "Trivia wins" },
  { id: "math_quiz_wins", label: "Math quiz wins" },
  { id: "flag_guesser_wins", label: "Flag guesser wins" },
  { id: "unscramble_wins", label: "Unscramble wins" },
  { id: "emoji_quiz_wins", label: "Emoji quiz wins" },
  { id: "tictactoe_wins", label: "Tic-tac-toe wins" },
  { id: "wordle_wins", label: "Wordle wins" },
  { id: "connect_four_wins", label: "Connect four wins" },
  { id: "memory_wins", label: "Memory wins" },
  { id: "2048_wins", label: "2048 wins" },
  { id: "minesweeper_wins", label: "Minesweeper wins" },
  { id: "hangman_wins", label: "Hangman wins" },
  { id: "2048_best_score", label: "2048 best score" },
] as const;

export type AllTimeLeaderboardType =
  (typeof ALL_TIME_LEADERBOARD_TYPES)[number]["id"];

/** Extra leaderboards shown on analytics (monthly / misc tables). */
export const EXTRA_GAMES_LEADERBOARD_TYPES = [
  { id: "monthly_level", label: "Monthly level" },
  { id: "monthly_xp", label: "Monthly XP" },
  { id: "achievements_earned", label: "Achievements earned" },
  { id: "daily_streak", label: "Daily reward streak" },
  { id: "counting_counts", label: "Counting — numbers posted" },
  { id: "distinct_games_played", label: "Distinct games played" },
] as const;

export type ExtraGamesLeaderboardType =
  (typeof EXTRA_GAMES_LEADERBOARD_TYPES)[number]["id"];

export type GamesLeaderboardType =
  | AllTimeLeaderboardType
  | ExtraGamesLeaderboardType;

export interface GamesLeaderboardCatalogItem {
  id: GamesLeaderboardType;
  label: string;
  description: string;
  emoji: string;
  valueLabel: string;
  /** Shown in analytics ? tooltip — not reset by monthly wipe. */
  period: "all_time" | "monthly" | "live";
}

export const GAMES_LEADERBOARD_CATALOG: GamesLeaderboardCatalogItem[] = [
  {
    id: "all_time_xp",
    label: "All Time XP",
    description: "Total XP earned across all time (sum of xp_logs).",
    emoji: "💰",
    valueLabel: "XP",
    period: "all_time",
  },
  {
    id: "all_time_level",
    label: "All Time Level",
    description:
      "Ranked by lifetime XP; level is derived from total XP (same as the bot leaderboard).",
    emoji: "⭐",
    valueLabel: "XP",
    period: "all_time",
  },
  {
    id: "monthly_level",
    label: "Monthly Level",
    description:
      "Current monthly leveling leaderboard (resets when staff run /wipe-levels).",
    emoji: "📅",
    valueLabel: "Level",
    period: "monthly",
  },
  {
    id: "monthly_xp",
    label: "Monthly XP",
    description: "XP in the current monthly period from the leveling table.",
    emoji: "📈",
    valueLabel: "XP",
    period: "monthly",
  },
  {
    id: "trivia_wins",
    label: "Trivia Wins",
    description: "Total Trivia chat games won (xp_logs source = Trivia).",
    emoji: "❓",
    valueLabel: "Wins",
    period: "all_time",
  },
  {
    id: "math_quiz_wins",
    label: "Math Quiz Wins",
    description: "Total Math Quiz chat games won.",
    emoji: "➕",
    valueLabel: "Wins",
    period: "all_time",
  },
  {
    id: "flag_guesser_wins",
    label: "Flag Guesser Wins",
    description: "Total Flag Guesser chat games won.",
    emoji: "🏳️",
    valueLabel: "Wins",
    period: "all_time",
  },
  {
    id: "unscramble_wins",
    label: "Unscramble Wins",
    description: "Total Unscramble chat games won.",
    emoji: "🔤",
    valueLabel: "Wins",
    period: "all_time",
  },
  {
    id: "emoji_quiz_wins",
    label: "Emoji Quiz Wins",
    description: "Total Emoji Quiz chat games won.",
    emoji: "😀",
    valueLabel: "Wins",
    period: "all_time",
  },
  {
    id: "wordle_wins",
    label: "Wordle Wins",
    description: "DM Wordle games won (users_wordle).",
    emoji: "🟩",
    valueLabel: "Wins",
    period: "all_time",
  },
  {
    id: "hangman_wins",
    label: "Hangman Wins",
    description: "DM Hangman games won.",
    emoji: "🎯",
    valueLabel: "Wins",
    period: "all_time",
  },
  {
    id: "tictactoe_wins",
    label: "Tic-Tac-Toe Wins",
    description: "DM Tic-Tac-Toe games won.",
    emoji: "❌",
    valueLabel: "Wins",
    period: "all_time",
  },
  {
    id: "connect_four_wins",
    label: "Connect Four Wins",
    description: "DM Connect Four games won.",
    emoji: "🔴",
    valueLabel: "Wins",
    period: "all_time",
  },
  {
    id: "memory_wins",
    label: "Memory Wins",
    description: "DM Memory games won.",
    emoji: "🧠",
    valueLabel: "Wins",
    period: "all_time",
  },
  {
    id: "minesweeper_wins",
    label: "Minesweeper Wins",
    description: "DM Minesweeper games won.",
    emoji: "💣",
    valueLabel: "Wins",
    period: "all_time",
  },
  {
    id: "2048_wins",
    label: "2048 Wins",
    description: "DM 2048 games won.",
    emoji: "🔢",
    valueLabel: "Wins",
    period: "all_time",
  },
  {
    id: "2048_best_score",
    label: "2048 Best Score",
    description: "Highest 2048 score achieved (best single game).",
    emoji: "🏆",
    valueLabel: "Score",
    period: "all_time",
  },
  {
    id: "achievements_earned",
    label: "Achievements",
    description: "Total milestones / achievements unlocked per player.",
    emoji: "🎖️",
    valueLabel: "Achievements",
    period: "all_time",
  },
  {
    id: "daily_streak",
    label: "Daily Streak",
    description: "Longest current /daily claim streak (daily_claims).",
    emoji: "🔥",
    valueLabel: "Days",
    period: "live",
  },
  {
    id: "counting_counts",
    label: "Counting",
    description: "Successful counting numbers posted in the counting channel.",
    emoji: "🔢",
    valueLabel: "Counts",
    period: "all_time",
  },
  {
    id: "distinct_games_played",
    label: "Games Played",
    description: "Distinct game sessions participated in (unique game_id in xp_logs).",
    emoji: "🎮",
    valueLabel: "Games",
    period: "all_time",
  },
];

export interface LeaderboardEntry {
  userId: string;
  value: number;
  rank: number;
  extra?: string;
}
