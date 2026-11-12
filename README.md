# Mina Bot

Mina is a single-server Discord bot with security, moderation, music playback, Spotify catalogue lookup and utility commands.

## Requirements
- Node.js 20+
- Discord application + bot token
- Enable Server Members, Message Content and Server Members / Moderation intents in the Discord Developer Portal
- Bot permissions: View Audit Log, Manage Roles, Moderate Members, Manage Channels, Manage Webhooks, Ban Members, Kick Members, Manage Messages, Connect, Speak and Send Messages

## Setup
1. Set `DISCORD_TOKEN` and `CLIENT_ID`.
2. Set `GUILD_ID` to your one target server ID for instant guild command registration.
3. Optionally set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` for Spotify search and Spotify track/playlist URL resolution.
4. Install dependencies with `npm install` and start with `npm start`.

The bot stores server configuration and reminders in `DATA_DIR/guilds.json`. Use persistent storage in production. Do not commit secrets.

## Music
- `/music play` supports track searches and supported audio URLs.
- `/music pause`, `resume`, `skip`, `stop`, `queue`, `nowplaying`, `volume`, `loop`, `shuffle`, `remove`, and `clear`.
- `/spotify search` searches Spotify metadata.
- Spotify track and playlist links can be resolved to track metadata and queued by matching the title/artist against the configured audio extractors.

Spotify provides catalogue metadata, not a playable audio stream. Playback is performed by Discord Player using supported audio extractors; Spotify Premium is not required. Track matching can differ from the original Spotify recording. Music search uses SoundCloud; direct SoundCloud, Vimeo and Reverbnation URLs are supported by the official extractors. Some SoundCloud tracks cannot be streamed due to source restrictions. Source availability and extractor terms/availability can change.

## Security and moderation
- Anti-nuke: audit-log monitoring for channel/role changes, permission overwrite changes, bans, kicks, webhook changes, member role changes and bot additions.
- Anti-raid: join-burst detection and young-account quarantine.
- AutoMod: spam, repeated messages, mass mentions, invite links and heuristic suspicious-link filtering.
- Trusted users and roles, incident history, configurable anti-nuke thresholds and timeout/kick/ban response.
- Verification panel with a short arithmetic challenge and verified/quarantine roles.
- Emergency lockdown and permission restoration.
- Moderation: `/timeout`, `/kick`, `/ban`.

Start with `/security setup` in the desired log channel. Configure roles with `/verification setup`, then publish a panel with `/verification panel`. Add trusted staff using `/security trust-user` and `/security trust-role`.

## Utilities
- `/ping`, `/avatar`, `/userinfo`, `/serverinfo`, `/botinfo`
- `/calculate` for basic arithmetic
- `/poll` for reaction polls
- `/remind create|list|cancel` for persisted reminders
- `/help` for the command guide

## Hosting notes
The included Render blueprint exposes a health endpoint at `/health`. Voice playback requires a host that supports Discord voice networking and a persistent always-on process. Free hosting may sleep or have resource/network restrictions; a sleeping service cannot provide reliable music playback. Configure a persistent disk and point `DATA_DIR` to it if your host supports one.

## Security limitations
Anti-nuke is reactive to Discord audit-log events; it cannot guarantee prevention of every action. Configure bot role hierarchy carefully and test lockdown/verification in a private server before production use.
