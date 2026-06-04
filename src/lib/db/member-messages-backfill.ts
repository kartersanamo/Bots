import { query } from "@/lib/db/pool";
import { isWriteDbConfigured, writeQuery } from "@/lib/db/write-pool";

export type MemberMessagesBackfillStatus =
  | "idle"
  | "running"
  | "completed"
  | "error";

export interface MemberMessagesBackfillState {
  status: MemberMessagesBackfillStatus;
  channelsTotal: number;
  channelsDone: number;
  currentChannelId: string | null;
  currentChannelName: string | null;
  messagesScanned: number;
  rowsUpserted: number;
  errorMessage: string | null;
  startedAt: number | null;
  updatedAt: number | null;
}

const ENSURE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS analytics_member_messages_backfill (
  id TINYINT NOT NULL PRIMARY KEY DEFAULT 1,
  status VARCHAR(16) NOT NULL DEFAULT 'idle',
  channels_total INT NOT NULL DEFAULT 0,
  channels_done INT NOT NULL DEFAULT 0,
  current_channel_id VARCHAR(32) NULL,
  current_channel_name VARCHAR(255) NULL,
  messages_scanned BIGINT NOT NULL DEFAULT 0,
  rows_upserted BIGINT NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  started_at BIGINT NULL,
  updated_at BIGINT NULL
)`;

function mapRow(
  row: Record<string, unknown> | undefined
): MemberMessagesBackfillState {
  if (!row) {
    return {
      status: "idle",
      channelsTotal: 0,
      channelsDone: 0,
      currentChannelId: null,
      currentChannelName: null,
      messagesScanned: 0,
      rowsUpserted: 0,
      errorMessage: null,
      startedAt: null,
      updatedAt: null,
    };
  }
  return {
    status: String(row.status ?? "idle") as MemberMessagesBackfillStatus,
    channelsTotal: Number(row.channels_total ?? 0),
    channelsDone: Number(row.channels_done ?? 0),
    currentChannelId: row.current_channel_id
      ? String(row.current_channel_id)
      : null,
    currentChannelName: row.current_channel_name
      ? String(row.current_channel_name)
      : null,
    messagesScanned: Number(row.messages_scanned ?? 0),
    rowsUpserted: Number(row.rows_upserted ?? 0),
    errorMessage: row.error_message ? String(row.error_message) : null,
    startedAt:
      row.started_at != null ? Number(row.started_at) : null,
    updatedAt:
      row.updated_at != null ? Number(row.updated_at) : null,
  };
}

export async function ensureMemberMessagesBackfillTable(): Promise<void> {
  if (!isWriteDbConfigured()) return;
  await writeQuery(ENSURE_TABLE_SQL);
}

export async function getMemberMessagesBackfillState(): Promise<MemberMessagesBackfillState> {
  try {
    await ensureMemberMessagesBackfillTable();
    const rows = await query<Record<string, unknown>>(
      `SELECT status, channels_total, channels_done, current_channel_id,
              current_channel_name, messages_scanned, rows_upserted,
              error_message, started_at, updated_at
       FROM analytics_member_messages_backfill WHERE id = 1 LIMIT 1`
    );
    return mapRow(rows[0]);
  } catch {
    return mapRow(undefined);
  }
}
