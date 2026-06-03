#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if command -v nvm >/dev/null 2>&1; then
  # shellcheck disable=SC1091
  source "$NVM_DIR/nvm.sh" 2>/dev/null || true
  nvm use 2>/dev/null || true
fi

node -e "const v=process.versions.node.split('.').map(Number); if(v[0]<20||(v[0]===20&&v[1]<9)) { console.error('Node >= 20.9 required'); process.exit(1); }"

if [[ "${DEPLOY_SKIP_BUILD:-}" == "1" ]]; then
  if [[ ! -d .next ]]; then
    echo "DEPLOY_SKIP_BUILD=1 but .next/ is missing — cannot deploy."
    exit 1
  fi
  echo "Skipping build (DEPLOY_SKIP_BUILD=1)…"
else
  echo "Stopping dashboard before build (frees RAM)…"
  pkill -f "next-server" 2>/dev/null || true
  sleep 2

  avail_kb="$(awk '/MemAvailable:/ {print $2}' /proc/meminfo)"
  swap_free_kb="$(awk '/SwapFree:/ {print $2}' /proc/meminfo)"
  if [[ "${avail_kb:-0}" -lt 800000 ]] || [[ "${swap_free_kb:-0}" -lt 100000 ]]; then
    echo "Warning: low memory (available ~$((avail_kb / 1024))MiB, swap free ~$((swap_free_kb / 1024))MiB)."
    echo "  Build may be slow or fail with 'Killed'. Consider adding swap or building elsewhere."
  fi

  export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
  export NEXT_TELEMETRY_DISABLED=1

  echo "Building (low CPU/IO priority so bots stay responsive)…"
  nice -n 19 ionice -c 3 npm run build
fi

LOG_FILE="/tmp/bots-next.log"

echo "Restarting next…"
pkill -f "next-server" 2>/dev/null || true
sleep 1
nohup npm run start > "$LOG_FILE" 2>&1 &

if command -v nginx >/dev/null 2>&1; then
  nginx -t && systemctl reload nginx
fi

echo "Deploy finished. Purge Cloudflare cache, then hard refresh (Ctrl+Shift+R)."
echo "Following live site logs (Ctrl+C stops tail only; Next keeps running)…"
echo "────────────────────────────────────────────────────────"
sleep 1
tail -n 50 -f "$LOG_FILE"
