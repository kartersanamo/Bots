#!/usr/bin/env node
/**
 * Applies docs/migrations/001_analytics_tracking.sql
 * Usage: node scripts/apply-analytics-migration.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const envPath = path.join(root, ".env");
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
    if (!process.env[key]) process.env[key] = val.replace(/\r/g, "").trim();
  }
}

loadEnv();

const sqlPath = path.join(
  root,
  "docs/migrations/001_analytics_tracking.sql"
);

async function main() {
  const host = (process.env.DB_HOST || "").replace(/\r/g, "").trim();
  const user = (process.env.DB_WRITE_USER || process.env.DB_USER || "")
    .replace(/\r/g, "")
    .trim();
  const password = (
    process.env.DB_WRITE_PASSWORD ||
    process.env.DB_PASSWORD ||
    ""
  )
    .replace(/\r/g, "")
    .trim();
  const database = (process.env.DB_NAME || "").replace(/\r/g, "").trim();

  if (!host || !user || !database) {
    console.error("Set DB_HOST, DB_USER, DB_NAME in .env");
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host,
    port: Number(process.env.DB_PORT || 3306),
    user,
    password,
    database,
    multipleStatements: true,
  });

  let sql = fs.readFileSync(sqlPath, "utf8");
  sql = sql.replace(/ADD COLUMN IF NOT EXISTS/g, "ADD COLUMN");
  // Drop full-line comments so semicolon-split chunks are not discarded.
  sql = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    try {
      await conn.query(stmt);
      console.log("OK:", stmt.slice(0, 60).replace(/\s+/g, " "), "…");
    } catch (err) {
      const code = err?.code || "";
      if (code === "ER_DUP_FIELDNAME" || code === "ER_TABLE_EXISTS_ERROR") {
        console.log("SKIP (exists):", stmt.slice(0, 50), "…");
      } else {
        console.error("FAIL:", stmt.slice(0, 80));
        throw err;
      }
    }
  }

  await conn.end();
  console.log("Analytics migration complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
