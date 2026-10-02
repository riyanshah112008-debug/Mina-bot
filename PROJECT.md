# Mina Bot - Architecture & Specifications

## Overview
Mina Bot is an enterprise-grade, high-performance Discord bot specializing in four core domains:
1. **Moderation**: Complete suite of administrative and moderation commands (`ban`, `unban`, `kick`, `timeout`, `untimeout`, `warn`, `warnings`, `delwarn`, `clearwarns`, `lock`, `unlock`, `slowmode`, `purge`, `nuke`, `modlogs`, `automod`).
2. **Utility**: Essential server and user utilities including interactive help menus, detailed user/server/bot statistics, AFK system, announcements, and polls.
3. **Tickets**: Multi-category support ticket management system featuring private channel creation, staff claiming, member access management, transcript generation, and ticket lifecycle auditing.
4. **Verification**: Dual-tier verification architecture:
   - **Tier 1 (Normal Verification)**: Button click and randomized security captcha modal with automatic role assignments.
   - **Tier 2 (Video Verification in VC)**: Dedicated voice-channel verification system with waiting queues, camera/video state detection, staff live-review dashboards, private interview channel coordination, and trusted video-verified role granting.

## Technical Stack & Constraints
- **Platform**: Node.js >= 20 (Tested on Node v24.18.0)
- **Library**: Discord.js v14.15+
- **Persistence**: Hybrid Storage Engine — High-speed atomic JSON store (`mina-store.json`) with zero external native compilation dependencies (100% Android/Termux, Docker, Render, and VPS compatible).
- **Web Server**: Lightweight embedded Express server providing `/` and `/health` endpoints for uptime monitoring and hosting platforms (Render, Railway, etc.).

## Reliability Principles (Ralph Loop / CodeRabbit)
- **Zero Crashing**: All event and command handlers wrapped with robust try/catch blocks; comprehensive error logging.
- **Permission Checking**: Client and user permission validation prior to executing privileged moderation or channel modification operations.
- **Context Hygiene**: State persisted to disk immediately to prevent data loss on restarts.
