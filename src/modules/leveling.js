// ==========================================
// 📊 SUPREME LEVELING ENGINE (PART 1 OF 2)
// File Path: modules/leveling.js
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    SlashCommandBuilder,
    PermissionFlagsBits, 
    ChannelType, 
    MessageFlags 
} = require('discord.js');
const mongoose = require('mongoose');

const EPHEMERAL_FLAG = MessageFlags ? MessageFlags.Ephemeral : 6;

// 🗄️ MONGODB SCHEMAS
const LevelUserSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
    messages: { type: Number, default: 0 },
    vc_time: { type: Number, default: 0 }
});
LevelUserSchema.index({ userId: 1, guildId: 1 }, { unique: true });
const LevelUser = mongoose.models.LevelUser || mongoose.model('LevelUser', LevelUserSchema);

const LevelSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: true },
    logChannelId: { type: String, default: null },
    title: { type: String, default: 'Congratulations {user}!' },
    description: { type: String, default: 'Your active participation in **{server}** has paid off! You reached **Level {level}**!' },
    color: { type: String, default: '#5865F2' },
    image: { type: String, default: '' },
    thumbnail: { type: String, default: 'avatar' },
    footer: { type: String, default: '{server} • Leveling System' },
    pingContent: { type: String, default: '**Level Up:** <@{user}>' },
    authorName: { type: String, default: 'LEVEL UP UNLOCKED' }
});
const LevelSettings = mongoose.models.LevelSettings || mongoose.model('LevelSettings', LevelSettingsSchema);

// In-Memory Caches
const settingsCache = new Map();
const xpCooldowns = new Map(); 
const vcJoinTimes = new Map(); 

// Helpers
function calculateLevel(xp) { return Math.floor(0.1 * Math.sqrt(xp)); }
function xpForNextLevel(currentLevel) { return Math.pow((currentLevel + 1) / 0.1, 2); }
function formatVcTime(minutes) {
    if (!minutes) return '0m';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

function cleanImageUrl(str) {
    if (!str || typeof str !== 'string' || str === 'undefined' || str === 'avatar') return '';
    return str.trim().replace(/[\`\<\>\s]/g, '');
}

function isValidUrl(str) {
    const cleaned = cleanImageUrl(str);
    if (!cleaned) return false;
    try {
        const url = new URL(cleaned);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function isValidHex(color) {
    if (!color || typeof color !== 'string' || color === 'undefined') return false;
    return /^#([0-9A-F]{3}){1,2}$/i.test(color.trim());
}

function replaceLvlPlaceholders(text, user, level, xp, guild) {
    if (!text || typeof text !== 'string' || text === 'undefined') return '';
    return text
        .replace(/\{user\}/g, `<@${user.id}>`)
        .replace(/\{username\}/g, user.username || 'User')
        .replace(/\{tag\}/g, user.tag || user.username || 'User')
        .replace(/\{server\}/g, guild?.name || 'Server')
        .replace(/\{level\}/g, `${level}`)
        .replace(/\{xp\}/g, `${xp.toLocaleString()}`)
        .replace(/\{count\}/g, `${guild?.memberCount || 0}`);
}

// 🚀 UPGRADED SUPREME LEVEL-UP EMBED BUILDER
function buildLevelUpEmbed(user, newLevel, newXp, guild, customSettings = null) {
    const nextLevelXp = xpForNextLevel(newLevel);
    const settings = customSettings || settingsCache.get(guild?.id) || {};

    const color = (settings.color && isValidHex(settings.color)) ? settings.color : '#5865F2';
    const authorRaw = (settings.authorName || 'LEVEL UP UNLOCKED').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim() || 'LEVEL UP UNLOCKED';
    const titleRaw = (settings.title || 'Congratulations {user}!').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim() || 'Congratulations {user}!';
    const descRaw = settings.description || 'Your active participation in **{server}** has paid off! You reached **Level {level}**!';
    const footerRaw = (settings.footer || '{server} • Leveling System').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim() || '{server} • Leveling System';

    const authorText = replaceLvlPlaceholders(authorRaw, user, newLevel, newXp, guild);
    const titleText = replaceLvlPlaceholders(titleRaw, user, newLevel, newXp, guild);
    const descText = replaceLvlPlaceholders(descRaw, user, newLevel, newXp, guild);
    const footerText = replaceLvlPlaceholders(footerRaw, user, newLevel, newXp, guild);

    const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: authorText.slice(0, 256), iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setTitle(titleText.slice(0, 256))
        .setDescription(descText.slice(0, 4000))
        .addFields(
            { name: 'Level Reached', value: `\`Level ${newLevel}\``, inline: true },
            { name: 'Total Experience', value: `\`${newXp.toLocaleString()} XP\``, inline: true },
            { name: 'Next Target', value: `\`${Math.round(nextLevelXp).toLocaleString()} XP\``, inline: true }
        )
        .setFooter({ text: footerText.slice(0, 2048), iconURL: guild?.iconURL({ dynamic: true }) })
        .setTimestamp();

    if (settings.thumbnail === 'avatar' || !settings.thumbnail) {
        embed.setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }));
    } else if (isValidUrl(settings.thumbnail)) {
        embed.setThumbnail(settings.thumbnail);
    }

    if (settings.image && isValidUrl(settings.image)) {
        embed.setImage(settings.image);
    }

    return embed;
}

