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

## One-command deploy

```bash
cd /root/Websites/Bots
npm run deploy
```

## Console noise from browser extensions

`contentScript.bundle.js` + `chrome-extension://…` CSP errors are from a **Chrome extension**, not this app. Test in incognito with extensions disabled to confirm.

## `ERR_HTTP2_PROTOCOL_ERROR` on `/_next/static/chunks/*.js`

Usually **Cloudflare + many parallel chunk downloads** or **stale cache** after deploy.

1. Purge Cloudflare cache (entire zone or `/_next/static/*`).
2. Hard refresh (`Ctrl+Shift+R`).
3. In Cloudflare dashboard, try disabling for this zone:
   - **Speed → HTTP/3 (QUIC)**
   - **Speed → Optimization → Rocket Loader**
   - **Auto Minify → JavaScript**
   - **Speculation Rules** (if enabled)
4. The app auto-reloads once on chunk failure; use the banner if it persists.
