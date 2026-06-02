# Analytics tracking (approved metrics)

## 1. Apply database migration

```bash
cd /root/Websites/Bots
node scripts/apply-analytics-migration.mjs
node scripts/apply-analytics-migration.mjs docs/migrations/002_total_statistics_and_member_messages.sql
```

Requires `DB_HOST`, `DB_USER` (or `DB_WRITE_USER`), `DB_PASSWORD`, `DB_NAME` in `.env`.

## 2. Restart bots

After migration, restart bots so new cogs/handlers load:

- **MinecadiaManagement** — `analytics_tracking` cog (joins/leaves, voice, snapshots, commands)
- **MinecadiaTickets** — `analytics_tracking` cog (ticket channel messages) + `created_at` on blacklists
- **MinecadiaUtilities** — staff message rollup + poll votes + `created_at` on polls
- **MinecadiaGames** — game outcome logging when sessions finish

Shared logger: `/root/Discord Bots/Minecadia/_analytics/logger.py`

## 3. Dashboard

Open **Analytics → Engagement** for charts. Dashboard moderation actions (`/api/discord/moderate`) also write to `analytics_mod_actions`.

## Tables

| Table | Metric |
|-------|--------|
| `analytics_staff_messages_daily` | Staff messages by day/channel |
| `analytics_ticket_messages_daily` | Staff vs owner messages in tickets |
| `analytics_member_events` | Joins / leaves |
| `analytics_voice_daily` | Voice seconds |
| `analytics_command_daily` | Slash command usage |
| `analytics_mod_actions` | Moderation actions |
| `analytics_poll_votes` | Poll votes |
| `analytics_game_outcomes` | Game session ends |
| `analytics_server_snapshots` | Daily member/online/boost stats |
| `analytics_member_messages_daily` | All guild members’ messages per day |
| `total_statistics` | All-time staff counters (never reset by `/wipe`) |
| `statistics` | Current period staff counters (reset every ~2 weeks) |
| `blacklists.created_at` | Blacklist creation time |

## All-time vs period staff stats

- **`statistics`** — reset by MinecadiaStaff `/wipe` (bi-weekly leaderboard period).
- **`total_statistics`** — incremented in parallel on every stat change; never wiped. Dashboard “all time” KPIs and leaderboards use this table.
- Backfill: migration `002` seeds `total_statistics` from current `statistics` using `GREATEST()` so re-runs are safe.
