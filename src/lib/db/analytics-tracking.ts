import { writeQuery, isWriteDbConfigured } from "@/lib/db/write-pool";

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function recordModAction(params: {
  actionType: string;
  actorId: string;
  targetId: string;
  reason?: string;
  durationSeconds?: number;
  channelId?: string;
}): Promise<void> {
  if (!isWriteDbConfigured()) return;
  await writeQuery(
    `INSERT INTO analytics_mod_actions
     (action_type, actor_id, target_id, reason, duration_seconds, channel_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      params.actionType.slice(0, 32),
      params.actorId,
      params.targetId,
      params.reason?.slice(0, 512) ?? null,
      params.durationSeconds ?? null,
      params.channelId ?? null,
      nowUnix(),
    ]
  );
}

export async function recordStaffMessageDaily(params: {
  userId: string;
  channelId: string;
  charCount?: number;
}): Promise<void> {
  if (!isWriteDbConfigured()) return;
  const chars = params.charCount ?? 0;
  await writeQuery(
    `INSERT INTO analytics_staff_messages_daily
     (day, user_id, channel_id, message_count, character_count)
     VALUES (?, ?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE
       message_count = message_count + 1,
       character_count = character_count + ?`,
    [todayIso(), params.userId, params.channelId, chars, chars]
  );
}
