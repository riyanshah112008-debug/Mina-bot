# NovaBot Bot

NovaBot is a single-server Discord bot with Wick-inspired security, moderation, Manager-bot-style music controls, and utility commands.

## Requirements
- Node.js 20+
- Discord application and bot token
- Enable Server Members, Message Content, Guild Moderation and Guild Voice States intents in the Discord Developer Portal
- Music playback requires a reachable Lavalink v4 node and a host that supports Discord voice networking

## Configuration
Set these environment variables in the hosting dashboard:
- `DISCORD_TOKEN`, `CLIENT_ID`, and optionally `GUILD_ID`
- `PREFIX` (defaults to `,`; `.` is also accepted)
- Optional `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` for Spotify catalogue/playlist resolution
- `DATA_DIR` for persisted server settings and reminders

Do not commit real tokens or credentials. The Lavalink fallback in the source is a public demo node and is not guaranteed to remain online; configure your own reliable Lavalink node for production.

## Music commands
Slash commands are available individually (Manager-bot style): `/play`, `/search`, `/pause`, `/resume`, `/skip`, `/stop`, `/queue`, `/nowplaying`, `/volume`, `/loop`, `/shuffle`, `/clear`, `/remove`, `/jump`, `/seek`, `/filter`, `/speed`, `/autoplay`, `/join`, `/previous`, and `/replay`.

Prefix equivalents are supported, for example:
- `,play <song or URL>` (aliases: `,p`, `,add`)
- `,pause`, `,resume`, `,skip`, `,stop`
- `,queue` (alias `,q`), `,nowplaying` (alias `,np`)
- `,volume <0-150>`, `,loop <off|track|queue>`, `,shuffle`
- `,remove <position>`, `,jump <position>`, `,seek <seconds>`
- `,filter <name>`, `,speed <0.5-2>`, `,autoplay`, `,join`, `,musichelp`

The music engine uses Kazagumo/Shoukaku with Lavalink, YouTube Music search and Spotify metadata-to-audio matching. Spotify audio is not streamed directly; Spotify Premium is not required. Search results are matched to playable sources, so the exact recording can vary. Lavalink node availability, source availability and provider terms can change. Voice controls require the user to be in the bot's active voice channel.

## Security and moderation
- Anti-nuke audit-log monitoring for destructive channel, role, permission, ban, kick, webhook and bot-add events.
- Anti-raid join-burst detection, Join Gate filters, and configurable Join Raid panic mode.
- Heat-based AutoMod with decaying weighted signals for spam, repeated messages, mass mentions, attachments, invites, suspicious links, blocked words, and webhook messages; timeout strikes escalate with a cap.
- Trusted users/roles, incident history, configurable thresholds and timeout/kick/ban response.
- Verification panel with arithmetic challenge and verified/quarantine roles.
- Emergency lockdown and permission restoration.
- `/timeout`, `/kick`, `/ban`.

Start with `/security setup`, configure the quarantine role with `/security quarantine-role`, tune `/security limits`, `/security join-gate`, `/security join-raid`, and `/security heat-threshold`, then configure roles using `/verification setup` and publish `/verification panel`. Add/remove blocked phrases with `/security heat-word-add` and `/security heat-word-remove`.

## Utilities
- `/ping`, `/avatar`, `/userinfo`, `/serverinfo`, `/botinfo`
- `/calculate`, `/poll`, `/remind create|list|cancel`, `/help`

## Hosting
The Render blueprint exposes `/health`. A sleeping/free host cannot provide reliable 24/7 voice playback. Use a persistent always-on process, a reachable Lavalink node, and persistent storage for `DATA_DIR`.

## Security notes
Anti-nuke is reactive to audit-log events and cannot guarantee prevention of every action. Configure role hierarchy carefully and test lockdown/verification in a private server before production use.
