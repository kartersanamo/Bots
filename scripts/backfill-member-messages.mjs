#!/usr/bin/env node
/**
 * Ultra-low-priority guild message backfill. Designed not to starve the VPS.
 *
 * Defaults are very slow. Tune via env (higher = slower/safer):
 *   BACKFILL_PAGE_DELAY_MS=10000
 *   BACKFILL_CHANNEL_DELAY_MS=30000
 *   BACKFILL_LOAD_THRESHOLD=1.5   — pause while 1m load average is above this
 *   BACKFILL_LOAD_PAUSE_MS=120000
 *
 * Run (recommended):
 *   npm run backfill:member-messages
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import process from "node:process";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const WORK_FILE = "/tmp/backfill-member-messages-work.json";

const DISCORD_API = "https://discord.com/api/v10";
const SCANNABLE_TYPES = new Set([0, 5, 10, 11, 12, 15]);

const PAGE_DELAY_MS = Number(process.env.BACKFILL_PAGE_DELAY_MS || "10000");
const CHANNEL_DELAY_MS = Number(process.env.BACKFILL_CHANNEL_DELAY_MS || "30000");
const THREAD_DELAY_MS = Number(process.env.BACKFILL_THREAD_DELAY_MS || "8000");
const YIELD_EVERY_MSG = Number(process.env.BACKFILL_YIELD_EVERY_MSG || "15");
const YIELD_MS = Number(process.env.BACKFILL_YIELD_MS || "150");
const FLUSH_BATCH = Number(process.env.BACKFILL_FLUSH_BATCH || "12");
const FLUSH_DELAY_MS = Number(process.env.BACKFILL_FLUSH_DELAY_MS || "4000");
const MESSAGES_PER_PAGE = Number(process.env.BACKFILL_MESSAGES_PER_PAGE || "50");
const LOAD_THRESHOLD = Number(process.env.BACKFILL_LOAD_THRESHOLD || "1.5");
const LOAD_PAUSE_MS = Number(process.env.BACKFILL_LOAD_PAUSE_MS || "120000");
const MAX_ARCHIVED_THREAD_PAGES = Number(
  process.env.BACKFILL_MAX_ARCHIVED_THREAD_PAGES || "2"
);
const SKIP_ARCHIVED_THREADS =
  (process.env.BACKFILL_SKIP_ARCHIVED_THREADS ?? "1") !== "0";
const SKIP_THREAD_SCAN = (process.env.BACKFILL_SKIP_THREADS ?? "0") === "1";
/** How many channels to process per invocation (0 = all remaining). Default 3 keeps each run tiny. */
const MAX_CHANNELS_PER_RUN = Number(
  process.env.BACKFILL_MAX_CHANNELS_PER_RUN ?? "3"
);
const STATE_EVERY_MS = Number(process.env.BACKFILL_STATE_EVERY_MS || "45000");

let poolRef;
let lastStateWrite = 0;
let stopping = false;

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
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

