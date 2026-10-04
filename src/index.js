// ==========================================
// 🛡️ Starry SUPREME MASTER ENGINE - INDEX.JS
// 150+ Commands • Multi-Bot Clustering • Fixed Comma Prefix (,) • 1-Year Interaction Lifetime
// ==========================================

require('dotenv').config();

// 🌐 Modern Dual-Stack Happy Eyeballs (Auto-selects working IPv4/IPv6 on mobile/cellular networks)
const net = require('net');
try {
    if (typeof net.setDefaultAutoSelectFamily === 'function') {
        net.setDefaultAutoSelectFamily(true);
    }
} catch (e) {}

// 🔧 Polyfill for older / 32-bit Node.js versions
if (!Promise.withResolvers) {
    Promise.withResolvers = function () {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
}

try {
    process.env.FFMPEG_PATH = require('ffmpeg-static') || 'ffmpeg';
} catch (e) {
    process.env.FFMPEG_PATH = 'ffmpeg';
}
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    Collection, 
    Events, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    PermissionFlagsBits,
    MessageFlags,
    Status
} = require('discord.js');
const express = require('express');
const cors = require('cors'); 
const http = require('http');
const https = require('https'); 
const mongoose = require('mongoose'); 
const { Connectors } = require('shoukaku');
const { Kazagumo } = require('kazagumo');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const KazagumoSpotify = require('kazagumo-spotify');
const { cleanToken, maskToken, verifyDiscordToken } = require('./utils/tokenSanitizer');

// ==========================================
// 🔋 TERMUX WAKE LOCK HELPERS
// ==========================================
let lastWakeLockTime = 0;
function acquireWakeLock(forceLog = false) {
    try {
        child_process.exec('termux-wake-lock', (err) => {
            if (!err) {
                const now = Date.now();
                if (forceLog || now - lastWakeLockTime > 300000) {
                    console.log('🔋 [Termux] Wake lock active & refreshed (termux-wake-lock)');
                    lastWakeLockTime = now;
                }
            }
        });
    } catch (e) {}
}

function releaseWakeLock() {
    try {
        child_process.execSync('termux-wake-unlock', { stdio: 'ignore' });
        console.log('🔌 [Termux] Wake lock released (termux-wake-unlock)');
    } catch (e) {}
}

const config = require('./config');
const multiBot = require('./modules/multiBot');
const commandRegistry = require('./modules/commandHandler');
const { ONE_YEAR_MS, EPHEMERAL_FLAG } = require('./utils/contextHelper');

// Safely Require Bump Engine & Model
let bumpEngine = null;
let ServerListing = null;
try {
    bumpEngine = require('./modules/bumpEngine');
    ServerListing = bumpEngine.ServerListing || mongoose.models.ServerListing;
} catch (e) {
    try {
        bumpEngine = require('../modules/bumpEngine');
        ServerListing = bumpEngine.ServerListing || mongoose.models.ServerListing;
    } catch (err) {}
}

const app = express();
const port = process.env.PORT || 10000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

app.get('/api/servers', async (req, res) => {
    try {
        if (!ServerListing) return res.json([]);
        const servers = await ServerListing.find({ isListed: true }).sort({ lastBump: -1 }).limit(50);
        res.json(servers);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch servers' });
    }
});

