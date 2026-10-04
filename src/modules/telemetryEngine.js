// ==========================================
// 📡 SUPREME NETWORK & SERVER TELEMETRY ENGINE
// File Path: src/modules/telemetryEngine.js
// Precision Real-Time Metrics • Per-Server Search & Analytics • Configurable 6-Hour Scheduler
// Zero Unsolicited DM Spam • 100% Owner Controlled
// ==========================================
const { EmbedBuilder, Events } = require('discord.js');
const GuildTelemetry = require('../models/GuildTelemetry');
const config = require('../config');

const voiceSessions = new Map(); // `${guildId}_${userId}` -> timestamp

function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}

function searchGuilds(client, query) {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();

    // 1. Exact ID Match
    const byId = client.guilds.cache.get(q);
    if (byId) return [byId];

    // 2. Exact or Partial Name Match
    const matches = client.guilds.cache.filter(g => 
        g.name.toLowerCase().includes(q) || 
        g.id.includes(q)
    );

    return Array.from(matches.values());
}

async function getOrCreateTelemetry(guild) {
    let doc = await GuildTelemetry.findOne({ guildId: guild.id });
    if (!doc) {
        doc = await GuildTelemetry.create({
            guildId: guild.id,
            guildName: guild.name
        });
    } else if (doc.guildName !== guild.name) {
        doc.guildName = guild.name;
        await doc.save().catch(() => {});
    }
    return doc;
}

function buildServerTelemetryEmbed(guild, telemetry, client) {
    const vcChannels = guild.channels.cache.filter(c => c.isVoiceBased?.() || c.type === 2);
    let activeVoiceMembers = 0;
    vcChannels.forEach(c => {
        activeVoiceMembers += c.members ? c.members.size : 0;
    });

    const textChannelsCount = guild.channels.cache.filter(c => c.isTextBased?.() && !c.isVoiceBased?.()).size;
    const rolesCount = guild.roles.cache.size;
    const emojisCount = guild.emojis.cache.size;

    const totalVcHours = (telemetry.totalVcSeconds / 3600).toFixed(1);
    const botMember = guild.members.me;

    const embed = new EmbedBuilder()
        .setColor(config.EMBED_COLORS.PRIMARY || '#5865F2')
        .setAuthor({ 
            name: `Server Telemetry & Diagnostics`, 
            iconURL: guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL() 
        })
        .setTitle(`📊 ${guild.name}`)
        .setThumbnail(guild.iconURL({ dynamic: true }) || null)
        .setDescription(
            `**Server ID:** \`${guild.id}\` | **Owner:** <@${guild.ownerId}>\n` +
            `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R> | **Shard ID:** \`#${guild.shardId || 0}\``
        )
        .addFields(
            {
                name: '👥 Member Dynamics',
                value: 
                    `• Total Population: **${guild.memberCount.toLocaleString()}**\n` +
                    `• Joins (This Hour): **+${telemetry.joinsThisHour || 0}**\n` +
                    `• Joins (Today): **+${telemetry.joinsToday || 0}**`,
                inline: true
            },
            {
                name: '🎙️ Voice & Audio Activity',
                value: 
                    `• Active in Voice: **${activeVoiceMembers}** users\n` +
                    `• Voice Channels: **${vcChannels.size}**\n` +
                    `• Lifetime Voice Time: **${totalVcHours} hrs**`,
                inline: true
            },
            {
                name: '💬 Infrastructure & Channels',
                value: 
                    `• Text Channels: **${textChannelsCount}**\n` +
                    `• Roles Configured: **${rolesCount}**\n` +
                    `• Custom Emojis: **${emojisCount}**`,
                inline: true
            },
            {
                name: '🛡️ Moderation & Security Interceptions',
                value: 
                    `• Warnings: **${telemetry.modStats?.warns || 0}** | Kicks: **${telemetry.modStats?.kicks || 0}**\n` +
                    `• Bans: **${telemetry.modStats?.bans || 0}** | AutoMod Triggers: **${telemetry.modStats?.automodTriggers || 0}**`,
                inline: false
            },
            {
                name: '⚡ Bot Node & Shard Health',
                value: 
                    `• WebSocket Ping: **${client.ws.ping}ms**\n` +
                    `• Permissions: **${botMember?.permissions?.has('Administrator') ? '👑 Administrator' : 'Standard DJ & Mod'}**\n` +
                    `• 6-Hour Auto Telemetry: **${telemetry.autoSchedule?.enabled ? `🟢 Enabled (${telemetry.autoSchedule.intervalHours}h)` : '🔴 Disabled'}**`,
                inline: false
            }
        )
        .setFooter({ text: `Requested on Starry Telemetry Engine • Prefix: ,` })
        .setTimestamp();

    return embed;
}