function envInt(key, fallback) {
  const n = Number(env(key));
  return Number.isFinite(n) ? n : fallback;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function yieldEventLoop() {
  return new Promise((r) => setImmediate(r));
}

async function gentlePause(ms) {
  await yieldEventLoop();
  await sleep(ms);
}

function load1() {
  try {
    const s = fs.readFileSync("/proc/loadavg", "utf8");
    return parseFloat(s.split(/\s+/)[0]) || 0;
  } catch {
    return 0;
  }
}

async function waitForLowLoad(label = "") {
  while (!stopping) {
    const load = load1();
    if (load <= LOAD_THRESHOLD) return;
    console.log(
      `[backfill] load ${load.toFixed(2)} > ${LOAD_THRESHOLD}${label ? ` (${label})` : ""}, pausing ${LOAD_PAUSE_MS / 1000}s…`
    );
    await sleep(LOAD_PAUSE_MS);
  }
}

function applyLowPriority() {
  try {
    if (typeof process.setPriority === "function") {
      process.setPriority(19);
    }
  } catch {
    /* unsupported platform */
  }
  if (process.env.NODE_OPTIONS?.includes("max-old-space-size")) return;
  // Cap heap unless caller already set NODE_OPTIONS (npm script does).
}

function dayFromIso(ts) {
  return String(ts).slice(0, 10);
}

async function discordFetch(url, token, attempt = 0) {
  await waitForLowLoad("before Discord request");
  await gentlePause(200);
  const res = await fetch(url, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (res.status === 429 && attempt < 12) {
    const retry = Number(res.headers.get("retry-after") || "10");
    console.log(`[backfill] rate limited, waiting ${retry + 2}s…`);
    await sleep((retry + 2) * 1000);
    return discordFetch(url, token, attempt + 1);
  }
  return res;
}

async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS analytics_member_messages_backfill (
      id TINYINT NOT NULL PRIMARY KEY DEFAULT 1,
      status VARCHAR(16) NOT NULL DEFAULT 'idle',
      channels_total INT NOT NULL DEFAULT 0,
      channels_done INT NOT NULL DEFAULT 0,
      current_channel_id VARCHAR(32) NULL,
      current_channel_name VARCHAR(255) NULL,
      messages_scanned BIGINT NOT NULL DEFAULT 0,
      rows_upserted BIGINT NOT NULL DEFAULT 0,
      error_message TEXT NULL,
      started_at BIGINT NULL,
      updated_at BIGINT NULL
    )`);
  await pool.query(`
    INSERT IGNORE INTO analytics_member_messages_backfill (id, status) VALUES (1, 'idle')
  `);
}

async function updateState(pool, patch, { force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastStateWrite < STATE_EVERY_MS) return;
  lastStateWrite = now;
  const ts = Math.floor(now / 1000);
  await pool.query(
    `UPDATE analytics_member_messages_backfill SET
      status = COALESCE(?, status),
      channels_total = COALESCE(?, channels_total),
      channels_done = COALESCE(?, channels_done),
      current_channel_id = ?,
      current_channel_name = ?,
      messages_scanned = COALESCE(?, messages_scanned),
      rows_upserted = COALESCE(?, rows_upserted),
      error_message = ?,
      started_at = COALESCE(?, started_at),
      updated_at = ?
     WHERE id = 1`,
    [
      patch.status ?? null,
      patch.channelsTotal ?? null,
      patch.channelsDone ?? null,
      patch.currentChannelId ?? null,
      patch.currentChannelName ?? null,
      patch.messagesScanned ?? null,
      patch.rowsUpserted ?? null,
      patch.errorMessage ?? null,
      patch.startedAt ?? null,
      ts,
    ]
  );
}

async function loadStaffIds(pool) {
  const [rows] = await pool.query(`
    SELECT user_ID FROM statistics WHERE (
      COALESCE(CAST(tickets_closed AS UNSIGNED), 0) > 0 OR
      COALESCE(CAST(messages_sent AS UNSIGNED), 0) > 0 OR
      COALESCE(CAST(warnings AS UNSIGNED), 0) > 0 OR
      COALESCE(CAST(mutes AS UNSIGNED), 0) > 0 OR
      COALESCE(CAST(temp_bans AS UNSIGNED), 0) > 0 OR
      COALESCE(CAST(bans AS UNSIGNED), 0) > 0 OR
      COALESCE(CAST(screenshares AS UNSIGNED), 0) > 0 OR
      COALESCE(CAST(manual_bans AS UNSIGNED), 0) > 0 OR
      COALESCE(CAST(blacklists AS UNSIGNED), 0) > 0 OR
      COALESCE(CAST(revives AS UNSIGNED), 0) > 0 OR
      COALESCE(CAST(appeals AS UNSIGNED), 0) > 0 OR
      COALESCE(CAST(threads_locked AS UNSIGNED), 0) > 0 OR
      COALESCE(CAST(strike_team_votes AS UNSIGNED), 0) > 0 OR
      COALESCE(CAST(characters_sent AS UNSIGNED), 0) > 0 OR
      COALESCE(CAST(punishment_requests AS UNSIGNED), 0) > 0
    )`);
  return new Set(rows.map((r) => String(r.user_ID)));
}

async function flushCounts(pool, counts, stats) {
  const entries = [...counts.entries()];
  if (!entries.length) return;

  for (let i = 0; i < entries.length; i += FLUSH_BATCH) {
    if (stopping) return;
    await waitForLowLoad("before DB flush");
    const slice = entries.slice(i, i + FLUSH_BATCH);
    for (const [key, v] of slice) {
      const [day, userId] = key.split(":");
      await pool.query(
        `INSERT INTO analytics_member_messages_daily
           (day, user_id, message_count, character_count)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           message_count = message_count + VALUES(message_count),
           character_count = character_count + VALUES(character_count)`,
        [day, userId, v.messages, v.chars]
      );
      stats.rowsUpserted += 1;
    }
    await gentlePause(FLUSH_DELAY_MS);
  }
  counts.clear();
}

async function scanChannelMessages(channelId, token, staffIds, counts, stats) {
  let before = undefined;
  let pages = 0;

  while (!stopping) {
    const url = new URL(`${DISCORD_API}/channels/${channelId}/messages`);
    url.searchParams.set("limit", String(Math.min(100, MESSAGES_PER_PAGE)));
    if (before) url.searchParams.set("before", before);
    const res = await discordFetch(url.toString(), token);
    if (res.status === 403 || res.status === 404) {
      console.log(`[backfill] skip ${channelId} (${res.status})`);
      return;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Discord ${res.status} for ${channelId}: ${text.slice(0, 160)}`
      );
    }
    const messages = await res.json();
    if (!Array.isArray(messages) || messages.length === 0) break;

    let processed = 0;
    for (const msg of messages) {
      if (stopping) return;
      const author = msg.author;
      if (!author || author.bot) continue;
      const userId = String(author.id);
      if (staffIds.has(userId)) continue;
      const day = dayFromIso(msg.timestamp);
      const key = `${day}:${userId}`;
      const prev = counts.get(key) || { messages: 0, chars: 0 };
      prev.messages += 1;
      prev.chars += (msg.content || "").length;
      counts.set(key, prev);
      stats.messagesScanned += 1;
      processed += 1;
      if (processed % YIELD_EVERY_MSG === 0) {
        await gentlePause(YIELD_MS);
      }
    }

    before = messages[messages.length - 1].id;
    pages += 1;
    if (messages.length < MESSAGES_PER_PAGE) break;
    await gentlePause(PAGE_DELAY_MS);
    if (pages % 5 === 0) {
      await flushCounts(poolRef, counts, stats);
      await updateState(poolRef, {
        messagesScanned: stats.messagesScanned,
        rowsUpserted: stats.rowsUpserted,
      });
    }
  }
}