app.get('/api/multibot/stats', (req, res) => {
    try {
        const stats = multiBot.getClusterStats();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get(['/health', '/ping'], (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime(), bot: client?.user?.tag || 'ready' }));

app.get('/api/status', (req, res) => {
    res.json({
        status: client && client.isReady() ? 'online' : (isBootingBot ? 'booting' : (lastBootstrapError ? 'error' : 'waiting_for_token')),
        bot: client && client.user ? `${client.user.username}#${client.user.discriminator || '0'}` : null,
        botId: client && client.user ? client.user.id : null,
        uptime: process.uptime(),
        mongo: mongoose.connection && mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        hasToken: Boolean(process.env.DISCORD_TOKEN || process.env.BOT_TOKEN || process.env.TOKEN),
        lastError: lastBootstrapError,
        preflight: lastPreflight
    });
});

app.get('/setup', (req, res) => {
    const isOnline = Boolean(client && client.isReady());
    const botUser = client && client.user ? `${client.user.username}#${client.user.discriminator || '0'}` : null;
    
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Starry Bot — Cloud Activation Portal</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0b0e14;
            --card: #151922;
            --primary: #5865f2;
            --text: #f3f4f6;
            --muted: #9ca3af;
            --success: #10b981;
            --danger: #ef4444;
            --border: rgba(255,255,255,0.08);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
        body { background: var(--bg); color: var(--text); display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 32px; max-width: 520px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
        p { color: var(--muted); font-size: 0.95rem; line-height: 1.5; margin-bottom: 20px; }
        .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 999px; font-size: 0.85rem; font-weight: 700; margin-bottom: 24px; }
        .badge.online { background: rgba(16,185,129,0.15); color: var(--success); border: 1px solid var(--success); }
        .badge.waiting { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid #f59e0b; }
        label { display: block; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; color: var(--muted); }
        input { width: 100%; padding: 14px; background: #0e1117; border: 1px solid var(--border); border-radius: 10px; color: #fff; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; margin-bottom: 18px; outline: none; transition: border-color 0.2s; }
        input:focus { border-color: var(--primary); }
        button { width: 100%; padding: 15px; background: var(--primary); border: none; border-radius: 10px; color: #fff; font-size: 1rem; font-weight: 700; cursor: pointer; transition: 0.2s; }
        button:hover { background: #4752c4; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        .alert { padding: 14px; border-radius: 10px; font-size: 0.9rem; margin-top: 18px; display: none; line-height: 1.5; }
        .alert.success { background: rgba(16,185,129,0.15); color: var(--success); border: 1px solid var(--success); display: block; }
        .alert.error { background: rgba(239,68,68,0.15); color: var(--danger); border: 1px solid var(--danger); display: block; }
        .info-box { background: rgba(88,101,242,0.1); border: 1px solid rgba(88,101,242,0.3); border-radius: 10px; padding: 14px; font-size: 0.85rem; color: #cbd5e1; margin-top: 20px; line-height: 1.5; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🌟 Starry Cloud Activation</h1>
        <p>Your web service is live on Render! ${isOnline ? 'The bot is online and connected to Discord.' : 'To bring the bot online on Discord, paste your credentials below:'}</p>
        
        <div class="badge ${isOnline ? 'online' : 'waiting'}">
            <span>●</span> ${isOnline ? 'Bot Online: ' + botUser : 'Status: Waiting for Discord Token'}
        </div>

        ${isOnline ? `
            <div class="alert success">
                ✅ <strong>Starry is Active & Online!</strong><br>
                Connected as <code>${botUser}</code>. All 150+ slash commands, automod, leveling, and music features are ready on Discord.
            </div>
        ` : `
            <form id="activateForm">
                <label for="discordToken">Discord Bot Token (Required)</label>
                <input type="password" id="discordToken" name="token" placeholder="Paste your bot token here" required autocomplete="off" />
                
                <label for="mongoUri">MongoDB URI (Optional)</label>
                <input type="password" id="mongoUri" name="mongoUri" placeholder="mongodb+srv://..." autocomplete="off" />
                
                <button type="submit" id="submitBtn">⚡ Connect Starry to Discord</button>
                <div id="resultMsg" class="alert"></div>
            </form>
            <div class="info-box">
                💡 <strong>Permanent Cloud Setup:</strong> You can also set <code>DISCORD_TOKEN</code> permanently in your 
                <a href="https://dashboard.render.com" target="_blank" style="color:var(--primary); font-weight:700;">Render Dashboard</a> under <strong>Environment</strong>.
            </div>
            <script>
                document.getElementById('activateForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const btn = document.getElementById('submitBtn');
                    const msg = document.getElementById('resultMsg');
                    btn.disabled = true;
                    btn.textContent = 'Verifying with Discord...';
                    msg.style.display = 'none';

                    try {
                        const res = await fetch('/api/activate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                token: document.getElementById('discordToken').value.trim(),
                                mongoUri: document.getElementById('mongoUri').value.trim()
                            })
                        });
                        const data = await res.json();
                        if (data.success) {
                            msg.className = 'alert success';
                            msg.innerHTML = '🎉 <strong>' + data.message + '</strong><br>Bot is now connecting to Discord. Refreshing status...';
                            setTimeout(() => window.location.reload(), 2500);
                        } else {
                            msg.className = 'alert error';
                            msg.innerHTML = '❌ <strong>Error:</strong> ' + data.error;
                            btn.disabled = false;
                            btn.textContent = '⚡ Connect Starry to Discord';
                        }
                    } catch (err) {
                        msg.className = 'alert error';
                        msg.innerHTML = '❌ Network error: ' + err.message;
                        btn.disabled = false;
                        btn.textContent = '⚡ Connect Starry to Discord';
                    }
                });
            </script>
        `}
    </div>
</body>
</html>`);
});

app.post('/api/activate', async (req, res) => {
    if (client && client.isReady()) {
        return res.json({ success: true, message: `Bot is already online as ${client.user.tag}` });
    }

    const { token, mongoUri } = req.body || {};
    const sanitizedToken = cleanToken(token);
    if (!sanitizedToken) {
        return res.status(400).json({ success: false, error: 'A valid Discord Bot Token is required.' });
    }

    // Verify token with Discord REST API
    const preflight = await verifyDiscordToken(sanitizedToken);
    if (!preflight.valid) {
        return res.status(401).json({ 
            success: false, 
            error: `Discord rejected this token (${preflight.status || 'Error'}): ${preflight.error || 'Invalid Bot Token'}` 
        });
    }

    // Persist to local .env in container
    try {
        let envContent = `DISCORD_TOKEN=${sanitizedToken}\nTOKEN=${sanitizedToken}\n`;
        if (mongoUri && mongoUri.trim()) envContent += `MONGO_URI=${mongoUri.trim()}\n`;
        if (process.env.CLIENT_ID) envContent += `CLIENT_ID=${process.env.CLIENT_ID}\n`;
        fs.writeFileSync(path.join(process.cwd(), '.env'), envContent, 'utf8');
    } catch (e) {}

    process.env.DISCORD_TOKEN = sanitizedToken;
    process.env.TOKEN = sanitizedToken;
    if (mongoUri && mongoUri.trim()) process.env.MONGO_URI = mongoUri.trim();

    // Trigger boot
    startBot(sanitizedToken, mongoUri).catch(err => {
        console.error('Activation boot error:', err);
    });

    return res.json({ 
        success: true, 
        message: `Token Verified! Connected identity: ${preflight.bot.username}#${preflight.bot.discriminator || '0'}` 
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🌐 Web Dashboard & Server listening on port ${port}`);

    // High-Resilience Anti-Sleep Keep-Alive Engine (Runs every 3 minutes)
    // Render Free Web Services sleep after 15 minutes of inbound HTTP inactivity.
    const externalUrl = process.env.RENDER_EXTERNAL_URL || (process.env.RENDER_EXTERNAL_HOSTNAME ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` : null);
    if (externalUrl) {
        console.log(`🌐 [Keep-Alive] External self-ping active for ${externalUrl} (interval: 3 mins)`);
    } else {
        console.log('ℹ️ [Keep-Alive] Note: Set RENDER_EXTERNAL_URL on Render environment for external awake pinging.');
    }

    setInterval(() => {
        // 1. Local loopback keep-alive (keeps node event loop alive)
        http.get(`http://127.0.0.1:${port}/health`, { timeout: 5000 }, (res) => {
            res.resume();
        }).on('error', () => {});

        // 2. External Render inbound HTTP ping (prevents Render 15-minute container freeze)
        if (externalUrl) {
            const clientModule = externalUrl.startsWith('https') ? https : http;
            clientModule.get(`${externalUrl}/health`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StarryKeepAlive/2.0)' },
                timeout: 8000
            }, (res) => {
                res.resume();
            }).on('error', () => {});
        }
    }, 180000);
});

// Create Primary Bot Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User, Partials.GuildMember],
    failIfNotExists: false,
    rest: {
        timeout: 30000,
        retries: 5
    },
    ws: {
        large_threshold: 50
    }
}); 

client.setMaxListeners(50);
client.commands = new Collection(); 
client.prefixCommands = new Collection();
client.aliases = new Collection();
client.verifyMap = new Map(); 
client.voiceCalls = new Map();
client.vcLocks = new Map();

// Mount Starry Enterprise Web Dashboard & Payment Suite
const { setupDashboardRoutes } = require('./modules/dashboardServer');
setupDashboardRoutes(app, client);

// Initialize 24/7 Global Public Tunnel
const { startTunnel } = require('./utils/tunnelManager');
startTunnel(port).catch(() => {});

// Automatically acquire Termux Wake Lock on client initialization
acquireWakeLock();

// Global Mass Ping AutoMod
client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot || !message.member) return;

    const rawPings = (message.content.match(/<@!?\d+>|<@&\d+>|@everyone|@here/g) || []).length;
    const parsedPings = message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 1 : 0);
    const totalPings = Math.max(rawPings, parsedPings);

    if (totalPings >= 5) {
        const botMember = message.guild.members.me;
        if (!botMember) return;

        if (message.author.id === message.guild.ownerId) return;
        if (message.member.roles.highest.position >= botMember.roles.highest.position) return;

        try {
            if (message.channel.permissionsFor(botMember)?.has(PermissionFlagsBits.ManageMessages)) {
                await message.delete();
            }
        } catch (err) {}

        if (botMember.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            await message.member.timeout(10 * 60 * 1000, `Mass Ping AutoMod (${totalPings} mentions)`).catch(() => {});
            
            const warn = await message.channel.send(`🛡️ **AutoMod:** <@${message.author.id}> was timed out for 10 minutes for mass mentioning (${totalPings} pings)!`).catch(() => null);
            if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);
        }
    }
});