const isDbConnected = () => Boolean(mongoose.connection && mongoose.connection.readyState === 1);

// ⚙️ Leveling State Management Helpers
async function enableLeveling(guildId, logChannelId = undefined) {
    const update = { enabled: true };
    if (logChannelId !== undefined) update.logChannelId = logChannelId;
    let settings = null;
    if (isDbConnected()) {
        settings = await LevelSettings.findOneAndUpdate({ guildId }, update, { new: true, upsert: true }).catch(() => null);
    }
    const cached = settingsCache.get(guildId) || {};
    const newCached = { ...cached, enabled: true, ...(logChannelId !== undefined ? { logChannelId } : {}) };
    settingsCache.set(guildId, newCached);
    return settings || newCached;
}

async function disableLeveling(guildId) {
    let settings = null;
    if (isDbConnected()) {
        settings = await LevelSettings.findOneAndUpdate({ guildId }, { enabled: false }, { new: true, upsert: true }).catch(() => null);
    }
    const cached = settingsCache.get(guildId) || {};
    const newCached = { ...cached, enabled: false };
    settingsCache.set(guildId, newCached);
    return settings || newCached;
}

async function toggleLeveling(guildId) {
    let currentEnabled = true;
    if (isDbConnected()) {
        const settings = await LevelSettings.findOne({ guildId }).catch(() => null);
        if (settings) currentEnabled = settings.enabled !== false;
        else if (settingsCache.has(guildId)) currentEnabled = settingsCache.get(guildId).enabled !== false;
    } else if (settingsCache.has(guildId)) {
        currentEnabled = settingsCache.get(guildId).enabled !== false;
    }

    const nextState = !currentEnabled;
    let settings = null;
    if (isDbConnected()) {
        settings = await LevelSettings.findOneAndUpdate({ guildId }, { enabled: nextState }, { new: true, upsert: true }).catch(() => null);
    }
    const cached = settingsCache.get(guildId) || {};
    const newCached = { ...cached, enabled: nextState };
    settingsCache.set(guildId, newCached);
    return { enabled: nextState, settings: settings || newCached };
}

async function setLevelingChannel(guildId, logChannelId) {
    let settings = null;
    if (isDbConnected()) {
        settings = await LevelSettings.findOneAndUpdate({ guildId }, { logChannelId }, { new: true, upsert: true }).catch(() => null);
    }
    const cached = settingsCache.get(guildId) || {};
    const newCached = { ...cached, logChannelId };
    settingsCache.set(guildId, newCached);
    return settings || newCached;
}

