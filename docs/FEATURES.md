# Bots Dashboard Feature Roadmap

## Implemented (Phase 2)

### Fleet operations (N)
- Start / stop / restart per bot
- Restart all fleet (owner)
- Live status (online / offline / starting / degraded)
- Log tail, search, file picker, live refresh
- Fleet control page

### Config management (O)
- JSON editor per config file
- Auto-backup on save
- Per-bot config page

### DM & messaging (P)
- Per-bot DM inbox
- Read threads and reply

### Write APIs
- Tickets: close in DB, blacklist CRUD
- Leveling: get/set XP
- Polls: close
- Factions: get/update/delete
- Discord: timeout, kick, ban, unban, channel edit, send message
- Staff: statistics adjustment
- Audit log (JSONL)

### Dashboard pages
- `/dashboard/fleet`
- `/dashboard/bots/[id]/logs|config|inbox|panel`
- `/dashboard/audit`
- `/dashboard/moderation`

---

## Core principles

- Modern, sleek, dark-purple UI
- Fast role-based workflows for staff
- Owner-level global control
- API-first backend integrations

## A. Authentication and Access

- Discord OAuth login
- Owner override access
- Tier-based permissions (helper to owner)
- Granular `can(action)` permission keys
- Per-page authorization gates
- Audit trail for sensitive actions

## B. Global Dashboard

- Fleet status cards for all six bots
- Open and closed ticket counters
- Member and presence overview
- Notification center for incidents (planned)
- Global search (planned)

## C. Server Management

- Members browser (read)
- Roles and channels overview (read)
- Moderation panel (write)
- Audit log export (planned)

## D–I. Bot-specific panels

See bot `/panel` pages and API routes. Expand per bot as needed.

## J. Fleet Operations

- Process status, start/stop/restart
- Live logs
- Config hot-reload via file write + bot restart (planned signal)

## K. Analytics and Reporting

- Cross-bot trends (planned)
- CSV export (planned)

## L. Integrations

- Telegram, Sheets, YouTube (planned)

## M. UX and Productivity

- Command palette (planned)
- Mobile sidebar
- Animated UI components

## N–Y. Extended write roadmap

See Phase 2 plan for full list: bulk tickets, media ranks, game wipe UI, webhooks, scheduled messages, two-person confirm, impersonation mode, etc.