// Verification Web Routes
app.get('/verify', async (req, res) => {
    const token = req.query.token;
    if (!token || !client.verifyMap || !client.verifyMap.has(token)) {
        return res.status(400).send(`
            <html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Starry Verification</title></head>
            <body style="background-color:#1e1f22; color:#dbdee1; font-family:system-ui, -apple-system, sans-serif; text-align:center; padding:15vh 20px 0;">
                <div style="max-width:480px; margin:0 auto; background:#2b2d31; padding:35px 25px; border-radius:12px; border:1px solid #3f4147;">
                    <div style="font-size:48px; margin-bottom:15px;">⏱️</div>
                    <h2 style="color:#f23f43; margin:0 0 12px;">Link Expired or Invalid</h2>
                    <p style="color:#949ba4; font-size:15px; line-height:1.5;">This verification session has expired or has already been used.</p>
                    <p style="color:#949ba4; font-size:14px; line-height:1.5; margin-top:15px;">👉 <b>Tip:</b> Return to Discord and click <b>"⚡ Verify in Discord (Instant)"</b> on the bot message to verify immediately with zero browser errors.</p>
                </div>
            </body></html>
        `);
    }

    const data = client.verifyMap.get(token);
    const guild = data?.guildId ? (client.guilds.cache.get(data.guildId) || await client.guilds.fetch(data.guildId).catch(() => null)) : null;
    const guildName = guild ? guild.name : 'Discord Server';
    const botAvatar = client.user ? client.user.displayAvatarURL({ extension: 'png' }) : 'https://cdn.discordapp.com/embed/avatars/0.png';

    res.send(`
        <!DOCTYPE html>
        <html><head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Human Verification - ${guildName}</title>
            <style>
                body { background-color:#1e1f22; color:#dbdee1; font-family:system-ui, -apple-system, sans-serif; display:flex; justify-content:center; align-items:center; min-height:100vh; margin:0; padding:20px; box-sizing:border-box; }
                .card { background:#2b2d31; padding:35px 25px; border-radius:12px; max-width:440px; width:100%; text-align:center; border:1px solid #3f4147; box-shadow:0 8px 24px rgba(0,0,0,0.4); }
                .avatar { width:88px; height:88px; border-radius:50%; margin-bottom:18px; border:3px solid #23a559; }
                h2 { color:#ffffff; margin:0 0 8px; font-size:22px; }
                p { color:#949ba4; font-size:14px; line-height:1.5; margin:0 0 24px; }
                button { width:100%; padding:14px 20px; font-size:16px; font-weight:600; background-color:#23a559; color:white; border:none; border-radius:8px; cursor:pointer; transition:background 0.2s, transform 0.1s; }
                button:hover { background-color:#1f944f; }
                button:active { transform:scale(0.98); }
            </style>
        </head>
        <body>
            <div class="card">
                <img src="${botAvatar}" class="avatar" alt="Bot Avatar">
                <h2>Human Verification</h2>
                <p>Confirm you are human to unlock full channel access in <b>${guildName}</b>.</p>
                <form action="/verify" method="POST">
                    <input type="hidden" name="token" value="${token}">
                    <button type="submit" id="btn">I am human (Verify Now)</button>
                </form>
            </div>
            <script>
                document.querySelector('form').addEventListener('submit', function() {
                    const btn = document.getElementById('btn');
                    btn.disabled = true;
                    btn.innerText = 'Verifying security token...';
                });
            </script>
        </body></html>
    `);
});

