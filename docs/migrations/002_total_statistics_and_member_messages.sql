-- All-time staff counters (never reset by /wipe) + guild-wide message rollups by day.

CREATE TABLE IF NOT EXISTS total_statistics (
  user_ID VARCHAR(32) NOT NULL,
  tickets_closed INT UNSIGNED NOT NULL DEFAULT 0,
  messages_sent INT UNSIGNED NOT NULL DEFAULT 0,
  warnings INT UNSIGNED NOT NULL DEFAULT 0,
  mutes INT UNSIGNED NOT NULL DEFAULT 0,
  temp_bans INT UNSIGNED NOT NULL DEFAULT 0,
  bans INT UNSIGNED NOT NULL DEFAULT 0,
  screenshares INT UNSIGNED NOT NULL DEFAULT 0,
  manual_bans INT UNSIGNED NOT NULL DEFAULT 0,
  blacklists INT UNSIGNED NOT NULL DEFAULT 0,
  revives INT UNSIGNED NOT NULL DEFAULT 0,
  appeals INT UNSIGNED NOT NULL DEFAULT 0,
  threads_locked INT UNSIGNED NOT NULL DEFAULT 0,
  strike_team_votes INT UNSIGNED NOT NULL DEFAULT 0,
  characters_sent INT UNSIGNED NOT NULL DEFAULT 0,
  punishment_requests INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (user_ID),
  KEY idx_total_statistics_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per user per day (all guild members; efficient range queries).
CREATE TABLE IF NOT EXISTS analytics_member_messages_daily (
  day DATE NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  message_count INT UNSIGNED NOT NULL DEFAULT 0,
  character_count INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (day, user_id),
  KEY idx_member_messages_day (day),
  KEY idx_member_messages_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed all-time totals from current period statistics (one-time; safe to re-run).
INSERT INTO total_statistics (
  user_ID,
  tickets_closed,
  messages_sent,
  warnings,
  mutes,
  temp_bans,
  bans,
  screenshares,
  manual_bans,
  blacklists,
  revives,
  appeals,
  threads_locked,
  strike_team_votes,
  characters_sent,
  punishment_requests,
  updated_at
)
SELECT
  user_ID,
  CAST(COALESCE(tickets_closed, 0) AS UNSIGNED),
  CAST(COALESCE(messages_sent, 0) AS UNSIGNED),
  CAST(COALESCE(warnings, 0) AS UNSIGNED),
  CAST(COALESCE(mutes, 0) AS UNSIGNED),
  CAST(COALESCE(temp_bans, 0) AS UNSIGNED),
  CAST(COALESCE(bans, 0) AS UNSIGNED),
  CAST(COALESCE(screenshares, 0) AS UNSIGNED),
  CAST(COALESCE(manual_bans, 0) AS UNSIGNED),
  CAST(COALESCE(blacklists, 0) AS UNSIGNED),
  CAST(COALESCE(revives, 0) AS UNSIGNED),
  CAST(COALESCE(appeals, 0) AS UNSIGNED),
  CAST(COALESCE(threads_locked, 0) AS UNSIGNED),
  CAST(COALESCE(strike_team_votes, 0) AS UNSIGNED),
  CAST(COALESCE(characters_sent, 0) AS UNSIGNED),
  CAST(COALESCE(punishment_requests, 0) AS UNSIGNED),
  UNIX_TIMESTAMP()
FROM statistics
ON DUPLICATE KEY UPDATE
  tickets_closed = GREATEST(total_statistics.tickets_closed, VALUES(tickets_closed)),
  messages_sent = GREATEST(total_statistics.messages_sent, VALUES(messages_sent)),
  warnings = GREATEST(total_statistics.warnings, VALUES(warnings)),
  mutes = GREATEST(total_statistics.mutes, VALUES(mutes)),
  temp_bans = GREATEST(total_statistics.temp_bans, VALUES(temp_bans)),
  bans = GREATEST(total_statistics.bans, VALUES(bans)),
  screenshares = GREATEST(total_statistics.screenshares, VALUES(screenshares)),
  manual_bans = GREATEST(total_statistics.manual_bans, VALUES(manual_bans)),
  blacklists = GREATEST(total_statistics.blacklists, VALUES(blacklists)),
  revives = GREATEST(total_statistics.revives, VALUES(revives)),
  appeals = GREATEST(total_statistics.appeals, VALUES(appeals)),
  threads_locked = GREATEST(total_statistics.threads_locked, VALUES(threads_locked)),
  strike_team_votes = GREATEST(total_statistics.strike_team_votes, VALUES(strike_team_votes)),
  characters_sent = GREATEST(total_statistics.characters_sent, VALUES(characters_sent)),
  punishment_requests = GREATEST(total_statistics.punishment_requests, VALUES(punishment_requests)),
  updated_at = GREATEST(total_statistics.updated_at, VALUES(updated_at));