function buildGlobalTelemetryEmbed(client, allData) {
    const totalServers = client.guilds.cache.size;
    const totalUsers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
    
    let totalJoins = 0;
    let totalVcSeconds = 0;
    let totalWarns = 0, totalKicks = 0, totalBans = 0, totalAutomod = 0;

    allData.forEach(t => {
        totalJoins += (t.joinsThisHour || 0);
        totalVcSeconds += (t.totalVcSeconds || 0);
        totalWarns += (t.modStats?.warns || 0);
        totalKicks += (t.modStats?.kicks || 0);
        totalBans += (t.modStats?.bans || 0);
        totalAutomod += (t.modStats?.automodTriggers || 0);
    });

    const memoryMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const uptimeHrs = (process.uptime() / 3600).toFixed(1);

    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setAuthor({ name: 'Starry Global Master Telemetry', iconURL: client.user.displayAvatarURL() })
        .setTitle('🌐 Multi-Server Network Operations Center')
        .setDescription(`Comprehensive ecosystem health report across all connected Discord servers.`)
        .addFields(
            { 
                name: '🌍 Global Reach', 
                value: `• Connected Guilds: **${totalServers}**\n• Users Monitored: **${totalUsers.toLocaleString()}**\n• Uptime: **${uptimeHrs} hrs**`, 
                inline: true 
            },
            { 
                name: '🎙️ Global Engagement', 
                value: `• Total Voice Tracked: **${(totalVcSeconds / 3600).toFixed(1)} hrs**\n• Hourly Join Velocity: **+${totalJoins}** users/hr\n• Node Heap: **${memoryMB} MB**`, 
                inline: true 
            },
            { 
                name: '🛡️ Global Enforcement Totals', 
                value: `• Warns Issued: **${totalWarns}**\n• Kicks Executed: **${totalKicks}**\n• Bans Enforced: **${totalBans}**\n• AutoMod Interceptions: **${totalAutomod}**`, 
                inline: false 
            }
        )
        .setFooter({ text: 'Starry Network Intelligence Engine • Use ,telemetry <server name> for specific server analytics' })
        .setTimestamp();

    return embed;
}

module.exports = (client) => {
    console.log('📡 [Telemetry Engine] Initialized in Precision On-Demand Mode (DM Spam Disabled).');

    // 1. Track Member Joins
    client.on(Events.GuildMemberAdd, async (member) => {
        try {
            await GuildTelemetry.findOneAndUpdate(
                { guildId: member.guild.id },
                { 
                    $inc: { joinsThisHour: 1, joinsToday: 1 },
                    $set: { guildName: member.guild.name, updatedAt: new Date() }
                },
                { upsert: true }
            ).catch(() => {});
        } catch (e) {}
    });

    // 2. Track Voice Engagement
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        const userId = newState.id || oldState.id;
        const guildId = newState.guild.id || oldState.guild.id;

        if (!oldState.channelId && newState.channelId) {
            voiceSessions.set(`${guildId}_${userId}`, Date.now());
        }

        if (oldState.channelId && !newState.channelId) {
            const joinTime = voiceSessions.get(`${guildId}_${userId}`);
            if (joinTime) {
                const durationSeconds = Math.floor((Date.now() - joinTime) / 1000);
                voiceSessions.delete(`${guildId}_${userId}`);

                await GuildTelemetry.findOneAndUpdate(
                    { guildId },
                    { 
                        $inc: { totalVcSeconds: durationSeconds },
                        $set: { guildName: newState.guild.name, updatedAt: new Date() }
                    },
                    { upsert: true }
                ).catch(() => {});
            }
        }
    });

    // 3. Track Moderation Interceptions
    client.logModTelemetry = async (guildId, actionType) => {
        const fieldMap = {
            warn: 'modStats.warns',
            kick: 'modStats.kicks',
            ban: 'modStats.bans',
            automod: 'modStats.automodTriggers'
        };
        const updateField = fieldMap[actionType];
        if (!updateField) return;

        try {
            await GuildTelemetry.findOneAndUpdate(
                { guildId },
                { $inc: { [updateField]: 1 }, $set: { updatedAt: new Date() } },
                { upsert: true }
            ).catch(() => {});
        } catch (e) {}
    };

    // 4. Configurable 6-Hour Scheduled Telemetry Worker
    // ONLY runs if explicitly enabled by the owner via `,telemetry schedule 6h`
    setInterval(async () => {
        try {
            const mongoose = require('mongoose');
            if (!mongoose.connection || mongoose.connection.readyState !== 1) return;
            const scheduledGuilds = await GuildTelemetry.find({ 'autoSchedule.enabled': true });
            if (!scheduledGuilds || scheduledGuilds.length === 0) return;

            const now = Date.now();

            for (const doc of scheduledGuilds) {
                const intervalMs = (doc.autoSchedule.intervalHours || 6) * 3600 * 1000;
                const lastSentTime = doc.autoSchedule.lastSent ? new Date(doc.autoSchedule.lastSent).getTime() : 0;

                if (now - lastSentTime >= intervalMs) {
                    const guild = client.guilds.cache.get(doc.guildId);
                    if (!guild) continue;

                    const embed = buildServerTelemetryEmbed(guild, doc, client);

                    if (doc.autoSchedule.target === 'channel' && doc.autoSchedule.channelId) {
                        const targetChannel = guild.channels.cache.get(doc.autoSchedule.channelId);
                        if (targetChannel && typeof targetChannel.send === 'function') {
                            await targetChannel.send({ embeds: [embed] }).catch(() => {});
                        }
                    } else {
                        // Send to owners
                        const ownerIds = (process.env.OWNER_ID || '').split(',').map(s => s.trim()).filter(Boolean);
                        for (const ownerId of ownerIds) {
                            const ownerUser = await client.users.fetch(ownerId).catch(() => null);
                            if (ownerUser) {
                                await ownerUser.send({ embeds: [embed] }).catch(() => {});
                            }
                        }
                    }

                    doc.autoSchedule.lastSent = new Date();
                    doc.joinsThisHour = 0;
                    await doc.save().catch(() => {});
                }
            }
        } catch (schedErr) {
            console.error('Scheduled Telemetry Worker Error:', schedErr);
        }
    }, 60000); // Checks every minute for scheduled intervals
};

module.exports.searchGuilds = searchGuilds;
module.exports.getOrCreateTelemetry = getOrCreateTelemetry;
module.exports.buildServerTelemetryEmbed = buildServerTelemetryEmbed;
module.exports.buildGlobalTelemetryEmbed = buildGlobalTelemetryEmbed;