app.post('/verify', async (req, res) => {
    const token = req.body?.token;
    if (!token || !client.verifyMap || !client.verifyMap.has(token)) {
        return res.status(400).send(`
            <html><body style="background-color:#1e1f22; color:#dbdee1; font-family:sans-serif; text-align:center; padding-top:15vh;">
                <h1 style="color:#f23f43;">❌ Token Expired or Invalid</h1>
                <p>Please return to Discord and click the verify button again.</p>
            </body></html>
        `);
    }

    const data = client.verifyMap.get(token);
    try {
        const guild = client.guilds.cache.get(data.guildId) || await client.guilds.fetch(data.guildId).catch(() => null);
        if (!guild) {
            return res.send('<h1 style="color:#f23f43; text-align:center; font-family:sans-serif; padding-top:15vh;">❌ Discord Server Not Found.</h1>');
        }

        const member = await guild.members.fetch(data.userId).catch(() => null);
        if (!member) {
            return res.send('<h1 style="color:#f23f43; text-align:center; font-family:sans-serif; padding-top:15vh;">❌ Member not found in Discord server.</h1>');
        }

        const { resolveTargetRole } = require('./modules/verification');
        const targetRole = await resolveTargetRole(guild, data.roleId);

        if (!targetRole) {
            return res.send('<h1 style="color:#f23f43; text-align:center; font-family:sans-serif; padding-top:15vh;">❌ Verified role is not configured. Please contact server admins.</h1>');
        }

        const botMember = guild.members.me || await guild.members.fetch(client.user.id).catch(() => null);
        if (botMember && targetRole.position >= botMember.roles.highest.position) {
            return res.send(`
                <body style="background-color:#1e1f22; color:white; font-family:sans-serif; text-align:center; padding-top:15vh;">
                    <h1 style="color:#faa81a;">⚠️ Role Hierarchy Misconfiguration</h1>
                    <p style="color:#b5bac1;">The role <b>${targetRole.name}</b> is above or equal to the bot role in Server Settings.</p>
                    <p style="color:#949ba4;">Ask an administrator to drag the bot role above <b>${targetRole.name}</b>.</p>
                </body>
            `);
        }

        await member.roles.add(targetRole, 'Starry Web Human Verification');
        client.verifyMap.delete(token);

        // Telemetry audit notification
        try {
            const chamberCh = guild.channels.cache.find(c => c.name === 'verification-chamber' || c.name === 'audit-log' || c.name === 'mod-logs');
            if (chamberCh && chamberCh.isTextBased()) {
                const { EmbedBuilder } = require('discord.js');
                const logEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('🟢 Member Human Verification Complete')
                    .setDescription(`**User Verified:** <@${member.id}> (\`${member.user.tag}\`) completed web human verification.`)
                    .setTimestamp();
                chamberCh.send({ embeds: [logEmbed] }).catch(() => {});
            }
        } catch (e) {}

        res.send(`
            <html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Verification Success</title></head>
            <body style="background-color:#1e1f22; color:white; font-family:system-ui, -apple-system, sans-serif; text-align:center; padding-top:18vh;">
                <div style="max-width:440px; margin:0 auto; background:#2b2d31; padding:35px 25px; border-radius:12px; border:1px solid #3f4147;">
                    <h1 style="color:#23a559; font-size:42px; margin:0 0 10px;">✅ Success!</h1>
                    <h3 style="color:#ffffff; margin:0 0 15px;">You are now verified in ${guild.name}</h3>
                    <p style="color:#949ba4; font-size:15px; margin:0 0 25px;">You have received the <b>${targetRole.name}</b> role. You may close this tab and return to Discord.</p>
                </div>
            </body></html>
        `);
    } catch (error) {
        console.error('Web Verification Execution Error:', error);
        res.send(`<h1 style="color:#f23f43; text-align:center; font-family:sans-serif; padding-top:15vh;">❌ Verification Error: ${error.message || 'Unknown error'}. Ensure the bot role is positioned higher than the verification role.</h1>`);
    }
});

// ==========================================
// 🎵 LAVALINK & KAZAGUMO MUSIC CLUSTER
// ==========================================
const { createMusicManager } = require('./utils/musicManager');
createMusicManager(client);


client.on(Events.Error, err => console.error('❌ Discord Client Error:', err));
client.on(Events.Warn, warn => console.warn('⚠️ Discord Warning:', warn));
client.on(Events.ShardError, err => console.error('❌ WebSocket/Network Error:', err));
client.on(Events.ShardDisconnect, (event, id) => {
    console.warn(`⚠️ Gateway Shard #${id} Disconnected (Code: ${event?.code || 'N/A'}). Attempting automatic reconnection...`);
    acquireWakeLock();
});
client.on(Events.ShardReconnecting, (id) => console.log(`🔄 Gateway Shard #${id} Reconnecting to Discord...`));
client.on(Events.ShardResume, (id, replayedEvents) => console.log(`✅ Gateway Shard #${id} Resumed connection successfully (${replayedEvents} events synced).`));

