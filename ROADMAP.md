# Mina Bot Implementation Roadmap

## Phase 1: Core Framework & Storage Foundation
- [x] Analyze codebase dependencies and clean unnecessary modules.
- [x] Create zero-dependency, crash-resilient unified database storage layer (`src/utils/database.js`) supporting guild settings, automod rules, warnings, tickets, and verifications.
- [x] Implement enhanced Client wrapper with command/event loaders and error insulation (`src/client.js`, `src/config.js`, `src/boot.js`, `src/index.js`).

## Phase 2: Comprehensive Moderation & Automod Engine
- [x] Moderation commands:
  - Ban / Unban (`src/commands/moderation/ban.js`, `unban.js`)
  - Kick (`src/commands/moderation/kick.js`)
  - Timeout / Untimeout (`src/commands/moderation/timeout.js`, `untimeout.js`)
  - Warn / Warnings / Delwarn / Clearwarns (`src/commands/moderation/warn.js`, `warnings.js`, `delwarn.js`, `clearwarns.js`)
  - Lock / Unlock (`src/commands/moderation/lock.js`, `unlock.js`)
  - Purge / Clear (`src/commands/moderation/purge.js`)
  - Slowmode (`src/commands/moderation/slowmode.js`)
  - Nuke (`src/commands/moderation/nuke.js`)
  - Modlogs setup (`src/commands/moderation/modlogs.js`)
  - Automod config (`src/commands/moderation/automod.js`)
- [x] Real-time Automod and Logging Event Handlers:
  - Anti-Invite filter (`INVITE_REGEX`)
  - Anti-Link filter (`LINK_REGEX`)
  - Anti-Spam rate limiter (sliding window memory store)
  - Anti-Mass-Mention guard (automated timeout enforcement)
  - Modlog dispatcher for moderation actions.

## Phase 3: Server & User Utilities
- [x] Help command (`src/commands/utility/help.js`) with categorized dropdown select.
- [x] Ping command (`src/commands/utility/ping.js`).
- [x] Serverinfo command (`src/commands/utility/serverinfo.js`).
- [x] Userinfo / Whois command (`src/commands/utility/userinfo.js`).
- [x] Avatar command (`src/commands/utility/avatar.js`).
- [x] Banner command (`src/commands/utility/banner.js`).
- [x] Botinfo / Stats command (`src/commands/utility/botinfo.js`).
- [x] AFK system (`src/commands/utility/afk.js` and message listener).
- [x] Poll command (`src/commands/utility/poll.js`).
- [x] Announce command (`src/commands/utility/announce.js`).
- [x] Prefix command (`src/commands/utility/prefix.js`).

## Phase 4: Interactive Ticket System
- [x] Ticket setup command (`src/commands/tickets/ticketsetup.js`) with customizable panels and categories.
- [x] Ticket creation interaction handler (`src/modules/tickets/ticketManager.js`).
- [x] In-ticket controls: Claim, Close, Add Member, Remove Member.
- [x] Formatted text transcript generation and audit logging.

## Phase 5: Dual Verification System (Normal + Video VC Verification)
- [x] Normal Verification:
  - Setup command (`src/commands/verification/verifysetup.js`).
  - Button verification and Captcha challenge modal verification (`src/modules/verification/normalVerify.js`).
  - Automatic role management (Add Verified, Remove Unverified).
- [x] Video Verification in VC:
  - Setup command (`src/commands/verification/videoverifysetup.js`).
  - Voice channel queue listener (`src/modules/verification/videoVerify.js`, `src/events/voiceStateUpdate.js`).
  - Staff alert & live control dashboard with interactive buttons:
    - Call to VC / Move to private VC
    - Stream / Camera status verification
    - Approve Video Verification (grants video-verified role, direct congratulations DM, audit log)
    - Reject Video Verification (with modal reason, graceful move/disconnect, audit log)

## Phase 6: Automated Verification & Test Suite
- [x] Write end-to-end integration and unit tests for commands, database storage, tickets, and verifications (`tests/run-tests.js`).
- [x] Syntax check and test suite execution via Ralph Loop (100% pass rate: 10/10 test suites passed).
- [x] Renamed and branded entire codebase to **Mina Bot**.
