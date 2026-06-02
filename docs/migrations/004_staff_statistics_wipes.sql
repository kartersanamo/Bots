-- Records each MinecadiaStaff /wipe (statistics period reset).

CREATE TABLE IF NOT EXISTS staff_statistics_wipes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  wiped_at INT UNSIGNED NOT NULL,
  wiped_by_user_id VARCHAR(32) NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_staff_statistics_wipes_at (wiped_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
