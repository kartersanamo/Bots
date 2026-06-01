-- Minecadia analytics tracking (approved metrics #1–#10)
-- Run once against the shared bots MySQL database.

-- #7: Blacklist creation time (backfill optional)
ALTER TABLE blacklists
  ADD COLUMN IF NOT EXISTS created_at INT UNSIGNED NULL DEFAULT NULL;

-- #8: Poll creation time (if missing)
ALTER TABLE polls
  ADD COLUMN IF NOT EXISTS created_at INT UNSIGNED NULL DEFAULT NULL;

-- #1: Staff messages (daily rollup per user + channel)
CREATE TABLE IF NOT EXISTS analytics_staff_messages_daily (
  day DATE NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  channel_id VARCHAR(32) NOT NULL DEFAULT '',
  message_count INT UNSIGNED NOT NULL DEFAULT 0,
  character_count INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (day, user_id, channel_id),
  KEY idx_staff_msg_day (day),
  KEY idx_staff_msg_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- #2: Ticket channel messages (staff vs owner, daily per ticket channel)
CREATE TABLE IF NOT EXISTS analytics_ticket_messages_daily (
  day DATE NOT NULL,
  channel_id VARCHAR(32) NOT NULL,
  staff_messages INT UNSIGNED NOT NULL DEFAULT 0,
  owner_messages INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (day, channel_id),
  KEY idx_ticket_msg_day (day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- #3: Member join / leave events
CREATE TABLE IF NOT EXISTS analytics_member_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_type ENUM('join', 'leave') NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  invite_code VARCHAR(64) NULL,
  account_age_days INT UNSIGNED NULL,
  created_at INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_member_events_ts (created_at),
  KEY idx_member_events_type_ts (event_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- #4: Voice time (daily rollup per user + channel)
CREATE TABLE IF NOT EXISTS analytics_voice_daily (
  day DATE NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  channel_id VARCHAR(32) NOT NULL,
  seconds INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (day, user_id, channel_id),
  KEY idx_voice_day (day),
  KEY idx_voice_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- #5: Slash / bot command usage (daily)
CREATE TABLE IF NOT EXISTS analytics_command_daily (
  day DATE NOT NULL,
  command_name VARCHAR(128) NOT NULL,
  bot_id VARCHAR(32) NOT NULL,
  invocations INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (day, command_name, bot_id),
  KEY idx_command_day (day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- #6: Moderation actions (one row per action)
CREATE TABLE IF NOT EXISTS analytics_mod_actions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  action_type VARCHAR(32) NOT NULL,
  actor_id VARCHAR(32) NOT NULL,
  target_id VARCHAR(32) NOT NULL,
  reason VARCHAR(512) NULL,
  duration_seconds INT UNSIGNED NULL,
  channel_id VARCHAR(32) NULL,
  created_at INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_mod_actions_ts (created_at),
  KEY idx_mod_actions_type_ts (action_type, created_at),
  KEY idx_mod_actions_actor (actor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- #8: Individual poll votes
CREATE TABLE IF NOT EXISTS analytics_poll_votes (
  poll_message_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  option_index TINYINT UNSIGNED NOT NULL,
  voted_at INT UNSIGNED NOT NULL,
  PRIMARY KEY (poll_message_id, user_id),
  KEY idx_poll_votes_ts (voted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- #9: Game session outcomes
CREATE TABLE IF NOT EXISTS analytics_game_outcomes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  game_name VARCHAR(64) NOT NULL,
  user_id VARCHAR(32) NULL,
  game_id INT NULL,
  outcome ENUM('won', 'lost', 'abandoned', 'draw', 'finished') NOT NULL DEFAULT 'finished',
  duration_seconds INT UNSIGNED NULL,
  ended_at INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_game_outcomes_ts (ended_at),
  KEY idx_game_outcomes_name_ts (game_name, ended_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- #10: Daily server snapshot
CREATE TABLE IF NOT EXISTS analytics_server_snapshots (
  day DATE NOT NULL,
  member_count INT UNSIGNED NOT NULL,
  online_count INT UNSIGNED NOT NULL,
  boost_tier TINYINT UNSIGNED NOT NULL DEFAULT 0,
  boost_count INT UNSIGNED NOT NULL DEFAULT 0,
  recorded_at INT UNSIGNED NOT NULL,
  PRIMARY KEY (day),
  KEY idx_snapshots_recorded (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
