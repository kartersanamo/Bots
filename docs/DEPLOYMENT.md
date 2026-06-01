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
npm run build
npm run start
```

Default Next.js server port is `3000`.

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
pm2 save
pm2 startup
```

## 5) Environment variables

Copy `.env.example` to `.env` and fill in:
- Discord OAuth credentials
- Owner Discord ID
- Discord bot token
- MySQL read-only credentials
- Session secret

## 6) Discord OAuth setup

In Discord Developer Portal, set redirect URL to:

`https://bots.kartersanamo.com/api/auth/callback`

## 7) Security notes

- Never commit `.env`.
- Use a read-only MySQL user for dashboard queries.
- Restrict firewall to required ports only.
