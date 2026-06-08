#!/usr/bin/env node
/**
 * Wipe inflated member-message rollups and backfill progress so a deduped
 * backfill can rebuild counts from Discord history.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const WORK_FILE = "/tmp/backfill-member-messages-work.json";

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = val.replace(/\r/g, "");
  }
}

function env(key) {
  return (process.env[key] || "").replace(/\r/g, "").trim();
}

async function main() {
  loadEnv();
  const user = env("DB_WRITE_USER") || env("DB_USER");
  const password = env("DB_WRITE_PASSWORD") || env("DB_PASSWORD");
  const host = env("DB_HOST") || "localhost";
  const database = env("DB_NAME");
  if (!user || !database) {
    console.error("DB_* env required");
    process.exit(1);
  }

  const pool = await mysql.createPool({
    host,
    port: Number(env("DB_PORT") || "3306"),
    user,
    password,
    database,
    connectionLimit: 1,
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_member_messages_seen (
        message_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
        recorded_at BIGINT UNSIGNED NOT NULL DEFAULT 0,
        KEY idx_member_messages_seen_at (recorded_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const [before] = await pool.query(
      `SELECT SUM(message_count) AS total FROM analytics_member_messages_daily`
    );
    console.log(
      `[reset] clearing rollups (was ${before[0]?.total ?? 0} total message_count)`
    );

    await pool.query(`TRUNCATE TABLE analytics_member_messages_daily`);
    await pool.query(`TRUNCATE TABLE analytics_member_messages_seen`);

    for (const col of ["messages_counted", "messages_skipped_dup"]) {
      try {
        await pool.query(
          `ALTER TABLE analytics_member_messages_backfill ADD COLUMN ${col} BIGINT NOT NULL DEFAULT 0`
        );
      } catch {
        /* already exists */
      }
    }

    await pool.query(`
      INSERT INTO analytics_member_messages_backfill (id, status) VALUES (1, 'idle')
      ON DUPLICATE KEY UPDATE
        status = 'idle',
        channels_total = 0,
        channels_done = 0,
        current_channel_id = NULL,
        current_channel_name = NULL,
        messages_scanned = 0,
        rows_upserted = 0,
        messages_counted = 0,
        messages_skipped_dup = 0,
        error_message = 'Reset for deduped rebuild',
        started_at = NULL,
        updated_at = UNIX_TIMESTAMP()
    `);

    try {
      fs.unlinkSync(WORK_FILE);
      console.log("[reset] removed work queue file");
    } catch {
      /* ignore */
    }

    console.log("[reset] done — run npm run backfill:member-messages to rebuild");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
