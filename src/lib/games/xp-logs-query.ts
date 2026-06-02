export type XpLogsSortField =
  | "timestamp"
  | "xp"
  | "user_id"
  | "source"
  | "game_id";

export type SortDirection = "asc" | "desc";

export interface ListXpLogsOptions {
  page?: number;
  limit?: number;
  userId?: string;
  /** Exact match on source */
  source?: string;
  /** Case-sensitive LIKE %term% */
  sourceContains?: string;
  gameId?: string;
  minXp?: number;
  maxXp?: number;
  /** Unix seconds (inclusive) */
  since?: number;
  /** Unix seconds (inclusive) */
  until?: number;
  sortBy?: XpLogsSortField;
  sortDir?: SortDirection;
}

const SORT_SQL: Record<XpLogsSortField, string> = {
  timestamp: "CAST(timestamp AS UNSIGNED)",
  xp: "CAST(xp AS SIGNED)",
  user_id: "user_id",
  source: "source",
  game_id: "CAST(game_id AS UNSIGNED)",
};

export function xpLogsOrderClause(
  sortBy: XpLogsSortField = "timestamp",
  sortDir: SortDirection = "desc"
): string {
  const col = SORT_SQL[sortBy] ?? SORT_SQL.timestamp;
  const dir = sortDir === "asc" ? "ASC" : "DESC";
  return `${col} ${dir}, game_id DESC`;
}

export function buildXpLogsWhere(opts: ListXpLogsOptions): {
  conditions: string[];
  params: (string | number)[];
} {
  const conditions = ["game_id != -999999"];
  const params: (string | number)[] = [];

  if (opts.userId?.trim()) {
    conditions.push("user_id = ?");
    params.push(opts.userId.trim());
  }
  if (opts.source?.trim()) {
    conditions.push("TRIM(source) = ?");
    params.push(opts.source.trim());
  } else if (opts.sourceContains?.trim()) {
    conditions.push("TRIM(source) LIKE ?");
    params.push(`%${opts.sourceContains.trim()}%`);
  }
  if (opts.gameId?.trim()) {
    conditions.push("game_id = ?");
    params.push(Number(opts.gameId.trim()));
  }
  if (opts.minXp != null && Number.isFinite(opts.minXp)) {
    conditions.push("CAST(xp AS SIGNED) >= ?");
    params.push(opts.minXp);
  }
  if (opts.maxXp != null && Number.isFinite(opts.maxXp)) {
    conditions.push("CAST(xp AS SIGNED) <= ?");
    params.push(opts.maxXp);
  }
  if (opts.since != null && Number.isFinite(opts.since)) {
    conditions.push("CAST(timestamp AS UNSIGNED) >= ?");
    params.push(opts.since);
  }
  if (opts.until != null && Number.isFinite(opts.until)) {
    conditions.push("CAST(timestamp AS UNSIGNED) <= ?");
    params.push(opts.until);
  }

  return { conditions, params };
}

export function parseXpLogsSortField(raw: string | null): XpLogsSortField {
  const allowed: XpLogsSortField[] = [
    "timestamp",
    "xp",
    "user_id",
    "source",
    "game_id",
  ];
  return allowed.includes(raw as XpLogsSortField)
    ? (raw as XpLogsSortField)
    : "timestamp";
}

export function parseSortDirection(raw: string | null): SortDirection {
  return raw === "asc" ? "asc" : "desc";
}
