#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if command -v nvm >/dev/null 2>&1; then
  # shellcheck disable=SC1091
  source "$NVM_DIR/nvm.sh" 2>/dev/null || true
  nvm use 2>/dev/null || true
fi

node -e "const v=process.versions.node.split('.').map(Number); if(v[0]<20||(v[0]===20&&v[1]<9)) { console.error('Node >= 20.9 required'); process.exit(1); }"

echo "Building…"
npm run build

echo "Restarting next…"
pkill -f "next-server" 2>/dev/null || true
sleep 1
nohup npm run start > /tmp/bots-next.log 2>&1 &

if command -v nginx >/dev/null 2>&1; then
  nginx -t && systemctl reload nginx
fi

echo "Done. Logs: tail -f /tmp/bots-next.log"
echo "Purge Cloudflare cache, then hard refresh (Ctrl+Shift+R)."
