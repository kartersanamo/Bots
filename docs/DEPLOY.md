# Deploying the dashboard

## Requirements

- **Node.js ≥ 20.9.0** (`nvm use` reads `.nvmrc`)
- MySQL and `.env` configured

## Build and run

```bash
cd /root/Websites/Bots
npm ci
npm run build    # uses webpack (stable chunks behind Cloudflare)
npm run start    # or restart your process manager
```

After every deploy:

1. **Restart** `next start` (old process keeps serving the previous `.next` build).
2. **Purge Cloudflare cache** for `bots.kartersanamo.com`, especially `/_next/static/*`.
3. Hard-refresh the browser (`Ctrl+Shift+R`) on `/dashboard/analytics`.

## Why webpack?

Next.js 16 defaults to Turbopack for `next build`. Turbopack emits many small runtime chunks (`turbopack-*.js`) that can fail behind Cloudflare (522/520, QUIC errors). This project uses `next build --webpack` for predictable static assets.

## Nginx

Static files are served from disk at `/_next/static/` (see `/etc/nginx/sites-available/bots.kartersanamo.com`). Reload after deploy if you change nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Console noise from browser extensions

`contentScript.bundle.js` + `chrome-extension://…` CSP errors are from a **Chrome extension**, not this app. Test in incognito with extensions disabled to confirm.