process.on('unhandledRejection', error => console.error('❌ Unhandled Promise Rejection:', error.stack || error));
process.on('uncaughtException', error => console.error('❌ Uncaught Exception:', error.stack || error));

// ==========================================
// 🛡️ HIGH-RELIABILITY RECOVERY & HEALTH WATCHDOG
// ==========================================
mongoose.set('bufferTimeoutMS', 6000);

let isReconnectingMongo = false;
let mongoDisconnectedSince = null;
let mongoReconnectInterval = null;

async function attemptMongoReconnect() {
    if (!process.env.MONGO_URI) return;
    if (isReconnectingMongo || mongoose.connection.readyState === 1) return;
    isReconnectingMongo = true;
    console.log('🔄 [MongoDB Watchdog] Actively attempting to reconnect to MongoDB...');
    try {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close().catch(() => {});
        }
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            heartbeatFrequencyMS: 10000
        });
        console.log('🍃 [MongoDB Watchdog] Reconnected to MongoDB successfully!');
        mongoDisconnectedSince = null;
        if (mongoReconnectInterval) {
            clearInterval(mongoReconnectInterval);
            mongoReconnectInterval = null;
        }
    } catch (err) {
        console.warn(`⚠️ [MongoDB Watchdog] Reconnect attempt failed: ${err.message}. Will retry...`);
    } finally {
        isReconnectingMongo = false;
    }
}

let gatewayAbnormalCount = 0;
let watchdogCycle = 0;

setInterval(() => {
    watchdogCycle++;

    // 1. Maintain Termux Wake Lock Continuously (Every ~60s)
    if (watchdogCycle % 4 === 0) {
        acquireWakeLock();
    }

    // 2. Check MongoDB Connection Health
    if (process.env.MONGO_URI && mongoose.connection.readyState !== 1) {
        if (!mongoDisconnectedSince) mongoDisconnectedSince = Date.now();
        const downtime = Math.round((Date.now() - mongoDisconnectedSince) / 1000);
        console.warn(`⚠️ [Watchdog] MongoDB not ready (readyState: ${mongoose.connection.readyState}, down for ${downtime}s). Triggering active reconnect...`);
        attemptMongoReconnect();

        if (downtime > 300) {
            // Keep bot running with in-memory fallbacks even if MongoDB is unreachable
            if (watchdogCycle % 10 === 0) {
                console.warn(`⚠️ [Watchdog] MongoDB offline for ${downtime}s. Running in high-resilience mode with local/in-memory state.`);
            }
        }
    }

    // 3. Check Primary Discord Gateway WebSocket & Zombie Heartbeat State
    // Provide a 3-minute startup grace period for Discord heartbeat cycles and shard latency negotiation
    if (client.ws && client.isReady() && client.uptime > 180000) {
        const ping = client.ws.ping;
        const shard = client.ws.shards?.first();
        const lastPing = shard?.lastPingTimestamp || 0;
        const timeSinceLastPing = lastPing > 0 ? (Date.now() - lastPing) : 0;
        const status = client.ws.status;

        // True Zombie socket detection:
        // - Socket status is explicitly Disconnected (Status.Disconnected = 5)
        // - OR Heartbeat ACK missing for >180s (Discord heartbeat interval is ~41.25s) AND ping > 60000ms
        const isDisconnected = (status === Status.Disconnected);
        const isZombiePing = (ping > 60000 && lastPing > 0 && timeSinceLastPing > 180000);

        if (isDisconnected || isZombiePing) {
            gatewayAbnormalCount++;
            console.warn(`⚠️ [Watchdog] Gateway abnormal (status: ${status}, ping: ${ping}ms, lastPingAck: ${Math.round(timeSinceLastPing / 1000)}s ago) [Check ${gatewayAbnormalCount}/20]`);
            
            // At check 8 (2 minutes of abnormal status), attempt graceful shard reconnection before forcing process restart
            if (gatewayAbnormalCount === 8) {
                console.warn('🔄 [Watchdog] Gateway unresponsive for 2 minutes. Requesting Shard reconnect...');
                try {
                    shard?.reconnect?.();
                } catch (recErr) {
                    console.error('Shard reconnect trigger failed:', recErr.message);
                }
            }

            // Only if disconnected continuously for 5 minutes (20 checks * 15s) do we restart the container
            if (gatewayAbnormalCount >= 20) {
                console.error('🛑 [Watchdog] Gateway stuck in dead/disconnected state for >5 minutes. Initiating recovery restart...');
                gatewayAbnormalCount = 0;
                process.exit(1);
            }
        } else {
            gatewayAbnormalCount = 0;
        }
    } else {
        // Startup grace period active or bot not ready yet
        gatewayAbnormalCount = 0;
    }

    // 4. Check Multi-Bot Cluster Worker Nodes
    try {
        const instances = multiBot?.instances;
        if (instances && instances.size > 1) {
            for (const [id, info] of instances.entries()) {
                if (info.isPrimary || !info.client) continue;
                const worker = info.client;
                if (worker.ws && worker.isReady() && worker.uptime > 180000) {
                    const wStatus = worker.ws.status;
                    const wPing = worker.ws.ping;
                    if (wStatus !== 0 || (wPing > 30000)) {
                        console.warn(`⚠️ [Watchdog] Worker Bot [${info.name}] socket jitter (status: ${wStatus}, ping: ${wPing}ms).`);
                    }
                }
            }
        }
    } catch (e) {}
}, 15000);