async function getLevelControlPanel(guildId, client) {
    let settings = null;
    if (isDbConnected()) {
        settings = await LevelSettings.findOne({ guildId }).catch(() => null);
        if (!settings) {
            settings = await LevelSettings.create({
                guildId,
                enabled: true,
                title: 'Congratulations {user}!',
                description: 'Your active participation in **{server}** has paid off! You reached **Level {level}**!',
                color: '#5865F2',
                image: '',
                thumbnail: 'avatar',
                footer: '{server} • Leveling System',
                pingContent: '**Level Up:** <@{user}>',
                authorName: 'LEVEL UP UNLOCKED'
            }).catch(() => null);
        }
    }
    if (!settings) {
        settings = settingsCache.get(guildId) || {
            guildId,
            enabled: true,
            title: 'Congratulations {user}!',
            description: 'Your active participation in **{server}** has paid off! You reached **Level {level}**!',
            color: '#5865F2',
            image: '',
            thumbnail: 'avatar',
            footer: '{server} • Leveling System',
            pingContent: '**Level Up:** <@{user}>',
            authorName: 'LEVEL UP UNLOCKED'
        };
    }

    const isEnabled = settings.enabled !== false;
    const channelDisplay = settings.logChannelId ? `<#${settings.logChannelId}>` : '*Current Channel (Where user levels up)*';
    const pingDisplay = (settings.pingContent || '**Level Up:** <@{user}>').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    const authorDisplay = (settings.authorName || 'LEVEL UP UNLOCKED').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    const titleDisplay = (settings.title || 'Congratulations {user}!').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    const descDisplay = settings.description || 'Your active participation in **{server}** has paid off! You reached **Level {level}**!';
    const colorDisplay = isValidHex(settings.color) ? settings.color : '#5865F2';
    const footerDisplay = (settings.footer || '{server} • Leveling System').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    
    const activeImage = cleanImageUrl(settings.image);
    const imageDisplay = isValidUrl(activeImage) ? `[View Media Link](${activeImage})` : '*None*';

    const panelEmbed = new EmbedBuilder()
        .setColor(isEnabled ? colorDisplay : '#ED4245')
        .setTitle('Mina Leveling Engine • Server Control Center')
        .setDescription(
            `Configure leveling rewards and design custom level-up announcement cards for your server.\n\n` +
            `**System State:** ${isEnabled ? '**Enabled (Active)**' : '**Disabled (Suspended)**'}\n` +
            `**Announcement Channel:** ${channelDisplay}\n` +
            `**Message Header / Ping:** \`${pingDisplay}\`\n` +
            `**Author Header:** \`${authorDisplay}\`\n` +
            `**Title:** \`${titleDisplay}\`\n` +
            `**Description:** \`\`\`${descDisplay}\`\`\`\n` +
            `**Hex Color:** \`${colorDisplay}\` | **Footer:** \`${footerDisplay}\`\n` +
            `**Banner Image:** ${imageDisplay}`
        )
        .addFields({
            name: 'Supported Variables',
            value: '`{user}` • `{username}` • `{tag}` • `{server}` • `{level}` • `{xp}` • `{count}`',
            inline: false
        })
        .setFooter({ text: 'Use the buttons below or type ,leveling toggle to change configuration.' });

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('lvl_btn_toggle')
            .setLabel(isEnabled ? 'Leveling: Enabled' : 'Leveling: Disabled')
            .setStyle(isEnabled ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('lvl_btn_text').setLabel('Edit Text').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('lvl_btn_media').setLabel('Edit Media').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('lvl_btn_style').setLabel('Edit Style').setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lvl_btn_ping').setLabel('Edit Header').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('lvl_btn_preview').setLabel('Live Preview').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('lvl_btn_reset').setLabel('Reset Defaults').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('visuality_btn_studio').setLabel('Studio Hub').setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [panelEmbed], components: [row1, row2] };
}

// Build Rank Embed
async function buildRankEmbed(targetUser, userData, guild) {
    const nextLevelXp = xpForNextLevel(userData.level);
    const currentLevelBaseXp = xpForNextLevel(userData.level - 1) || 0;
    const levelXpNeeded = Math.max(1, nextLevelXp - currentLevelBaseXp);
    const userLevelXp = Math.max(0, userData.xp - currentLevelBaseXp);
    
    const pct = Math.min(100, Math.max(0, Math.round((userLevelXp / levelXpNeeded) * 100)));
    const filledCount = Math.min(14, Math.max(0, Math.round((pct / 100) * 14)));
    const progressBar = '▰'.repeat(filledCount) + '▱'.repeat(14 - filledCount);

    const higherUsers = await LevelUser.countDocuments({ guildId: guild.id, xp: { $gt: userData.xp } }).catch(() => 0);
    const rankPos = higherUsers + 1;

    return new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ 
            name: `${targetUser.username} — Leveling Profile`, 
            iconURL: targetUser.displayAvatarURL({ dynamic: true }) 
        })
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
        .setDescription(
            `>>> **Level Overview**\n` +
            `• **Server Rank:** #${rankPos}\n` +
            `• **Current Level:** Level ${userData.level}\n` +
            `• **Total Experience:** ${userData.xp.toLocaleString()} XP`
        )
        .addFields(
            { name: 'Messages Sent', value: `\`${(userData.messages || 0).toLocaleString()}\``, inline: true },
            { name: 'Voice Time', value: `\`${formatVcTime(userData.vc_time)}\``, inline: true },
            { name: 'Target Milestone', value: `\`Level ${userData.level + 1}\``, inline: true },
            { 
                name: `Progress to Level ${userData.level + 1} (${pct}%)`, 
                value: `${progressBar}\n\`${userData.xp.toLocaleString()} / ${Math.round(nextLevelXp).toLocaleString()} XP\` (${Math.max(0, Math.round(nextLevelXp - userData.xp)).toLocaleString()} XP needed)`, 
                inline: false 
            }
        )
        .setFooter({ text: `${guild.name} • Leveling System`, iconURL: guild.iconURL() || undefined })
        .setTimestamp();
}

// Build Leaderboard Data
async function buildLeaderboardData(guildId, guild, type = 'xp') {
    let topUsers = [];
    let title = ''; 
    const color = '#5865F2';

    if (type === 'xp') {
        topUsers = await LevelUser.find({ guildId }).sort({ xp: -1 }).limit(10);
        title = 'Top Experience Leaders';
    } else if (type === 'messages') {
        topUsers = await LevelUser.find({ guildId }).sort({ messages: -1 }).limit(10);
        title = 'Most Active Chatters';
    } else if (type === 'vc') {
        topUsers = await LevelUser.find({ guildId }).sort({ vc_time: -1 }).limit(10);
        title = 'Voice Channel Leaders';
    }

    let description = '';
    if (topUsers.length === 0) {
        description = '*No data available for this category yet.*';
    } else {
        topUsers.forEach((user, index) => {
            const rankNum = index + 1;
            if (type === 'xp') description += `**#${rankNum}** <@${user.userId}>\n↳ Level ${user.level} • \`${user.xp.toLocaleString()} XP\`\n\n`;
            if (type === 'messages') description += `**#${rankNum}** <@${user.userId}>\n↳ \`${user.messages.toLocaleString()} Messages\`\n\n`;
            if (type === 'vc') description += `**#${rankNum}** <@${user.userId}>\n↳ \`${formatVcTime(user.vc_time)}\` in Voice\n\n`;
        });
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: `${guild.name} • Community Leaderboard`, iconURL: guild.iconURL({ dynamic: true }) || undefined })
        .setTitle(`Server Leaderboard: ${title}`)
        .setDescription(description)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setFooter({ text: `${guild.name} • Mina Leveling Engine`, iconURL: guild.iconURL() || undefined })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lb_xp').setLabel('XP Rank').setStyle(type === 'xp' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('lb_messages').setLabel('Messages').setStyle(type === 'messages' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('lb_vc').setLabel('Voice Time').setStyle(type === 'vc' ? ButtonStyle.Success : ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row] };
}