async function listActiveThreadIds(channelId, token) {
  const ids = [];
  const activeRes = await discordFetch(
    `${DISCORD_API}/channels/${channelId}/threads/active`,
    token
  );
  if (activeRes.ok) {
    const data = await activeRes.json();
    for (const t of data.threads || []) {
      if (t?.id) ids.push(String(t.id));
    }
  }
  await gentlePause(THREAD_DELAY_MS);
  return ids;
}

async function listArchivedThreadIds(channelId, token) {
  if (SKIP_ARCHIVED_THREADS || MAX_ARCHIVED_THREAD_PAGES <= 0) return [];
  const ids = [];
  let before;
  for (let page = 0; page < MAX_ARCHIVED_THREAD_PAGES && !stopping; page++) {
    const url = new URL(
      `${DISCORD_API}/channels/${channelId}/threads/archived/public`
    );
    url.searchParams.set("limit", "50");
    if (before) url.searchParams.set("before", before);
    const res = await discordFetch(url.toString(), token);
    if (!res.ok) break;
    const data = await res.json();
    const threads = data.threads || [];
    if (!threads.length) break;
    for (const t of threads) {
      if (t?.id) ids.push(String(t.id));
    }
    if (!data.has_more) break;
    before = threads[threads.length - 1]?.id;
    await gentlePause(THREAD_DELAY_MS);
  }
  return ids;
}