client.once(Events.ClientReady, async () => {
    lastBootstrapError = null;
    if (bootRetryTimer) {
        clearTimeout(bootRetryTimer);
        bootRetryTimer = null;
    }
    console.log(`🚀 Successfully logged in as Primary Bot: ${client.user.tag}`);
    acquireWakeLock();

    try {
        if (client.manager && typeof client.manager.init === 'function') {
            await client.manager.init(client.user.id);
            console.log('🎵 Kazagumo Multi-Node Music Manager successfully initialized!');
        }
    } catch (lavalinkErr) {
        console.error('❌ Lavalink Initialization Failed:', lavalinkErr.message);
    }

    try {
        if (client.application && !client.application.owner) {
            await client.application.fetch().catch(() => {});
        }
        if (client.application?.owner) {
            config.isBotOwner('0', client);
        }
    } catch (e) {}

    // Initialize 150+ Master Commands Registry & Unified Dispatcher
    commandRegistry.init(client);

    try {
        console.log("🔄 Auto-deploying updated command payload to Discord...");
        let deploy = null;
        try { deploy = require('../deploy-commands.js'); } catch (e1) {
            try { deploy = require('./deploy-commands.js'); } catch (e2) {
                try { deploy = require('../../deploy-commands.js'); } catch (e3) {}
            }
        }
        if (deploy && typeof deploy.deployCommands === 'function') {
            await deploy.deployCommands(client);
        }
    } catch (err) {
        console.warn("⚠️ Automatic command deployment skipped or encountered error:", err.message);
    }
});

// 🌟 Multilingual Welcome & Setup Card on Server Join
client.on(Events.GuildCreate, async (guild) => {
    try {
        if (!guild || !guild.available) return;
        const isPrimary = !multiBot?.primaryClient || (client.user?.id === multiBot.primaryClient?.user?.id);
        if (!isPrimary) return; // Only primary bot posts the server greeting

        const { createWelcomeSetupCard } = require('./utils/i18n');
        let targetChannel = guild.systemChannel;

        if (!targetChannel || !targetChannel.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages)) {
            targetChannel = guild.channels.cache.find(c => 
                c.isTextBased() && 
                c.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages)
            );
        }

        if (targetChannel) {
            const welcomePayload = createWelcomeSetupCard(guild, 'en', client.user);
            await targetChannel.send(welcomePayload).catch(() => {});
            console.log(`🌐 [i18n] Dispatched multilingual setup greeting to "${guild.name}" (#${targetChannel.name})`);
        }
    } catch (e) {
        console.error('⚠️ Error sending server join setup greeting:', e.message);
    }
});


// Module Initializers (Background systems)
const MODULE_INITIALIZERS = [
    { name: 'Automod', fn: () => require('./modules/automod.js')(client, app) },
    { name: 'Premium', fn: () => require('./modules/premium.js')(client, app) },
    { name: 'Translator', fn: () => require('./modules/translator.js')(client, app) },
    { name: 'Reaction Roles', fn: () => require('./modules/reactionRoles.js')(client, app) },
    { name: 'Help', fn: () => require('./modules/help.js')(client, app) },
    { name: 'Leveling', fn: () => require('./modules/leveling.js')(client, app) },
    { name: 'Starry Protocol', fn: () => require('./modules/starry.js')(client, app) },
    { name: 'Boost Tracker', fn: () => require('./modules/boostTracker.js')(client, app) },
    { name: 'Booster Synergy Engine', fn: () => require('./modules/boosterRoleEngine.js')(client, app) },
    { name: 'Color Role Engine', fn: () => require('./modules/colorRoleEngine.js')(client, app) },
    { name: 'Truth or Dare', fn: () => require('./modules/truthOrDare.js')(client, app) },
    { name: 'Support Tickets', fn: () => {
        try { return require('./modules/tickets.js')(client, app); } catch (e) {
            return require('./modules/ticket.js')(client, app);
        }
    }},
    { name: 'Admin Help Text Trigger', fn: () => require('./modules/ahelpText.js')(client, app) },
    { name: 'Tracker', fn: () => require('./modules/tracker.js')(client, app) },
    { name: 'Sus Account Detector', fn: () => require('./modules/susAccount.js')(client, app) },
    { name: 'Whois Lookup', fn: () => require('./modules/whois.js')(client, app) },
    { name: 'Emoji Blocker', fn: () => require('./modules/emojiBlocker.js')(client, app) },
    { name: 'Master Setup Engine', fn: () => require('./modules/masterSetupText.js')(client, app) },
    { name: 'Server Stats', fn: () => require('./modules/serverStats.js')(client, app) },
    { name: 'AFK System', fn: () => require('./modules/afk.js')(client, app) },
    { name: 'Server Logs', fn: () => require('./modules/logs.js')(client, app) },
    { name: 'Giveaway', fn: () => require('./modules/giveaway.js')(client, app) },
    { name: 'Counting Game', fn: () => require('./modules/count.js')(client, app) },
    { name: 'Advanced Mod & Security', fn: () => require('./modules/advancedMod.js')(client, app) },
    { name: 'Interactive Mod Panel', fn: () => require('./modules/modPanel.js')(client, app) },
    { name: 'Reputation System', fn: () => require('./modules/rep.js')(client, app) },
    { name: 'Voice Channel Manager', fn: () => require('./modules/voiceManager.js')(client, app) },
    { name: 'Emoji Stealer', fn: () => require('./modules/steal.js')(client, app) },
    { name: 'Welcome System', fn: () => require('./modules/welcome.js')(client, app) },
    { name: 'Goodbye System', fn: () => require('./modules/goodbye.js')(client, app) },
    { name: 'Embed Visuality Studio', fn: () => require('./modules/embedVisuality.js')(client, app) },
    { name: 'Server Backup Engine', fn: () => require('./modules/backupEngine.js')(client, app) },
    { name: 'Role Manager', fn: () => require('./modules/roleManager.js')(client, app) },
    { name: 'Anti-Abuse', fn: () => require('./modules/antiAbuse.js')(client, app) },
    { name: 'Random Chest Drops', fn: () => require('./modules/chestDrop.js')(client, app) },
    { name: 'Autorole & Sticky Roles', fn: () => require('./modules/autorole.js')(client, app) },
    { name: 'Verification System', fn: () => require('./modules/verification.js')(client, app) },
    { name: 'Network Telemetry Engine', fn: () => require('./modules/telemetryEngine.js')(client, app) },
    { name: 'Social Actions Engine', fn: () => require('./modules/socialActions.js')(client, app) },
    { name: 'Anonymous Confession System', fn: () => require('./modules/confession.js')(client, app) },
    { name: 'Nitro & Giveaway Claim Sniffer', fn: () => require('./modules/nitroClaimDetector.js')(client, app) },
    { name: 'Developer DM Control Panel', fn: () => require('./modules/devPanel.js')(client, app) },
    { name: 'Starry Pop Mascot Engine', fn: () => require('./modules/starryPop.js')(client, app) },
    { name: 'Starlight Reminder Engine', fn: () => { const { initReminderWorker } = require('./modules/reminderEngine.js'); initReminderWorker(client); } },
    { name: 'Celestial Starboard Engine', fn: () => { const { initStarboard } = require('./modules/starboardEngine.js'); initStarboard(client); } },
    { name: 'Dynamic Orbit Voice Engine', fn: () => { const { initTempVoice } = require('./modules/tempVoice.js'); initTempVoice(client); } },
    { name: 'Pinned Channel Sticky Notice Engine', fn: () => { const { initSticky } = require('./modules/stickyEngine.js'); initSticky(client); } },
    { name: 'Antigravity CLI Auto-Updater', fn: () => {
        const { exec } = require('child_process');
        const runAgyUpdate = () => {
            exec('agy update -y', (err, stdout) => {
                if (!err && stdout && stdout.includes('Update completed')) {
                    console.log('✨ [Antigravity Engine] Successfully updated to the latest Antigravity CLI version!');
                }
            });
        };
        setTimeout(runAgyUpdate, 15000);
        setInterval(runAgyUpdate, 6 * 60 * 60 * 1000);
    }},
    { name: 'Native AutoMod Badge Engine', fn: () => require('./modules/nativeAutoMod.js')(client) }
];

