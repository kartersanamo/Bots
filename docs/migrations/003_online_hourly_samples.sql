-- Hourly guild online/member samples for peak-hours charts.
-- Append-only; one row per sample (bot records every hour).

CREATE TABLE IF NOT EXISTS analytics_online_samples (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  recorded_at INT UNSIGNED NOT NULL,
  member_count INT UNSIGNED NOT NULL,
  online_count INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_online_samples_ts (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
