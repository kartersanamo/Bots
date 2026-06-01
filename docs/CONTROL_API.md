# Bot Control API

The Control API is a FastAPI service that runs on `127.0.0.1:8787` and is **not** exposed to the public internet. The Next.js dashboard proxies authenticated requests to it.

## Setup

```bash
cd /root/Websites/Bots
npm run control-api:install
```

Add to `.env`:

```
CONTROL_API_SECRET=<random-32-char-string>
CONTROL_API_URL=http://127.0.0.1:8787
MINECADIA_BOTS_ROOT=/root/Discord Bots/Minecadia
```

Run alongside the dashboard:

```bash
npm run control-api
npm run dev   # or npm run start
```

## Authentication

All routes except `/health` require header:

```
X-Control-Key: <CONTROL_API_SECRET>
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health |
| GET | `/bots/status` | All bot process statuses |
| GET | `/bots/{id}/status` | Single bot status |
| POST | `/bots/{id}/start` | Start bot |
| POST | `/bots/{id}/stop` | Stop bot |
| POST | `/bots/{id}/restart` | Restart bot |
| GET | `/bots/{id}/config?path=` | Read JSON config |
| PUT | `/bots/{id}/config?path=` | Write JSON config (auto-backup) |
| GET | `/bots/{id}/logs` | Tail logs (`lines`, `search`, `file`) |
| GET | `/bots/{id}/dms` | List DM channels |
| GET | `/bots/{id}/dms/{channel}/messages` | DM history |
| POST | `/bots/{id}/dms/{channel}/messages` | Send DM reply |

## Process management

1. **systemd** (recommended): set `BOT_GAMES_SYSTEMD_UNIT=minecadia-games.service` etc.
2. **Fallback**: `pgrep` + `run.sh` detached start / SIGTERM stop

## Config backups

Written configs are backed up to `Assets/.backups/` or `.backups/` under each bot folder.

## DM tokens

Set per-bot env vars (`BOT_GAMES_TOKEN`, etc.) or use `DISCORD_BOT_TOKEN` as fallback.
