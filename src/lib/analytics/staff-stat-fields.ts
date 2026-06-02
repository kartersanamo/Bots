/** Tracked counters on `statistics` / `total_statistics` (MinecadiaStaff). */
export const STAFF_STAT_FIELDS = [
  {
    key: "ticketsClosed",
    column: "tickets_closed",
    label: "Tickets Closed",
    hintId: "tickets",
  },
  {
    key: "messages",
    column: "messages_sent",
    label: "Messages Sent",
    hintId: "messages",
  },
  {
    key: "warnings",
    column: "warnings",
    label: "Warnings",
    hintId: "warnings",
  },
  {
    key: "mutes",
    column: "mutes",
    label: "Mutes",
    hintId: "mutes",
  },
  {
    key: "tempBans",
    column: "temp_bans",
    label: "Temp Bans",
    hintId: "tempBans",
  },
  {
    key: "bans",
    column: "bans",
    label: "Bans",
    hintId: "bans",
  },
  {
    key: "screenshares",
    column: "screenshares",
    label: "Screenshares",
    hintId: "screenshares",
  },
  {
    key: "manualBans",
    column: "manual_bans",
    label: "Manual Bans",
    hintId: "manualBans",
  },
  {
    key: "blacklists",
    column: "blacklists",
    label: "Blacklists",
    hintId: "blacklists",
  },
  {
    key: "revives",
    column: "revives",
    label: "Revives",
    hintId: "revives",
  },
  {
    key: "appeals",
    column: "appeals",
    label: "Appeals",
    hintId: "appeals",
  },
  {
    key: "threadsLocked",
    column: "threads_locked",
    label: "Threads Locked",
    hintId: "threadsLocked",
  },
  {
    key: "strikeTeamVotes",
    column: "strike_team_votes",
    label: "Strike Team Votes",
    hintId: "strikeTeamVotes",
  },
  {
    key: "charactersSent",
    column: "characters_sent",
    label: "Characters Sent",
    hintId: "charactersSent",
  },
  {
    key: "punishmentRequests",
    column: "punishment_requests",
    label: "Punishment Requests",
    hintId: "punishmentRequests",
  },
] as const;

export type StaffStatKey = (typeof STAFF_STAT_FIELDS)[number]["key"];

export type StaffStatsRow = {
  userId: string;
} & Record<StaffStatKey, number>;

export const STAFF_STAT_KEYS = STAFF_STAT_FIELDS.map(
  (f) => f.key
) as StaffStatKey[];

export function staffStatSelectList(table: "statistics" | "total_statistics"): string {
  if (table === "statistics") {
    return STAFF_STAT_FIELDS.map(
      (f) =>
        `COALESCE(CAST(${f.column} AS UNSIGNED), 0) AS ${f.key}`
    ).join(",\n            ");
  }
  return STAFF_STAT_FIELDS.map(
    (f) => `COALESCE(t.${f.column}, 0) AS ${f.key}`
  ).join(",\n            ");
}

export function staffStatSumSelectList(): string {
  return STAFF_STAT_FIELDS.map(
    (f) => `COALESCE(SUM(CAST(${f.column} AS UNSIGNED)), 0) AS ${f.key}`
  ).join(",\n    ");
}

export function staffActiveWhereClause(alias = ""): string {
  const p = alias ? `${alias}.` : "";
  return STAFF_STAT_FIELDS.map(
    (f) => `COALESCE(CAST(${p}${f.column} AS UNSIGNED), 0) > 0`
  ).join("\n  OR ");
}

export function emptyStaffStatsRow(userId: string): StaffStatsRow {
  const row = { userId } as StaffStatsRow;
  for (const f of STAFF_STAT_FIELDS) {
    row[f.key] = 0;
  }
  return row;
}

export function mapStaffStatsRow(
  userId: string,
  raw: Record<string, unknown>
): StaffStatsRow {
  const row = emptyStaffStatsRow(userId);
  for (const f of STAFF_STAT_FIELDS) {
    row[f.key] = Number(raw[f.key] ?? 0);
  }
  return row;
}

export function sumStaffStatsRows(rows: StaffStatsRow[]): Record<StaffStatKey, number> {
  const totals = {} as Record<StaffStatKey, number>;
  for (const f of STAFF_STAT_FIELDS) {
    totals[f.key] = rows.reduce((sum, r) => sum + r[f.key], 0);
  }
  return totals;
}

export function staffActivityTotal(r: StaffStatsRow): number {
  return STAFF_STAT_KEYS.reduce((sum, key) => sum + r[key], 0);
}