function saveWorkQueue(work) {
  fs.writeFileSync(
    WORK_FILE,
    JSON.stringify({ savedAt: Date.now(), work }),
    "utf8"
  );
}

function loadWorkQueue() {
  if (!fs.existsSync(WORK_FILE)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(WORK_FILE, "utf8"));
    return Array.isArray(data.work) ? data.work : null;
  } catch {
    return null;
  }
}

async function buildWorkQueue(guildId, token) {
  const chRes = await discordFetch(
    `${DISCORD_API}/guilds/${guildId}/channels`,
    token
  );
  if (!chRes.ok) throw new Error(`Failed to list channels: ${chRes.status}`);
  const allChannels = await chRes.json();
  const scannable = allChannels
    .filter((c) => SCANNABLE_TYPES.has(Number(c.type)))
    .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));

  const work = [];
  for (const ch of scannable) {
    if (stopping) break;
    await waitForLowLoad("channel discovery");
    work.push({
      id: String(ch.id),
      name: String(ch.name || ch.id),
      type: Number(ch.type),
    });

    if (SKIP_THREAD_SCAN) continue;
    const wantsThreads =
      Number(ch.type) === 0 ||
      Number(ch.type) === 5 ||
      Number(ch.type) === 15;
    if (!wantsThreads) continue;

    const threadIds = [
      ...(await listActiveThreadIds(ch.id, token)),
      ...(await listArchivedThreadIds(ch.id, token)),
    ];
    const unique = [...new Set(threadIds)];
    for (const tid of unique) {
      work.push({
        id: tid,
        name: `thread:${ch.name}`,
        type: 11,
      });
    }
    await gentlePause(THREAD_DELAY_MS);
  }

  return work;
}

function setupSignalHandlers(pool, counts, stats) {
  const stop = async (signal) => {
    if (stopping) return;
    stopping = true;
    console.log(`[backfill] ${signal} — stopping gently…`);
    try {
      await flushCounts(pool, counts, stats);
      await updateState(
        pool,
        {
          status: "idle",
          errorMessage: `Stopped (${signal})`,
          messagesScanned: stats.messagesScanned,
          rowsUpserted: stats.rowsUpserted,
        },
        { force: true }
      );
    } catch {
      /* ignore */
    }
    await pool.end().catch(() => {});
    process.exit(signal === "SIGINT" ? 130 : 0);
  };
  process.on("SIGINT", () => void stop("SIGINT"));
  process.on("SIGTERM", () => void stop("SIGTERM"));
}

