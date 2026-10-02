# Mina bot

Mina bot is a modular Discord bot built around a premium Starry/Jarvis-inspired experience. It includes server configuration, automod controls, music playback, and mobile-friendly hosting support.

## Features
- Server settings and automation controls
- Per-guild automod toggles for caps, links, invites, phishing, spam, and mass mentions
- Music playback with Spotify-first search and filter presets
- Premium-themed embeds and UI flows
- Termux-ready startup script for Android host environments

## Local setup
1. Install dependencies:
   npm install
2. Create a `.env` file with your Discord token and config values.
3. Start the bot:
   npm start

## Termux / Android hosting
Use the included script to launch the bot in the background with PM2:

```bash
chmod +x termux-start.sh
./termux-start.sh
```

This is best for testing and lightweight personal hosting. For always-on production use, a VPS or dedicated host is still more reliable.

## Hosting on Render (easy, managed)

This repository now includes a small web health endpoint and Render-friendly files (Procfile, render.yaml, Dockerfile). Render expects a web service that listens on the PORT environment variable — the included lightweight Express server exposes `/` and `/health` and runs alongside the bot so the service is recognized as "healthy" by Render.

Quick steps to deploy on Render (recommended):

1. Create a new Web Service on Render and connect your GitHub repository.
2. If using the default (build with Render's Node environment):
   - Build Command: `npm install`
   - Start Command: `npm start`
   - The `npm start` script runs `node src/boot.js` which starts the bot and the web health server.
3. Add the required environment variables in Render Dashboard's Environment panel (never commit real secrets):
   - DISCORD_TOKEN (your bot token)
   - PREFIX (optional)
   - MONGO_URI (recommended for multi-guild persistence)
   - LAVALINK_NODES (optional JSON array)
   - SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET (recommended for better music search)
4. If you prefer to use the provided Dockerfile (full control), set Render to use Docker and it will build the image defined in `Dockerfile`.

Health checks:

- `GET /health` returns JSON with status and uptime. Render will use the web process health to determine if the service is healthy.

Notes & troubleshooting:

- Do NOT commit your `.env` with real tokens. Use Render's Dashboard to add environment variables securely.
- Some native dependencies (canvas, better-sqlite3) require system packages. The provided Dockerfile installs required packages for a Debian-based image. If you prefer Render's native build, add the necessary buildpacks or use the Docker option.

Local run reminder:

1. Fill a local `.env` (copy from `.env.example` if present) with the variables above.
2. Install deps: `npm install`
3. Start locally: `npm start` (this runs `src/boot.js` and opens the web health endpoint on port 3000 by default)


