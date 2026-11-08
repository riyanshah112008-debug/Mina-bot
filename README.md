# Mina Security Bot

A standalone Discord security and moderation bot inspired by publicly documented security patterns. It is an independent implementation and is not affiliated with Wick.

## Requirements
- Node.js 20+
- A Discord application and bot token
- `Guilds`, `GuildMembers`, `GuildModeration`, `GuildMessages`, and `MessageContent` intents enabled as required in the Discord Developer Portal

## Run
1. Copy `.env.example` to `.env` and set `DISCORD_TOKEN` and `CLIENT_ID`.
2. Set `OWNER_IDS` to comma-separated trusted bot-owner Discord user IDs.
3. Install dependencies with `npm install`.
4. Start with `npm start`.

The bot stores per-guild security settings in `data/guilds.json`. Do not commit `.env` or live bot tokens.

## Initial security modules
- Anti-nuke audit-log monitoring and configurable action limits
- Join-raid detection and account-age gate
- Message heat, repeated-message, invite and mention-spam filters
- Emergency lockdown and recovery commands
- Trusted-user allowlist and moderation commands
- Persistent guild configuration

## Discord permissions
Grant only the permissions needed for the enabled modules. The bot cannot act above its highest role, bypass Discord's owner hierarchy, or see audit-log entries without `ViewAuditLog`. Enable the Message Content privileged intent for content-based filters.

## Safety defaults
Protection is configurable per server. Destructive punishments are not applied to the server owner or trusted allowlisted users. Review role hierarchy and test in a private server before enabling aggressive thresholds.
