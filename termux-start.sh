#!/bin/bash
set -e

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "[ERROR] .env file not found. Create it first with your Discord token and config."
  exit 1
fi

# Ensure Termux stays awake in the background
if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock
elif [ -f /data/data/com.termux/files/usr/bin/termux-wake-lock ]; then
  /data/data/com.termux/files/usr/bin/termux-wake-lock 2>/dev/null || true
fi

mkdir -p logs

pm2 delete mina-bot >/dev/null 2>&1 || true
pm2 start ecosystem.config.js --update-env
pm2 save

echo "[OK] 🌸 Mina Bot is now hosted and running 24/7 under PM2."
echo "[INFO] Check logs: pm2 logs mina-bot"
echo "[INFO] Restart: pm2 restart mina-bot"
echo "[INFO] Stop: pm2 stop mina-bot"
echo "[INFO] Health: http://localhost:3000/health"
