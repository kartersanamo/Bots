#!/usr/bin/env node
/**
 * Apply a one-off SQL file against the analytics database, then delete the file.
 * Usage: node scripts/apply-analytics-migration.mjs .tmp/migration.sql
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

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
  const sqlPath = process.argv[2];
  if (!sqlPath) {
    console.error("Usage: node scripts/apply-analytics-migration.mjs <path.sql>");
    process.exit(1);
  }
  const abs = path.resolve(sqlPath);
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    process.exit(1);
  }

  loadEnv();
  const user = env("DB_WRITE_USER") || env("DB_USER");
  const password = env("DB_WRITE_PASSWORD") || env("DB_PASSWORD");
  const host = env("DB_HOST") || "localhost";
  const database = env("DB_NAME");
  if (!user || !database) {
    console.error("DB_* env required");
    process.exit(1);
  }

  const sql = fs.readFileSync(abs, "utf8");
  const pool = await mysql.createPool({
    host,
    port: Number(env("DB_PORT") || "3306"),
    user,
    password,
    database,
    connectionLimit: 1,
    multipleStatements: true,
  });

  try {
    await pool.query(sql);
    console.log(`[migration] applied ${abs}`);
    fs.unlinkSync(abs);
    console.log("[migration] deleted SQL file");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
