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

export interface LeaderboardEntry {
  userId: string;
  value: number;
  rank: number;
  extra?: string;
}
