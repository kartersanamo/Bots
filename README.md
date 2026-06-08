# Minecadia Bots Dashboard

Next.js dashboard for operating Minecadia Discord bots: fleet control, tickets, games admin, analytics, and moderation. Talks to MySQL for data and to local control APIs for bot processes.

## Requirements

- Node.js 20.9+
- MySQL (read user required; write user for mutations and analytics backfill)
- Discord application (OAuth for login, bot token for guild API calls)

## Setup

1. Copy `.env.example` to `.env` and fill in values.
2. Install dependencies:

```bash
npm install
```

3. Run the control API (bot restarts, configs, tmux console):

```bash
npm run control-api:install
npm run control-api
```

4. Start the dashboard:

```bash
npm run dev
```

Production build and deploy:

```bash
npm run build
npm run deploy
```

## Environment

| Variable | Purpose |
|----------|---------|
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | OAuth login |
| `DISCORD_BOT_TOKEN` | Guild member and channel lookups |
| `DISCORD_GUILD_ID` | Target Discord server |
| `DB_*` | MySQL read access |
| `DB_WRITE_*` | MySQL writes (optional; falls back to `DB_*`) |
| `CONTROL_API_SECRET` / `CONTROL_API_URL` | Local Python control API |
| `GAMES_BOT_API_*` / `TICKETS_BOT_API_*` | Per-bot HTTP APIs |

See `.env.example` for the full list.

## Member message analytics backfill

Historical guild message counts are rebuilt by scanning Discord channel history. Each message is counted once using `analytics_member_messages_seen` (message ID dedup).

```bash
# Wipe bad rollups and restart progress (destructive)
npm run backfill:member-messages:reset

# Run until the full server is scanned (low CPU/IO priority, auto-continues)
npm run backfill:member-messages
```

The script runs all channels in one process until finished (`BACKFILL_MAX_CHANNELS_PER_RUN=0` by default). It pauses when system load is high (`BACKFILL_LOAD_THRESHOLD`, default 1.5). Tune delays with `BACKFILL_PAGE_DELAY_MS` and `BACKFILL_CHANNEL_DELAY_MS`.

Live messages from Minecadia Management also use the same seen table (requires Management bot restart after deploy).

Progress is visible under Analytics → Engagement. Stop a run with:

```bash
pkill -f backfill-member-messages
```

## Project layout

```
src/           Next.js app (pages, API routes, components)
control-api/   Python FastAPI for bot fleet control
scripts/       Deploy, backfill, analytics utilities
```

Bot code lives outside this repo under `MINECADIA_BOTS_ROOT` (see `.env.example`).

## SQL migrations

Do not commit `.sql` migration files. For one-off schema changes:

```bash
# write SQL to .tmp/migration.sql, then:
node scripts/apply-analytics-migration.mjs .tmp/migration.sql
```

The apply script runs the file and deletes it on success.
