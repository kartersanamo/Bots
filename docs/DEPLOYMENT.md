# Deployment Guide

## Target host

- Domain: `kartersanamo.com`
- Subdomain: `bots.kartersanamo.com`
- App location: `/root/Websites/Bots`

## 1) DNS

Create a DNS record:
- Type: `A` (or `CNAME` if using a proxy target)
- Host: `bots`
- Value: your server public IP

## 2) Build and run

From `/root/Websites/Bots`:

```bash
npm install
npm run control-api:install
npm run build
```

Run **both** services (dashboard + control API):

```bash
# Terminal 1 — Control API (localhost only)
npm run control-api

# Terminal 2 — Dashboard
npm run start
```

Or use PM2/systemd for both (see below).

Default Next.js server port is `3000`. Control API is `8787` on `127.0.0.1` only.

## 3) Reverse proxy (nginx)

Use nginx on the host to forward `bots.kartersanamo.com` to `http://127.0.0.1:3000`.

Example server block:

```nginx
server {
    server_name bots.kartersanamo.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then enable SSL:

```bash
sudo certbot --nginx -d bots.kartersanamo.com
```

## 4) Process manager

Use PM2 or systemd to keep the app running.

PM2 example:

```bash
pm2 start npm --name bots-dashboard -- start
pm2 start npm --name bots-control-api -- run control-api
pm2 save
pm2 startup
```

systemd example for control API (`/etc/systemd/system/bots-control-api.service`):

```ini
[Unit]
Description=Minecadia Bots Control API
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/Websites/Bots/control-api
EnvironmentFile=/root/Websites/Bots/.env
ExecStart=/usr/bin/python3 -m uvicorn main:app --host 127.0.0.1 --port 8787
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## 5) Environment variables

Copy `.env.example` to `.env` and fill in:
- Discord OAuth credentials
- Owner Discord ID
- Discord bot token
- MySQL credentials (read + optional `DB_WRITE_*`)
- Session secret
- `CONTROL_API_SECRET` (same value used by dashboard and control API)
- `MINECADIA_BOTS_ROOT` path to bot folders
- Optional per-bot systemd units and DM tokens

## 6) Discord OAuth setup

In Discord Developer Portal, set redirect URL to:

`https://bots.kartersanamo.com/api/auth/callback`

## 7) Security notes

- Never commit `.env`.
- Use a read-only MySQL user for dashboard queries.
- Restrict firewall to required ports only.
