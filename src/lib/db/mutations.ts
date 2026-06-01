import { writeQuery, isWriteDbConfigured } from "@/lib/db/write-pool";
import { queryOne, isDbConfigured } from "@/lib/db/pool";

export function assertWriteDb() {
  if (!isWriteDbConfigured()) {
    throw new Error("Database write not configured (set DB_WRITE_USER or use DB_USER)");
  }
}

/** Close ticket in DB */
export async function closeTicket(channelId: string, closedBy: string) {
  assertWriteDb();
  await writeQuery(
    `UPDATE tickets SET active = 'False', closed_by = ?, closed_at = UNIX_TIMESTAMP()
     WHERE channelID = ?`,
    [closedBy, channelId]
  );
}

export async function setTicketActive(channelId: string, active: boolean) {
  assertWriteDb();
  await writeQuery(`UPDATE tickets SET active = ? WHERE channelID = ?`, [
    active ? "True" : "False",
    channelId,
  ]);
}

export async function addBlacklist(
  userId: string,
  reason: string,
  expiresAt: number | null,
  staffId: string
) {
  assertWriteDb();
  const whenToUnbl =
    expiresAt != null ? String(expiresAt) : "";
  await writeQuery(
    `INSERT INTO blacklists (userID, reason, staffID, whenToUnbl)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE reason = ?, staffID = ?, whenToUnbl = ?`,
    [userId, reason, staffId, whenToUnbl, reason, staffId, whenToUnbl]
  );
}

export async function removeBlacklist(userId: string) {
  assertWriteDb();
  await writeQuery(`DELETE FROM blacklists WHERE userID = ?`, [userId]);
}

export async function setBanAppeal(userId: string, canAppeal: boolean) {
  assertWriteDb();
  await writeQuery(`UPDATE bans SET can_appeal = ? WHERE user_id = ?`, [
    canAppeal ? 1 : 0,
    userId,
  ]);
}

export async function removeBanRecord(userId: string) {
  assertWriteDb();
  await writeQuery(`DELETE FROM bans WHERE user_id = ?`, [userId]);
}

export async function setLevelingXp(userId: string, xp: number, level: number) {
  assertWriteDb();
  await writeQuery(
    `INSERT INTO leveling (user_id, xp, level) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE xp = ?, level = ?`,
    [userId, xp, level, xp, level]
  );
}

export async function addLevelingXp(userId: string, amount: number) {
  if (!isDbConfigured()) throw new Error("Database not configured");
  const row = await queryOne<{ xp: number; level: number }>(
    `SELECT xp, level FROM leveling WHERE user_id = ?`,
    [userId]
  );
  const xp = (row?.xp ?? 0) + amount;
  const level = row?.level ?? 1;
  await setLevelingXp(userId, xp, level);
  return { xp, level };
}

export async function closePoll(pollId: string | number) {
  assertWriteDb();
  await writeQuery(`UPDATE polls SET active = 0 WHERE id = ?`, [pollId]);
}

export async function updateFaction(
  factionId: number,
  data: { name?: string; leader_id?: string; channel_id?: string }
) {
  assertWriteDb();
  const sets: string[] = [];
  const vals: (string | number)[] = [];
  if (data.name !== undefined) {
    sets.push("name = ?");
    vals.push(data.name);
  }
  if (data.leader_id !== undefined) {
    sets.push("leader_id = ?");
    vals.push(data.leader_id);
  }
  if (data.channel_id !== undefined) {
    sets.push("channel_id = ?");
    vals.push(data.channel_id);
  }
  if (!sets.length) return;
  vals.push(factionId);
  await writeQuery(
    `UPDATE leader_factions SET ${sets.join(", ")} WHERE id = ?`,
    vals
  );
}

export async function deleteFaction(factionId: number) {
  assertWriteDb();
  await writeQuery(`DELETE FROM leader_factions WHERE id = ?`, [factionId]);
}

export async function adjustStatistics(
  userId: string,
  field: string,
  delta: number
) {
  assertWriteDb();
  const allowed = [
    "tickets_closed",
    "messages",
    "warnings",
    "screenshares",
  ];
  if (!allowed.includes(field)) {
    throw new Error("Invalid statistics field");
  }
  await writeQuery(
    `INSERT INTO statistics (user_id, ${field}) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE ${field} = ${field} + ?`,
    [userId, delta, delta]
  );
}
