/**
 * SQL aliases for dashboard queries after the 20260605 schema migration.
 * App/API types still use legacy camelCase field names on tickets & blacklists.
 */

export const TICKET_COLUMNS = `
  channel_id AS channelID,
  owner_id AS ownerID,
  type,
  name,
  number,
  is_active AS active,
  opened_at,
  closed_at,
  closed_by_id AS closed_by,
  reason,
  transcript,
  privated`;

export const TICKET_OPEN_SQL = "is_active = 1";
export const TICKET_CLOSED_SQL = "is_active = 0";

export const TICKET_VALID_CLOSED_SQL =
  "closed_at IS NOT NULL AND closed_at > 0 AND closed_at >= opened_at";

/** Elapsed seconds from open to close; negative when closed_at < opened_at. */
export const TICKET_CLOSE_DURATION_SEC_SQL = `TIMESTAMPDIFF(SECOND,
  FROM_UNIXTIME(CAST(opened_at AS UNSIGNED)),
  FROM_UNIXTIME(CAST(closed_at AS UNSIGNED)))`;

export const LEVELING_ACTIVE_SQL = "is_active = 1";
export const LEVELING_EVER_PLAYED_SQL = "ever_played = 1";

export const LEVELING_COLUMNS = `
  user_id,
  xp,
  level,
  is_active AS active,
  ever_played`;

/** Exclude synthetic test session row on `games`. */
export const GAMES_NOT_TEST_SQL = "id != -999999";

export const GAMES_SESSION_COLUMNS = `
  id AS game_id,
  name AS game_name,
  refreshed_at,
  is_dm AS dm_game`;

export const GAMES_DM_SQL = "is_dm = 1";
export const GAMES_CHAT_SQL = "is_dm = 0";

export const BLACKLIST_COLUMNS = `
  user_id AS userID,
  staff_id AS staffID,
  reason,
  unblacklist_at AS whenToUnbl,
  created_at`;
