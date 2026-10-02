# 🌸 Mina Bot

**Mina Bot** is a high-performance, modular Discord bot specialized in:
1. **🛡️ Advanced Moderation & Automod** (Full audit logging, warnings system, channel locking, purging, and anti-raid protection)
2. **🎵 High-Fidelity Music Streaming** (Lavalink v4 cluster, Spotify resolution, interactive DJ dashboard, DSP audio filters)
3. **⚙️ Server & User Utilities** (Interactive help menus, server/user statistics, AFK tracking, polling, announcements)
4. **🎫 Support Ticket Portals** (Multi-category support desks, staff claim workflows, member management, and exportable transcripts)
5. **✅ Dual-Tier Verification** (Instant button click / security captcha challenges AND dedicated voice channel video verification)

---

## 🌟 Feature Breakdown

### 1. Moderation Suite
- **Bans & Unbans**: `/ban` and `/unban` with reason, DM notifications, message deletion window, and modlog dispatch.
- **Kicks**: `/kick` with role hierarchy safety checks and DM notification.
- **Timeouts**: Native Discord timeouts via `/timeout` (e.g. `10m`, `1h`, `1d`) and `/untimeout`.
- **Warnings System**: `/warn`, `/warnings`, `/delwarn`, and `/clearwarns` with persistent case IDs and audit history.
- **Channel Controls**: `/lock`, `/unlock`, and `/slowmode` (0–21600 seconds).
- **Cleanup & Nuking**: `/purge` (1–100 messages with optional user filter) and `/nuke` (recreates channel with identical permissions and deletes old channel with interactive confirmation button).
- **Audit Logging**: `/modlogs #channel` routes all moderation actions with color-coded rich embeds.
- **Automod Engine**: Real-time filters for Anti-Invite (`discord.gg/`), Anti-Link, Anti-Spam rate limiting, and Anti-Mass-Mention with automated timeout enforcement.

### 2. Server & User Utilities
- **Interactive Help**: `/help` with dynamic dropdown category browser and specific command lookup.
- **Diagnostics**: `/ping` (latency, WebSocket ping, uptime) and `/botinfo` (RAM usage, platform, shard stats).
- **Profile & Server Inspection**: `/serverinfo`, `/userinfo`, `/avatar` (with direct PNG/JPG/WEBP links), and `/banner`.
- **AFK Tracker**: `/afk [reason]` notifies users when mentioned and automatically clears when you speak next.
- **Community Tools**: `/poll` (automated reaction votes) and `/announce` (rich broadcast messages).
- **Prefix Management**: `/prefix [new_prefix]` for customizable command prefixes (defaults to `,`).

### 3. Support Ticket Portal
- **One-Command Deployment**: `/ticketsetup` deploys an interactive ticket portal with dropdown categories:
  - 💬 *General Support*
  - 🛡️ *Player / Staff Report*
  - 💼 *Partnerships & Staff*
  - ❓ *Other Assistance*
- **Private Channels**: Automatically created in dedicated ticket categories with restricted permissions.
- **In-Ticket Controls**:
  - ✋ `Claim Ticket`: Assigns ticket to moderator and updates channel topic.
  - 🔒 `Close Ticket`: Prompts modal, generates full text transcript, and routes copies to the log channel & ticket creator's DMs.
  - 👥 `Add / Remove Member`: Interactive modals for modifying member access.
  - 📝 `Transcript`: On-demand transcript generation.

### 4. Dual-Tier Verification
- **Tier 1: Standard Member Verification** (`/verifysetup`)
  - Supports **Instant 1-Click Button** or **Interactive 5-Character Security Captcha Challenge** to stop raid bots.
  - Automatically assigns the Verified role and strips the Unverified role upon completion.
- **Tier 2: Voice Channel Video Verification** (`/videoverifysetup`)
  - Configures waiting room VC, private interview VC, reviewer staff role, and special Video Verified role.
  - Detects candidate webcam/camera stream state in real-time.
  - Provides staff with a live interactive review dashboard with:
    - 🎧 `Move to Private VC`
    - 📹 `Check Camera State`
    - ✅ `Approve Verification` (grants role, sends congratulations DM, records audit log)
    - ❌ `Reject Verification` (disconnects user, sends DM reason, records rejection log)

---

## 🚀 Setup & Hosting

### 1. Requirements
- Node.js >= 20.0.0
- A Discord Bot Token with privileged gateway intents enabled:
  - `Server Members Intent`
  - `Message Content Intent`

### 2. Local Installation
```bash
# Clone the repository
git clone https://github.com/riyanshah112008-debug/Friendbase.git
cd Friendbase

# Install dependencies (zero native compilation required)
npm install

# Configure environment variables
cp .env.example .env
# Edit .env and enter DISCORD_TOKEN, CLIENT_ID, etc.

# Run automated test suite
npm test

# Start the bot
npm start
```

### 3. Termux / Android Hosting
Mina Bot is designed with zero native C++ compilation dependencies (like node-gyp), ensuring instant, 100% crash-free operation in Termux:
```bash
chmod +x termux-start.sh
./termux-start.sh
```

### 4. Render / Cloud Deployment
Mina Bot includes a built-in health check web server on port 3000 (`/` and `/health`) compatible with Render, Railway, and Docker:
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**: Add `DISCORD_TOKEN`, `CLIENT_ID`, and optional `PREFIX` in your deployment dashboard.

---

## 🧪 Testing & Verification
Mina Bot includes an end-to-end test suite:
```bash
# Run unit & integration tests
npm test

# Run syntax verification across all files
npm run check
```

---

## 📜 License
MIT License. Built for modern, high-security Discord communities.
