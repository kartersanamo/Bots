/** Maps games.game_name to DM participant table metadata */
export const DM_GAME_TABLES: Record<
  string,
  {
    table: string;
    statusCol: string;
    columns: string[];
  }
> = {
  tictactoe: {
    table: "users_tictactoe",
    statusCol: "won",
    columns: ["user_id", "won", "started_at", "ended_at"],
  },
  tic_tac_toe: {
    table: "users_tictactoe",
    statusCol: "won",
    columns: ["user_id", "won", "started_at", "ended_at"],
  },
  wordle: {
    table: "users_wordle",
    statusCol: "won",
    columns: ["user_id", "won", "word", "attempts", "started_at", "ended_at"],
  },
  connectfour: {
    table: "users_connectfour",
    statusCol: "status",
    columns: ["user_id", "status", "moves", "started_at", "ended_at"],
  },
  connect_four: {
    table: "users_connectfour",
    statusCol: "status",
    columns: ["user_id", "status", "moves", "started_at", "ended_at"],
  },
  memory: {
    table: "users_memory",
    statusCol: "won",
    columns: ["user_id", "won", "attempts", "started_at", "ended_at"],
  },
  "2048": {
    table: "users_2048",
    statusCol: "status",
    columns: ["user_id", "status", "score", "moves", "started_at", "ended_at"],
  },
  minesweeper: {
    table: "users_minesweeper",
    statusCol: "won",
    columns: ["user_id", "won", "started_at", "ended_at"],
  },
  hangman: {
    table: "users_hangman",
    statusCol: "won",
    columns: ["user_id", "won", "started_at", "ended_at"],
  },
};

export function dmTableForGameName(gameName: string) {
  const key = gameName.toLowerCase().replace(/\s+/g, "");
  if (DM_GAME_TABLES[key]) return DM_GAME_TABLES[key];
  const underscored = gameName.toLowerCase().replace(/\s+/g, "_");
  return DM_GAME_TABLES[underscored] ?? null;
}
