# Mina Security Bot

A standalone Discord security and moderation bot inspired by publicly documented security patterns. It is an independent implementation and is not affiliated with Wick.

## Requirements
- Node.js 20+
- A Discord application and bot token
- Enable the Server Members, Message Content, and Server Members / Moderation privileged intents as required in the Discord Developer Portal

## Run
1. Copy `.env.example` to `.env` and set `DISCORD_TOKEN` and `CLIENT_ID`.
2. Set `OWNER_IDS` to comma-separated trusted bot-owner Discord user IDs.
3. Install dependencies with `npm install`.
4. Start with `npm start`.

The bot stores per-guild security settings in `data/guilds.json`. Do not commit `.env` or live bot tokens.

## Protection modules
- Anti-nuke monitoring for channel/role deletion, permission overwrite changes, bans, kicks, webhook changes and bot additions
- Anti-raid join-rate detection and configurable minimum account age
- Optional quarantine role for young accounts and verification-gated new members
- Button + short arithmetic verification with verified/quarantine role transitions
- AutoMod for message flooding, repeated messages, mention spam, server invites and heuristic suspicious links
- Per-server allowed-domain list for link-filter exceptions
- Emergency lockdown and restoration of prior Send Messages/Add Reactions overwrite states
- Trusted-user allowlist, security logs and moderation commands

## Important setup
- Give Mina only the permissions it needs, including View Audit Log, Manage Roles, Moderate Members, Manage Channels, Manage Webhooks, Ban Members and Manage Messages for the modules you enable.
- Place Mina's highest role above the verified/quarantine roles and any roles it must manage.
- Configure a quarantine role that denies access to channels/categories until verification. Run `/verification setup` with distinct verified and quarantine roles, then publish `/verify` instructions in your server.
- Enable Message Content and Server Members intents in the Discord Developer Portal.
- Set a security log channel using `/security log-channel`; add trusted staff/bots using `/security whitelist-add`.
- Configure allowed hostnames with `/security allow-domain` if a trusted site is being flagged.

## Safety and platform limits
Discord role hierarchy and server-owner authority cannot be bypassed. Audit-log protection requires View Audit Log and can only react after Discord emits an audit event; it cannot guarantee prevention of every action. Link filtering is heuristic and should be tuned with an allowlist. Test quarantine and lockdown behavior in a private server before production use.
