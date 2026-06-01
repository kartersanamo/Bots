import { query } from "@/lib/db/pool";

const TRACKING_TABLES = [
  { key: "staffMessages", table: "analytics_staff_messages_daily" },
  { key: "ticketMessages", table: "analytics_ticket_messages_daily" },
  { key: "memberEvents", table: "analytics_member_events" },
  { key: "voice", table: "analytics_voice_daily" },
  { key: "commands", table: "analytics_command_daily" },
  { key: "moderation", table: "analytics_mod_actions" },
  { key: "pollVotes", table: "analytics_poll_votes" },
  { key: "gameOutcomes", table: "analytics_game_outcomes" },
  { key: "snapshots", table: "analytics_server_snapshots" },
] as const;

let cached: { at: number; status: Record<string, boolean> } | null = null;
const CACHE_MS = 60_000;

/** One query — avoids per-table information_schema races. */
export async function getAnalyticsTrackingTableStatus(): Promise<
  Record<string, boolean>
> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.status;

  const expected = new Set(
    TRACKING_TABLES.map((t) => t.table.toLowerCase())
  );
  const found = new Set<string>();

  try {
    const rows = await query<{ name: string }>(
      `SELECT table_name AS name FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name LIKE 'analytics\\_%'`
    );
    for (const row of rows) {
      found.add(String(row.name).toLowerCase());
    }
  } catch {
    try {
      const rows = await query<Record<string, string>>("SHOW TABLES");
      for (const row of rows) {
        const name = Object.values(row)[0];
        if (name) found.add(String(name).toLowerCase());
      }
    } catch {
      /* DB unavailable */
    }
  }

  const status: Record<string, boolean> = {};
  for (const { key, table } of TRACKING_TABLES) {
    status[key] = found.has(table.toLowerCase());
  }

  cached = { at: Date.now(), status };
  return status;
}

export function allTrackingTablesReady(
  status: Record<string, boolean>
): boolean {
  return TRACKING_TABLES.every(({ key }) => status[key] === true);
}