async function main() {
  loadEnv();
  applyLowPriority();

  const token = env("DISCORD_BOT_TOKEN");
  const guildId = env("DISCORD_GUILD_ID") || env("NEXT_PUBLIC_DISCORD_GUILD_ID");
  const dbUser = env("DB_WRITE_USER") || env("DB_USER");
  const dbPass = env("DB_WRITE_PASSWORD") || env("DB_PASSWORD");
  const dbHost = env("DB_HOST") || "localhost";
  const dbName = env("DB_NAME");

  if (!token || !guildId) {
    console.error("DISCORD_BOT_TOKEN and DISCORD_GUILD_ID required");
    process.exit(1);
  }
  if (!dbUser || !dbName) {
    console.error("DB_* env required");
    process.exit(1);
  }

  console.log(
    `[backfill] ultra-slow mode: page=${PAGE_DELAY_MS}ms channel=${CHANNEL_DELAY_MS}ms load<=${LOAD_THRESHOLD} batch=${FLUSH_BATCH}`
  );

  const pool = await mysql.createPool({
    host: dbHost,
    port: envInt("DB_PORT", 3306),
    user: dbUser,
    password: dbPass,
    database: dbName,
    connectionLimit: 1,
    waitForConnections: true,
    queueLimit: 0,
  });
  poolRef = pool;

  await ensureTable(pool);

  const [stateRows] = await pool.query(
    `SELECT channels_done, status FROM analytics_member_messages_backfill WHERE id = 1`
  );
  const prevDone = Number(stateRows[0]?.channels_done ?? 0);

  const stats = { messagesScanned: 0, rowsUpserted: 0 };
  const counts = new Map();
  setupSignalHandlers(pool, counts, stats);

  try {
    await waitForLowLoad("startup");
    const startedAt = Math.floor(Date.now() / 1000);
    const staffIds = await loadStaffIds(pool);
    console.log(`[backfill] excluding ${staffIds.size} staff users`);

    let work = loadWorkQueue();
    if (!work?.length) {
      console.log("[backfill] building channel list (slow)…");
      work = await buildWorkQueue(guildId, token);
      saveWorkQueue(work);
    } else {
      console.log(`[backfill] resuming work queue (${work.length} items)`);
    }

    if (stopping || !work.length) {
      await updateState(pool, { status: "idle" }, { force: true });
      return;
    }

    const startIndex = Math.min(Math.max(0, prevDone), work.length);
    const endIndex =
      MAX_CHANNELS_PER_RUN > 0
        ? Math.min(work.length, startIndex + MAX_CHANNELS_PER_RUN)
        : work.length;

    await updateState(
      pool,
      {
        status: "running",
        channelsTotal: work.length,
        channelsDone: startIndex,
        startedAt,
        errorMessage: null,
      },
      { force: true }
    );

    console.log(
      `[backfill] processing channels ${startIndex + 1}–${endIndex} of ${work.length}`
    );

    for (let i = startIndex; i < endIndex && !stopping; i++) {
      await waitForLowLoad(`channel ${i + 1}`);
      const ch = work[i];
      await updateState(
        pool,
        {
          currentChannelId: ch.id,
          currentChannelName: ch.name,
          channelsDone: i,
        },
        { force: true }
      );
      console.log(`[backfill] [${i + 1}/${work.length}] #${ch.name}`);
      await scanChannelMessages(ch.id, token, staffIds, counts, stats);
      await flushCounts(pool, counts, stats);
      await updateState(
        pool,
        {
          channelsDone: i + 1,
          messagesScanned: stats.messagesScanned,
          rowsUpserted: stats.rowsUpserted,
        },
        { force: true }
      );
      await gentlePause(CHANNEL_DELAY_MS);
    }

    await flushCounts(pool, counts, stats);

    const completed = endIndex >= work.length;
    await updateState(
      pool,
      {
        status: completed ? "completed" : "idle",
        channelsDone: endIndex,
        currentChannelId: null,
        currentChannelName: null,
        messagesScanned: stats.messagesScanned,
        rowsUpserted: stats.rowsUpserted,
        errorMessage: completed
          ? null
          : `Paused after ${endIndex}/${work.length} channels (set BACKFILL_MAX_CHANNELS_PER_RUN=0 for one run)`,
      },
      { force: true }
    );

    if (completed) {
      try {
        fs.unlinkSync(WORK_FILE);
      } catch {
        /* ignore */
      }
      console.log(
        `[backfill] complete. messages=${stats.messagesScanned} upserts=${stats.rowsUpserted}`
      );
    } else {
      console.log(
        `[backfill] batch done (${endIndex}/${work.length}). Re-run to continue.`
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[backfill] failed:", msg);
    await flushCounts(pool, counts, stats).catch(() => {});
    await updateState(
      pool,
      {
        status: "error",
        errorMessage: msg.slice(0, 2000),
        messagesScanned: stats.messagesScanned,
        rowsUpserted: stats.rowsUpserted,
      },
      { force: true }
    );
    process.exitCode = 1;
  } finally {
    if (!stopping) await pool.end();
  }
}

main();