let isBootingBot = false;
let tokenCheckInterval = null;
let lastBootstrapError = null;
let lastPreflight = null;
let bootRetryTimer = null;

async function startBot(overrideToken, overrideMongo) {
    if ((client && client.isReady()) || isBootingBot) return;
    isBootingBot = true;

    try {
        if (overrideToken) {
            process.env.DISCORD_TOKEN = overrideToken;
            process.env.TOKEN = overrideToken;
        }
        if (overrideMongo) {
            process.env.MONGO_URI = overrideMongo;
        }

        let sourceVar = 'DISCORD_TOKEN';
        let rawToken = process.env.DISCORD_TOKEN;
        if (!rawToken && process.env.BOT_TOKEN) {
            rawToken = process.env.BOT_TOKEN;
            sourceVar = 'BOT_TOKEN';
        } else if (!rawToken && process.env.TOKEN) {
            rawToken = process.env.TOKEN;
            sourceVar = 'TOKEN';
        }

        const primaryToken = cleanToken(rawToken);
        if (!primaryToken) {
            isBootingBot = false;
            lastBootstrapError = 'DISCORD_TOKEN environment variable is missing on Render. Please configure it in Render Dashboard -> Environment or via /setup.';
            console.error("🛑 CRITICAL ERROR: Discord Bot Token is missing!");
            console.error(`- Bot Token (${sourceVar}): MISSING`);
            console.error(`- MONGO_URI: ${process.env.MONGO_URI ? 'Present' : 'Not configured (optional)'}`);
            console.error("------------------------------------------------------------------");
            console.error("👉 ACTION REQUIRED ON RENDER DASHBOARD OR WEB PORTAL:");
            console.error("1. Easiest Option: Open your Render URL /setup in your phone browser");
            console.error("   and paste your bot token to activate instantly!");
            console.error("2. Permanent Dashboard Option: Go to Render Dashboard -> Environment tab.");
            console.error("   Add variable: DISCORD_TOKEN = <your_token>");
            console.error("------------------------------------------------------------------");
            console.warn(`🌐 Express Web Server & Health Check are ACTIVE on port ${port}.`);
            console.warn(`⏳ Keeping service running to keep Render deployment healthy while waiting for DISCORD_TOKEN.`);

            if (!tokenCheckInterval) {
                tokenCheckInterval = setInterval(async () => {
                    try {
                        const envPath = path.join(process.cwd(), '.env');
                        if (fs.existsSync(envPath)) {
                            require('dotenv').config({ path: envPath, override: true });
                            const checkToken = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN || process.env.TOKEN;
                            if (checkToken) {
                                console.log('✨ [Auto-Detect] Detected bot token in environment/secret file! Booting bot...');
                                clearInterval(tokenCheckInterval);
                                tokenCheckInterval = null;
                                await startBot();
                            }
                        }
                    } catch (e) {}
                }, 10000);
            }
            return;
        }

        if (tokenCheckInterval) {
            clearInterval(tokenCheckInterval);
            tokenCheckInterval = null;
        }

        console.log(`🔑 Bot Token detected from ${sourceVar}: ${maskToken(primaryToken)}`);

        // Pre-flight REST verification with Discord API
        console.log('📡 Verifying bot token with Discord REST API...');
        const preflight = await verifyDiscordToken(primaryToken);
        lastPreflight = preflight;
        if (!preflight.valid) {
            lastBootstrapError = `Discord REST API rejected token (${preflight.status || 'Network error'}): ${preflight.error || preflight.networkError}`;
            console.error('🛑 DISCORD TOKEN VERIFICATION FAILED!');
            console.error(`Status: ${preflight.status || 'Network/Fetch error'}`);
            console.error(`Response from Discord: ${preflight.error || preflight.networkError}`);
            console.error(`Masked token in environment: ${maskToken(primaryToken)}`);
            console.error('------------------------------------------------------------------');
            console.error('👉 ACTION REQUIRED ON RENDER DASHBOARD:');
            console.error('1. Open https://dashboard.render.com and select your service.');
            console.error('2. Go to the "Environment" tab.');
            console.error('3. Ensure DISCORD_TOKEN is set strictly to your bot token string');
            console.error('   without "DISCORD_TOKEN=" in the value box and without quotes.');
            console.error('------------------------------------------------------------------');
        } else {
            console.log(`✨ Discord Token Verified! Bot identity: ${preflight.bot.username}#${preflight.bot.discriminator || '0'} (ID: ${preflight.bot.id})`);
        }

    if (process.env.MONGO_URI) {
        try {
            await mongoose.connect(process.env.MONGO_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                maxPoolSize: 10,
                heartbeatFrequencyMS: 10000
            });
            console.log('🍃 Successfully connected to MongoDB Cloud!');

            const { initLanguageCache } = require('./utils/i18n');
            await initLanguageCache(client).catch(() => {});
        } catch (mongoInitErr) {
            console.warn(`⚠️ [MongoDB Boot] Initial connect failed (${mongoInitErr.message}). Continuing bot startup with local fallbacks; reconnecting in background...`);
            if (!mongoDisconnectedSince) mongoDisconnectedSince = Date.now();
            if (!mongoReconnectInterval) {
                mongoReconnectInterval = setInterval(attemptMongoReconnect, 5000);
            }
        }

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB connection lost. Triggering active auto-reconnect engine...');
            if (!mongoDisconnectedSince) mongoDisconnectedSince = Date.now();
            if (!mongoReconnectInterval) {
                mongoReconnectInterval = setInterval(attemptMongoReconnect, 5000);
            }
            attemptMongoReconnect();
        });
        mongoose.connection.on('reconnected', () => {
            console.log('🍃 MongoDB reconnected successfully.');
            mongoDisconnectedSince = null;
            if (mongoReconnectInterval) {
                clearInterval(mongoReconnectInterval);
                mongoReconnectInterval = null;
            }
            // Refresh language cache after reconnection
            const { initLanguageCache } = require('./utils/i18n');
            initLanguageCache(client).catch(() => {});
        });
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB Connection Error:', err.message);
        });
    } else {
        console.warn('⚠️ [MongoDB Boot] MONGO_URI is not set. Bot will operate in high-resilience mode with local/in-memory state.');
    }

    try {
        const bumpModule = require('./modules/bumpEngine.js');
            if (typeof bumpModule === 'function') {
                bumpModule(client, app);
                console.log('✅ Registered Directory API Endpoints with Express Web Server!');
            }
        } catch (e) {
            console.error('⚠️ Could not load bumpEngine API routes:', e.message);
        }

        // 1. Connect Primary Client to Discord Gateway IMMEDIATELY
        console.log('🚀 Connecting Primary Bot to Discord Gateway...');
        await client.login(primaryToken);
        console.log('✨ Primary Bot login sequence initiated successfully!');

        // 2. Initialize Background Modules
        for (const mod of MODULE_INITIALIZERS) {
            try {
                await Promise.resolve(mod.fn());
                console.log(`✅ ${mod.name} Module Loaded`);
            } catch (err) {
                console.error(`❌ Error loading ${mod.name}:`, err.message);
            }
        }

        // 3. Boot Multi-Bot Cluster Worker Nodes
        await multiBot.initAll(client, primaryToken);

    } catch (error) {
        isBootingBot = false;
        lastBootstrapError = error.message || String(error);
        console.error("🛑 BOOTSTRAP ERROR:\n", error.stack || error);
        console.warn("⚠️ Keeping web server active so deployment remains healthy on Render. Check /setup to re-enter credentials.");

        // Automatically retry login after 15 seconds to overcome transient Discord gateway rate limits / handshakes
        if (!bootRetryTimer) {
            console.log("🔄 Scheduling automated bot boot retry in 15 seconds...");
            bootRetryTimer = setTimeout(async () => {
                bootRetryTimer = null;
                await startBot();
            }, 15000);
        }
    }
}

const shutdownHandler = async (signal) => {
    console.log(`⚠️ Received ${signal}. Gracefully shutting down Starry Bot...`);
    try {
        releaseWakeLock();
        if (mongoose.connection.readyState === 1) await mongoose.connection.close();
        if (client) client.destroy();
        for (const [id, info] of multiBot.instances.entries()) {
            if (info.client && !info.isPrimary) {
                try { info.client.destroy(); } catch (e) {}
            }
        }
        console.log("👋 Clean shutdown completed.");
        process.exit(0);
    } catch (err) {
        console.error("Error during graceful shutdown:", err);
        releaseWakeLock();
        process.exit(1);
    }
};

process.on('SIGINT', () => shutdownHandler('SIGINT'));
process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
process.on('exit', () => releaseWakeLock());

startBot();