const levelingModule = (client) => {
    const config = require('../config');
    const PREFIX = config.DEFAULT_PREFIX || ',';

    async function initSettings() {
        try {
            const settings = await LevelSettings.find();
            settings.forEach(s => settingsCache.set(s.guildId, { enabled: s.enabled, logChannelId: s.logChannelId }));
            console.log('✅ Leveling Module Loaded (MongoDB Synced)');
        } catch (err) {}
    }
    initSettings();

    // 1. VOICE ACTIVITY TRACKER
    client.on('voiceStateUpdate', async (oldState, newState) => {
        if (!newState.member || newState.member.user.bot) return;

        const userId = newState.member.id;
        const guildId = newState.guild.id;
        const cacheKey = `${guildId}-${userId}`;

        if (!oldState.channelId && newState.channelId) {
            const guildSettings = settingsCache.get(guildId) || { enabled: true };
            if (guildSettings.enabled !== false) {
                vcJoinTimes.set(cacheKey, Date.now());
            }
        } else if (oldState.channelId && !newState.channelId) {
            if (vcJoinTimes.has(cacheKey)) {
                const durationMs = Date.now() - vcJoinTimes.get(cacheKey);
                vcJoinTimes.delete(cacheKey);
                const guildSettings = settingsCache.get(guildId) || { enabled: true };
                if (guildSettings.enabled !== false) {
                    const durationMinutes = Math.floor(durationMs / 60000);
                    if (durationMinutes > 0) {
                        await LevelUser.findOneAndUpdate(
                            { userId, guildId }, 
                            { $inc: { vc_time: durationMinutes, xp: durationMinutes * 5 } }, 
                            { upsert: true }
                        ).catch(() => {});
                    }
                }
            }
        }
    });

    // 2. MESSAGE TRACKING & TRIGGER COMMANDS
    client.on('messageCreate', async message => {
        if (message.author.bot || !message.guild) return;

        const userId = message.author.id;
        const guildId = message.guild.id;
        const rawContent = message.content.toLowerCase().trim();

        const activePrefixes = Array.from(new Set([PREFIX, '.', ',', '!', '?'])).filter(Boolean);
        const matchedPrefix = activePrefixes.find(p => rawContent.startsWith(p));
        const isPrefix = Boolean(matchedPrefix);
        const isTrigger = rawContent.startsWith('starry ') || rawContent.startsWith('jarvis ') || message.mentions.has(client.user?.id);

        if (isPrefix || isTrigger) {
            let cleanText = rawContent;
            if (isPrefix) cleanText = rawContent.slice(matchedPrefix.length).trim();
            if (isTrigger) cleanText = rawContent.replace(/^(?:<@!?\d+>|starry|jarvis)\s*/i, '').trim();

            const args = cleanText.split(/ +/);
            const command = args.shift()?.toLowerCase();

            if (command === 'rank') {
                const targetUser = message.mentions.users.first() || message.author;
                let userData = await LevelUser.findOne({ userId: targetUser.id, guildId });
                if (!userData) userData = { xp: 0, level: 0, messages: 0, vc_time: 0 };
                const embed = await buildRankEmbed(targetUser, userData, message.guild);
                return message.reply({ embeds: [embed] }).catch(() => {});
            }

            if (command === 'messages') {
                const targetUser = message.mentions.users.first() || message.author;
                const userData = await LevelUser.findOne({ userId: targetUser.id, guildId });
                return message.reply(`💬 **${targetUser.username}** has sent **${userData ? userData.messages.toLocaleString() : 0}** messages in this server!`).catch(() => {});
            }

            if (command === 'leaderboard' || command === 'lb') {
                const data = await buildLeaderboardData(guildId, message.guild, 'xp');
                return message.reply(data).catch(() => {});
            }

            // Admin & Management Commands
            const isManager = message.member.permissions.has(PermissionFlagsBits.Administrator) ||
                              message.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
                              (config.BOT_OWNERS && config.BOT_OWNERS.includes(message.author.id)) ||
                              message.guild.ownerId === message.author.id;

            if (isManager) {
                // 1. Enable Leveling
                if (command === 'enableleveling' || command === 'enablelevels' || command === 'setuplevels') {
                    const targetChan = message.mentions.channels.first();
                    const logId = targetChan ? targetChan.id : null;
                    await enableLeveling(guildId, logId);

                    const previewEmbed = buildLevelUpEmbed(message.author, 5, 2500, message.guild);
                    let msg = `⚙️ **Leveling System Enabled!**\nMembers will now earn XP from chat and voice activity.`;
                    if (targetChan) {
                        msg += `\n📌 **Announcements Channel:** <#${targetChan.id}>`;
                        targetChan.send({ content: `🧪 **[Leveling System Setup Test]**`, embeds: [previewEmbed] }).catch(() => {});
                    }
                    return message.reply({ content: msg, embeds: [previewEmbed] });
                }

                // 2. Disable Leveling
                if (command === 'disableleveling' || command === 'disablelevels' || command === 'stoplevels') {
                    await disableLeveling(guildId);
                    return message.reply(`🚫 **Leveling System Disabled!**\nXP gain and level-up announcements are paused server-wide.`);
                }

                // 3. Toggle Leveling
                if (command === 'toggleleveling' || command === 'togglelevels' || command === 'switchlevels') {
                    const { enabled } = await toggleLeveling(guildId);
                    return message.reply(`${enabled ? '✅' : '🚫'} **Leveling System is now ${enabled ? 'ENABLED' : 'DISABLED'}** for **${message.guild.name}**.`);
                }

                // 4. Unified Leveling Command (.leveling on|off|toggle|channel|preview|status)
                if (command === 'leveling' || command === 'levels' || command === 'levelsystem') {
                    const sub = (args[0] || '').toLowerCase();

                    if (sub === 'on' || sub === 'enable' || sub === 'start') {
                        const targetChan = message.mentions.channels.first();
                        const logId = targetChan ? targetChan.id : undefined;
                        await enableLeveling(guildId, logId);

                        const previewEmbed = buildLevelUpEmbed(message.author, 5, 2500, message.guild);
                        let msg = `✅ **Leveling System has been ENABLED for ${message.guild.name}!**\nMembers will now earn XP from chat and voice activity.`;
                        if (targetChan) {
                            msg += `\n📌 **Announcements Channel:** <#${targetChan.id}>`;
                        }
                        return message.reply({ content: msg, embeds: [previewEmbed] });
                    }

                    if (sub === 'off' || sub === 'disable' || sub === 'stop') {
                        await disableLeveling(guildId);
                        return message.reply(`🚫 **Leveling System has been DISABLED for ${message.guild.name}.**\nXP gain and level-up announcements are paused server-wide.`);
                    }

                    if (sub === 'toggle' || sub === 'switch') {
                        const { enabled } = await toggleLeveling(guildId);
                        return message.reply(`${enabled ? '✅' : '🚫'} **Leveling System is now ${enabled ? 'ENABLED' : 'DISABLED'}** for **${message.guild.name}**.`);
                    }

                    if (sub === 'channel' || sub === 'setchannel') {
                        const targetChan = message.mentions.channels.first();
                        const isReset = args[1] === 'reset' || args[1] === 'none' || args[1] === 'current';
                        const logId = isReset ? null : (targetChan ? targetChan.id : null);

                        if (!targetChan && !isReset) {
                            return message.reply(`❌ Please mention a channel or use \`channel reset\`.\n*Usage: \`.leveling channel #channel\` or \`.leveling channel reset\`*`);
                        }

                        await setLevelingChannel(guildId, logId);
                        return message.reply(logId 
                            ? `✅ Level-up announcements will now be sent to <#${logId}>.` 
                            : `✅ Level-up announcements will now be sent to the **current active channel** where the user levels up.`
                        );
                    }

                    if (sub === 'preview' || sub === 'test') {
                        const previewEmbed = buildLevelUpEmbed(message.author, 5, 2500, message.guild);
                        return message.reply({ content: `🧪 **[Leveling Card Live Preview]**`, embeds: [previewEmbed] });
                    }

                    // Default: show full interactive control panel
                    const panel = await getLevelControlPanel(guildId, client);
                    return message.reply(panel);
                }

                // 5. XP & Level Set
                if (command === 'setlevel' || command === 'setlvl') {
                    const targetUser = message.mentions.users.first();
                    const targetLvl = parseInt(args[1]);
                    if (!targetUser || isNaN(targetLvl) || targetLvl < 0) {
                        return message.reply('❌ Usage: `.setlevel @User <level>` (e.g. `.setlevel @User 10`)');
                    }
                    const targetXp = Math.round(xpForNextLevel(targetLvl - 1)) || 0;
                    await LevelUser.findOneAndUpdate(
                        { userId: targetUser.id, guildId },
                        { $set: { level: targetLvl, xp: targetXp } },
                        { new: true, upsert: true }
                    );
                    return message.reply(`✅ Set <@${targetUser.id}>'s level directly to **Level ${targetLvl}** (\`${targetXp.toLocaleString()} XP\`).`);
                }

                if (command === 'setxp') {
                    const targetUser = message.mentions.users.first();
                    const amount = parseInt(args[1]);
                    if (!targetUser || isNaN(amount) || amount < 0) {
                        return message.reply('❌ Usage: `.setxp @User <amount>` (e.g. `.setxp @User 5000`)');
                    }
                    const newLevel = calculateLevel(amount);
                    await LevelUser.findOneAndUpdate(
                        { userId: targetUser.id, guildId },
                        { $set: { xp: amount, level: newLevel } },
                        { new: true, upsert: true }
                    );
                    return message.reply(`✅ Set <@${targetUser.id}>'s XP directly to **${amount.toLocaleString()} XP** (Level **${newLevel}**).`);
                }

                if (command === 'addxp') {
                    const targetUser = message.mentions.users.first();
                    const amount = parseInt(args[1]);
                    if (!targetUser || isNaN(amount)) return message.reply('❌ Usage: `.addxp @User <amount>` or `starry addxp @User <amount>`');

                    const userDoc = await LevelUser.findOneAndUpdate(
                        { userId: targetUser.id, guildId },
                        { $inc: { xp: amount } },
                        { new: true, upsert: true }
                    );
                    const newLevel = calculateLevel(userDoc.xp);
                    await LevelUser.updateOne({ userId: targetUser.id, guildId }, { level: newLevel });

                    return message.reply(`✅ Added **${amount.toLocaleString()} XP** to <@${targetUser.id}>! (New Level: **${newLevel}**)`);
                }

                if (command === 'removexp') {
                    const targetUser = message.mentions.users.first();
                    const amount = parseInt(args[1]);
                    if (!targetUser || isNaN(amount)) return message.reply('❌ Usage: `.removexp @User <amount>` or `starry removexp @User <amount>`');

                    const userDoc = await LevelUser.findOne({ userId: targetUser.id, guildId });
                    if (!userDoc) return message.reply('❌ User has no XP data.');

                    const newXp = Math.max(0, userDoc.xp - amount);
                    const newLevel = calculateLevel(newXp);
                    await LevelUser.updateOne({ userId: targetUser.id, guildId }, { xp: newXp, level: newLevel });

                    return message.reply(`✅ Removed **${amount.toLocaleString()} XP** from <@${targetUser.id}>! (New Level: **${newLevel}**)`);
                }

                if (command === 'resetlevel') {
                    const targetUser = message.mentions.users.first();
                    if (!targetUser) return message.reply('❌ Usage: `.resetlevel @User` or `starry resetlevel @User`');

                    await LevelUser.deleteOne({ userId: targetUser.id, guildId });
                    return message.reply(`🧹 Reset all leveling data for <@${targetUser.id}>.`);
                }
            }
            if (isPrefix) return; 
        }

        // XP Gain Logic - skip if MongoDB connection is temporarily unavailable
        if (mongoose.connection?.readyState !== 1) return;

        const guildSettings = settingsCache.get(guildId) || { enabled: true, logChannelId: null };
        if (!guildSettings.enabled) return; 

        const cooldownKey = `${guildId}-${userId}`;
        const onCooldown = xpCooldowns.has(cooldownKey) && (Date.now() - xpCooldowns.get(cooldownKey) < 60000);

        if (onCooldown) {
            await LevelUser.findOneAndUpdate({ userId, guildId }, { $inc: { messages: 1 } }, { upsert: true }).catch(() => {});
            return;
        }

        xpCooldowns.set(cooldownKey, Date.now()); 

        const userDoc = await LevelUser.findOneAndUpdate(
            { userId, guildId },
            { $inc: { messages: 1, xp: 15 } },
            { new: true, upsert: true }
        ).catch(() => {});

        if (!userDoc) return;

        const newLevel = calculateLevel(userDoc.xp);
        if (newLevel > userDoc.level) {
            await LevelUser.updateOne({ userId, guildId }, { level: newLevel }).catch(() => {});

            let logChannel = null;
            if (guildSettings.logChannelId) {
                logChannel = message.guild.channels.cache.get(guildSettings.logChannelId);
            }

            if (!logChannel && typeof client.getLogChannel === 'function') {
                try {
                    logChannel = await client.getLogChannel(message.guild, 'misc');
                } catch (e) {
                    logChannel = null;
                }
            }

            const levelUpEmbed = buildLevelUpEmbed(message.author, newLevel, userDoc.xp, message.guild, guildSettings);
            const pingMsg = guildSettings.pingContent 
                ? replaceLvlPlaceholders(guildSettings.pingContent, message.author, newLevel, userDoc.xp, message.guild)
                : `<@${userId}>`;

            if (logChannel && typeof logChannel.send === 'function') {
                logChannel.send({ 
                    content: pingMsg, 
                    embeds: [levelUpEmbed],
                    allowedMentions: { users: [userId] }
                }).catch(() => {});
            } else {
                message.reply({ content: pingMsg, embeds: [levelUpEmbed] }).catch(() => {
                    message.react('⭐').catch(() => {});
                });
            }
        }
    });
    // ==========================================
    // 3. SLASH COMMAND SETUP WITH LIVE PREVIEW & VISUALITY STUDIO
    // ==========================================
    client.on('interactionCreate', async interaction => {
        // Leaderboard Tab Switching Buttons
        if (interaction.isButton() && interaction.customId.startsWith('lb_')) {
            const type = interaction.customId.split('_')[1]; 
            const data = await buildLeaderboardData(interaction.guildId, interaction.guild, type);
            return interaction.update(data).catch(() => {});
        }

        // ==========================================
        // 🔘 LEVEL-UP EMBED VISUALITY BUTTON HANDLERS
        // ==========================================
        if (interaction.isButton() && interaction.customId.startsWith('lvl_btn_')) {
            if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild) && !interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ You need **Manage Server** or **Administrator** permissions.', flags: [EPHEMERAL_FLAG] });
            }

            let settings = await LevelSettings.findOne({ guildId: interaction.guildId });
            if (!settings) settings = await LevelSettings.create({ guildId: interaction.guildId, enabled: true });

            // TOGGLE LEVELING STATE BUTTON
            if (interaction.customId === 'lvl_btn_toggle') {
                const current = settings.enabled !== false;
                const nextState = !current;
                await LevelSettings.findOneAndUpdate({ guildId: interaction.guildId }, { enabled: nextState }, { upsert: true });
                const existing = settingsCache.get(interaction.guildId) || {};
                settingsCache.set(interaction.guildId, { ...existing, enabled: nextState });

                const panelData = await getLevelControlPanel(interaction.guildId, client);
                if (interaction.message) {
                    return await interaction.update(panelData).catch(() => {});
                } else {
                    return await interaction.reply({ ...panelData, flags: [EPHEMERAL_FLAG] }).catch(() => {});
                }
            }

            // EDIT TITLE & DESCRIPTION MODAL
            if (interaction.customId === 'lvl_btn_text') {
                const modal = new ModalBuilder().setCustomId('lvl_modal_text').setTitle('Edit Level-Up Title & Text');
                
                const titleInput = new TextInputBuilder()
                    .setCustomId('in_lvl_title')
                    .setLabel('Level-Up Embed Title')
                    .setStyle(TextInputStyle.Short)
                    .setValue(settings.title || '✨ Congratulations {user}!')
                    .setRequired(true);

                const descInput = new TextInputBuilder()
                    .setCustomId('in_lvl_desc')
                    .setLabel('Level-Up Description')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(settings.description || 'Your active participation in **{server}** has paid off! You reached **Level {level}**!')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(titleInput), new ActionRowBuilder().addComponents(descInput));
                return interaction.showModal(modal);
            }

            // EDIT BANNER & THUMBNAIL MODAL
            if (interaction.customId === 'lvl_btn_media') {
                const modal = new ModalBuilder().setCustomId('lvl_modal_media').setTitle('Edit Level-Up Banner & Thumbnail');

                const imageInput = new TextInputBuilder()
                    .setCustomId('in_lvl_image')
                    .setLabel('Banner Image URL')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Paste image/GIF URL (e.g. https://... or leave empty)')
                    .setValue(cleanImageUrl(settings.image) || '')
                    .setRequired(false);

                const thumbInput = new TextInputBuilder()
                    .setCustomId('in_lvl_thumb')
                    .setLabel('Thumbnail ("avatar" or custom image URL)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(settings.thumbnail || 'avatar')
                    .setRequired(false);

                modal.addComponents(new ActionRowBuilder().addComponents(imageInput), new ActionRowBuilder().addComponents(thumbInput));
                return interaction.showModal(modal);
            }

            // EDIT STYLE, AUTHOR & FOOTER MODAL
            if (interaction.customId === 'lvl_btn_style') {
                const modal = new ModalBuilder().setCustomId('lvl_modal_style').setTitle('Edit Style, Author & Footer');

                const colorInput = new TextInputBuilder()
                    .setCustomId('in_lvl_color')
                    .setLabel('Hex Color Code (e.g. #FFD700)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(isValidHex(settings.color) ? settings.color : '#FFD700')
                    .setRequired(true);

                const authorInput = new TextInputBuilder()
                    .setCustomId('in_lvl_author')
                    .setLabel('Author Header Text')
                    .setStyle(TextInputStyle.Short)
                    .setValue(settings.authorName || '🎉 LEVEL UP UNLOCKED!')
                    .setRequired(false);

                const footerInput = new TextInputBuilder()
                    .setCustomId('in_lvl_footer')
                    .setLabel('Footer Text')
                    .setStyle(TextInputStyle.Short)
                    .setValue(settings.footer || '{server} • Leveling System')
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(colorInput),
                    new ActionRowBuilder().addComponents(authorInput),
                    new ActionRowBuilder().addComponents(footerInput)
                );
                return interaction.showModal(modal);
            }

            // EDIT PING/HEADER MODAL
            if (interaction.customId === 'lvl_btn_ping') {
                const modal = new ModalBuilder().setCustomId('lvl_modal_ping').setTitle('Edit Message Header / Ping');

                const pingInput = new TextInputBuilder()
                    .setCustomId('in_lvl_ping')
                    .setLabel('Content Above Embed')
                    .setStyle(TextInputStyle.Short)
                    .setValue(settings.pingContent || '🎉 **Level Up!** <@{user}>')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(pingInput));
                return interaction.showModal(modal);
            }

            // LIVE PREVIEW CARD HANDLER
            if (interaction.customId === 'lvl_btn_preview') {
                try {
                    const latest = await LevelSettings.findOne({ guildId: interaction.guildId }) || settings;
                    const previewEmbed = buildLevelUpEmbed(interaction.user, 5, 2500, interaction.guild, latest);
                    const pingText = replaceLvlPlaceholders(latest.pingContent || '🎉 **Level Up!** <@{user}>', interaction.user, 5, 2500, interaction.guild);

                    return await interaction.reply({ 
                        content: `${pingText} *(Setup Preview)*`, 
                        embeds: [previewEmbed], 
                        flags: [EPHEMERAL_FLAG] 
                    });
                } catch (err) {
                    return await interaction.reply({ 
                        content: `❌ **Preview Error:** \`${err.message}\``, 
                        flags: [EPHEMERAL_FLAG] 
                    }).catch(() => {});
                }
            }

            // RESET DEFAULTS HANDLER
            if (interaction.customId === 'lvl_btn_reset') {
                const defaults = {
                    title: '✨ Congratulations {user}!',
                    description: 'Your active participation in **{server}** has paid off! You reached **Level {level}**!',
                    color: '#FFD700',
                    image: '',
                    thumbnail: 'avatar',
                    footer: '{server} • Leveling System',
                    pingContent: '🎉 **Level Up!** <@{user}>',
                    authorName: '🎉 LEVEL UP UNLOCKED!'
                };
                await LevelSettings.findOneAndUpdate({ guildId: interaction.guildId }, defaults, { upsert: true });
                settingsCache.set(interaction.guildId, { ...settingsCache.get(interaction.guildId), ...defaults });

                await interaction.reply({ content: '🔄 **Level-up embed visuality reset to defaults!**', flags: [EPHEMERAL_FLAG] });
                const panelData = await getLevelControlPanel(interaction.guildId, client);
                if (interaction.message && panelData) {
                    await interaction.message.edit(panelData).catch(() => {});
                }
                return;
            }
        }

        // ==========================================
        // 📝 LEVEL-UP MODAL SUBMISSION PROCESSORS
        // ==========================================
        if (interaction.isModalSubmit() && interaction.customId.startsWith('lvl_modal_')) {
            const guildId = interaction.guildId;

            if (interaction.customId === 'lvl_modal_text') {
                const title = interaction.fields.getTextInputValue('in_lvl_title');
                const description = interaction.fields.getTextInputValue('in_lvl_desc');
                await LevelSettings.findOneAndUpdate({ guildId }, { title, description }, { upsert: true });
                const cached = settingsCache.get(guildId) || {};
                settingsCache.set(guildId, { ...cached, title, description });
            }

            if (interaction.customId === 'lvl_modal_media') {
                let image = cleanImageUrl(interaction.fields.getTextInputValue('in_lvl_image'));
                let thumbnail = cleanImageUrl(interaction.fields.getTextInputValue('in_lvl_thumb'));
                if (!isValidUrl(image)) image = '';
                if (thumbnail.toLowerCase() !== 'avatar' && !isValidUrl(thumbnail)) thumbnail = 'avatar';

                await LevelSettings.findOneAndUpdate({ guildId }, { image, thumbnail }, { upsert: true });
                const cached = settingsCache.get(guildId) || {};
                settingsCache.set(guildId, { ...cached, image, thumbnail });
            }

            if (interaction.customId === 'lvl_modal_style') {
                let color = interaction.fields.getTextInputValue('in_lvl_color');
                const authorName = interaction.fields.getTextInputValue('in_lvl_author');
                const footer = interaction.fields.getTextInputValue('in_lvl_footer');
                if (!isValidHex(color)) color = '#FFD700';

                await LevelSettings.findOneAndUpdate({ guildId }, { color, authorName, footer }, { upsert: true });
                const cached = settingsCache.get(guildId) || {};
                settingsCache.set(guildId, { ...cached, color, authorName, footer });
            }

            if (interaction.customId === 'lvl_modal_ping') {
                const pingContent = interaction.fields.getTextInputValue('in_lvl_ping');
                await LevelSettings.findOneAndUpdate({ guildId }, { pingContent }, { upsert: true });
                const cached = settingsCache.get(guildId) || {};
                settingsCache.set(guildId, { ...cached, pingContent });
            }

            await interaction.reply({ content: '✅ **Level-Up Embed Visuality Updated!**', flags: [EPHEMERAL_FLAG] });

            const panelData = await getLevelControlPanel(guildId, client);
            if (interaction.message && panelData) {
                await interaction.message.edit(panelData).catch(() => {});
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        // /enableleveling
        if (interaction.commandName === 'enableleveling' || interaction.commandName === 'setuplevels') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ content: '❌ Admin or Manage Server permissions required.', flags: [EPHEMERAL_FLAG] });
            }

            const channel = interaction.options.getChannel('channel');
            const logChannelId = channel ? channel.id : null;
            await enableLeveling(interaction.guildId, logChannelId);

            const panelData = await getLevelControlPanel(interaction.guildId, client);
            return interaction.reply({ 
                content: `⚙️ **Leveling System Configured & Enabled!** ${channel ? `Announcements sent to ${channel}.` : 'Announcements sent to active channels.'}`,
                ...panelData,
                flags: [EPHEMERAL_FLAG] 
            });
        }

        // /disableleveling
        if (interaction.commandName === 'disableleveling') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ content: '❌ Admin or Manage Server permissions required.', flags: [EPHEMERAL_FLAG] });
            }

            await disableLeveling(interaction.guildId);
            return interaction.reply({ 
                content: '🚫 **Leveling System Disabled!** XP gain and level-up announcements are paused server-wide.', 
                flags: [EPHEMERAL_FLAG] 
            });
        }

        // /toggleleveling
        if (interaction.commandName === 'toggleleveling') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ content: '❌ Admin or Manage Server permissions required.', flags: [EPHEMERAL_FLAG] });
            }

            const { enabled } = await toggleLeveling(interaction.guildId);
            return interaction.reply({ 
                content: `${enabled ? '✅' : '🚫'} **Leveling System is now ${enabled ? 'ENABLED' : 'DISABLED'}** for this server.`, 
                flags: [EPHEMERAL_FLAG] 
            });
        }

        // /customizelevels or /leveling
        if (interaction.commandName === 'customizelevels' || interaction.commandName === 'leveling') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ content: '❌ Admin or Manage Server permissions required.', flags: [EPHEMERAL_FLAG] });
            }

            const panelData = await getLevelControlPanel(interaction.guildId, client);
            return interaction.reply({ ...panelData, flags: [EPHEMERAL_FLAG] });
        }
    });
};

levelingModule.LevelSettings = LevelSettings;
levelingModule.LevelUser = LevelUser;
levelingModule.getLevelControlPanel = getLevelControlPanel;
levelingModule.buildLevelUpEmbed = buildLevelUpEmbed;
levelingModule.buildRankEmbed = buildRankEmbed;
levelingModule.buildLeaderboardData = buildLeaderboardData;
levelingModule.settingsCache = settingsCache;
levelingModule.calculateLevel = calculateLevel;
levelingModule.xpForNextLevel = xpForNextLevel;
levelingModule.enableLeveling = enableLeveling;
levelingModule.disableLeveling = disableLeveling;
levelingModule.toggleLeveling = toggleLeveling;
levelingModule.setLevelingChannel = setLevelingChannel;
module.exports = levelingModule;
