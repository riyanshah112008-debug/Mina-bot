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
    title: { type: String, default: '✨ Congratulations {user}!' },
    description: { type: String, default: 'Your active participation in **{server}** has paid off! You reached **Level {level}**!' },
    color: { type: String, default: '#FFD700' },
    image: { type: String, default: '' },
    thumbnail: { type: String, default: 'avatar' },
    footer: { type: String, default: '{server} • Leveling System' },
    pingContent: { type: String, default: '🎉 **Level Up!** <@{user}>' },
    authorName: { type: String, default: '🎉 LEVEL UP UNLOCKED!' }
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

    const color = (settings.color && isValidHex(settings.color)) ? settings.color : '#FFD700';
    const authorRaw = settings.authorName || '🎉 LEVEL UP UNLOCKED!';
    const titleRaw = settings.title || '✨ Congratulations {user}!';
    const descRaw = settings.description || 'Your active participation in **{server}** has paid off! You reached **Level {level}**!';
    const footerRaw = settings.footer || '{server} • Leveling System';

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
            { name: '⭐ New Level', value: `\`\`\`ansi\n\u001b[1;36mLevel ${newLevel}\u001b[0m\n\`\`\``, inline: true },
            { name: '📊 Total XP', value: `\`\`\`ansi\n\u001b[1;33m${newXp.toLocaleString()} XP\u001b[0m\n\`\`\``, inline: true },
            { name: '🎯 Next Target', value: `\`\`\`ansi\n\u001b[1;32m${Math.round(nextLevelXp).toLocaleString()} XP\u001b[0m\n\`\`\``, inline: true }
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

async function getLevelControlPanel(guildId, client) {
    let settings = await LevelSettings.findOne({ guildId });
    if (!settings) {
        settings = await LevelSettings.create({
            guildId,
            enabled: true,
            title: '✨ Congratulations {user}!',
            description: 'Your active participation in **{server}** has paid off! You reached **Level {level}**!',
            color: '#FFD700',
            image: '',
            thumbnail: 'avatar',
            footer: '{server} • Leveling System',
            pingContent: '🎉 **Level Up!** <@{user}>',
            authorName: '🎉 LEVEL UP UNLOCKED!'
        });
    }

    const channelDisplay = settings.logChannelId ? `<#${settings.logChannelId}>` : '*Current Channel*';
    const pingDisplay = settings.pingContent || '🎉 **Level Up!** <@{user}>';
    const authorDisplay = settings.authorName || '🎉 LEVEL UP UNLOCKED!';
    const titleDisplay = settings.title || '✨ Congratulations {user}!';
    const descDisplay = settings.description || 'Your active participation in **{server}** has paid off! You reached **Level {level}**!';
    const colorDisplay = isValidHex(settings.color) ? settings.color : '#FFD700';
    const footerDisplay = settings.footer || '{server} • Leveling System';
    
    const activeImage = cleanImageUrl(settings.image);
    const imageDisplay = isValidUrl(activeImage) ? `[View Media Link](${activeImage})` : '*None*';

    const panelEmbed = new EmbedBuilder()
        .setColor(colorDisplay)
        .setTitle('📊 Level-Up Embed Visuality Control Panel')
        .setDescription(
            `Configure and design custom level-up announcement cards for your server.\n\n` +
            `**📍 Announcement Channel:** ${channelDisplay}\n` +
            `**💬 Message Header / Ping:** \`${pingDisplay}\`\n` +
            `**👑 Author Header:** \`${authorDisplay}\`\n` +
            `**🏷️ Title:** \`${titleDisplay}\`\n` +
            `**📝 Description:** \`\`\`${descDisplay}\`\`\`\n` +
            `**🎨 Hex Color:** \`${colorDisplay}\` | **🌸 Footer:** \`${footerDisplay}\`\n` +
            `**🖼️ Banner Image:** ${imageDisplay}`
        )
        .addFields({
            name: '🔤 Supported Variables',
            value: '`{user}` • `{username}` • `{tag}` • `{server}` • `{level}` • `{xp}` • `{count}`',
            inline: false
        })
        .setFooter({ text: 'Use the interactive buttons below to modify each section in real time.' });

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lvl_btn_text').setLabel('Edit Text').setStyle(ButtonStyle.Primary).setEmoji('✏️'),
        new ButtonBuilder().setCustomId('lvl_btn_media').setLabel('Edit Media').setStyle(ButtonStyle.Secondary).setEmoji('🖼️'),
        new ButtonBuilder().setCustomId('lvl_btn_style').setLabel('Edit Style & Footer').setStyle(ButtonStyle.Secondary).setEmoji('🎨')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lvl_btn_ping').setLabel('Edit Header').setStyle(ButtonStyle.Secondary).setEmoji('💬'),
        new ButtonBuilder().setCustomId('lvl_btn_preview').setLabel('Live Preview').setStyle(ButtonStyle.Success).setEmoji('👁️'),
        new ButtonBuilder().setCustomId('lvl_btn_reset').setLabel('Reset Defaults').setStyle(ButtonStyle.Danger).setEmoji('🔄'),
        new ButtonBuilder().setCustomId('visuality_btn_studio').setLabel('Studio Hub').setStyle(ButtonStyle.Secondary).setEmoji('🎨')
    );

    return { embeds: [panelEmbed], components: [row1, row2] };
}

// Build Rank Embed
async function buildRankEmbed(targetUser, userData, guild) {
    const nextLevelXp = xpForNextLevel(userData.level);
    const currentLevelBaseXp = xpForNextLevel(userData.level - 1) || 0;
    const levelXpNeeded = Math.max(1, nextLevelXp - currentLevelBaseXp);
    const userLevelXp = Math.max(0, userData.xp - currentLevelBaseXp);
    
    const progressPercent = Math.min(Math.round((userLevelXp / levelXpNeeded) * 10), 10);
    const progressBar = '🟩'.repeat(progressPercent) + '⬛'.repeat(10 - progressPercent);

    const higherUsers = await LevelUser.countDocuments({ guildId: guild.id, xp: { $gt: userData.xp } }).catch(() => 0);
    const rankPos = higherUsers + 1;

    return new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: `${targetUser.username}'s Rank & Stats`, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '👑 Rank Position', value: `\`\`\`ansi\n\u001b[1;33m#${rankPos}\u001b[0m\n\`\`\``, inline: true },
            { name: '✨ Current Level', value: `\`\`\`ansi\n\u001b[1;36mLevel ${userData.level}\u001b[0m\n\`\`\``, inline: true },
            { name: '📊 Total XP', value: `\`\`\`ansi\n\u001b[1;32m${userData.xp.toLocaleString()} XP\u001b[0m\n\`\`\``, inline: true },
            { name: '💬 Messages Sent', value: `\`${(userData.messages || 0).toLocaleString()}\``, inline: true },
            { name: '🎙️ Voice Time', value: `\`${formatVcTime(userData.vc_time)}\``, inline: true },
            { name: '\u200b', value: '\u200b', inline: true }, 
            { name: `📈 Progress to Level ${userData.level + 1}`, value: `${progressBar} (${Math.round((userLevelXp / levelXpNeeded) * 100)}%)\n\`${userData.xp.toLocaleString()} / ${Math.round(nextLevelXp).toLocaleString()} XP\`` }
        )
        .setFooter({ text: guild.name, iconURL: guild.iconURL() })
        .setTimestamp();
}

// Build Leaderboard Data
async function buildLeaderboardData(guildId, guild, type = 'xp') {
    let topUsers = [];
    let title = ''; let color = '';

    if (type === 'xp') {
        topUsers = await LevelUser.find({ guildId }).sort({ xp: -1 }).limit(10);
        title = 'Top XP Earners'; color = '#FFD700';
    } else if (type === 'messages') {
        topUsers = await LevelUser.find({ guildId }).sort({ messages: -1 }).limit(10);
        title = 'Most Active Chatters'; color = '#00BFFF';
    } else if (type === 'vc') {
        topUsers = await LevelUser.find({ guildId }).sort({ vc_time: -1 }).limit(10);
        title = 'Voice Channel Leaders'; color = '#FF4500';
    }

    let description = '';
    if (topUsers.length === 0) {
        description = '*No data available for this category yet.*';
    } else {
        topUsers.forEach((user, index) => {
            let medal = '🏅';
            if (index === 0) medal = '🥇';
            if (index === 1) medal = '🥈';
            if (index === 2) medal = '🥉';

            if (type === 'xp') description += `**${index + 1}.** ${medal} <@${user.userId}>\n↳ **Level ${user.level}** • \`${user.xp.toLocaleString()} XP\`\n\n`;
            if (type === 'messages') description += `**${index + 1}.** ${medal} <@${user.userId}>\n↳ \`${user.messages.toLocaleString()} Messages\`\n\n`;
            if (type === 'vc') description += `**${index + 1}.** ${medal} <@${user.userId}>\n↳ \`${formatVcTime(user.vc_time)}\` in Voice\n\n`;
        });
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`🏆 Server Leaderboard: ${title}`)
        .setDescription(description)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setFooter({ text: guild.name, iconURL: guild.iconURL() })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lb_xp').setLabel('XP Rank').setStyle(type === 'xp' ? ButtonStyle.Success : ButtonStyle.Secondary).setEmoji('✨'),
        new ButtonBuilder().setCustomId('lb_messages').setLabel('Messages').setStyle(type === 'messages' ? ButtonStyle.Success : ButtonStyle.Secondary).setEmoji('💬'),
        new ButtonBuilder().setCustomId('lb_vc').setLabel('Voice Time').setStyle(type === 'vc' ? ButtonStyle.Success : ButtonStyle.Secondary).setEmoji('🎙️')
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
            vcJoinTimes.set(cacheKey, Date.now());
        } else if (oldState.channelId && !newState.channelId) {
            if (vcJoinTimes.has(cacheKey)) {
                const durationMs = Date.now() - vcJoinTimes.get(cacheKey);
                const durationMinutes = Math.floor(durationMs / 60000);
                if (durationMinutes > 0) {
                    await LevelUser.findOneAndUpdate(
                        { userId, guildId }, 
                        { $inc: { vc_time: durationMinutes, xp: durationMinutes * 5 } }, 
                        { upsert: true }
                    ).catch(() => {});
                }
                vcJoinTimes.delete(cacheKey);
            }
        }
    });

    // 2. MESSAGE TRACKING & TRIGGER COMMANDS
    client.on('messageCreate', async message => {
        if (message.author.bot || !message.guild) return;

        const userId = message.author.id;
        const guildId = message.guild.id;
        const rawContent = message.content.toLowerCase().trim();

        const isPrefix = rawContent.startsWith(PREFIX);
        const isTrigger = rawContent.startsWith('starry ') || rawContent.startsWith('jarvis ') || message.mentions.has(client.user?.id);

        if (isPrefix || isTrigger) {
            let cleanText = rawContent;
            if (isPrefix) cleanText = rawContent.slice(PREFIX.length).trim();
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

            // Admin Commands (.enableleveling, .addxp, .removexp, .resetlevel)
            if (message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                if (command === 'enableleveling') {
                    const targetChan = message.mentions.channels.first();
                    const logId = targetChan ? targetChan.id : null;

                    await LevelSettings.findOneAndUpdate({ guildId }, { enabled: true, logChannelId: logId }, { upsert: true });
                    settingsCache.set(guildId, { enabled: true, logChannelId: logId });

                    // Generate Sample Preview Embed
                    const previewEmbed = buildLevelUpEmbed(message.author, 5, 2500, message.guild);

                    let msg = `⚙️ **Leveling System Enabled!**\nShowing a preview of the level-up announcement embed below:`;
                    if (targetChan) {
                        msg += `\n📌 **Announcements Channel:** <#${targetChan.id}>`;
                        // Send sample message to log channel
                        targetChan.send({ content: `🧪 **[Leveling System Setup Test]**`, embeds: [previewEmbed] }).catch(() => {});
                    }

                    return message.reply({ content: msg, embeds: [previewEmbed] });
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

            await LevelSettings.findOneAndUpdate(
                { guildId: interaction.guildId },
                { enabled: true, logChannelId: logChannelId },
                { upsert: true }
            );

            const existing = settingsCache.get(interaction.guildId) || {};
            settingsCache.set(interaction.guildId, { ...existing, enabled: true, logChannelId });

            const panelData = await getLevelControlPanel(interaction.guildId, client);
            return interaction.reply({ 
                content: `⚙️ **Leveling System Configured!** ${channel ? `Announcements sent to ${channel}.` : 'Announcements sent to active channels.'}`,
                ...panelData,
                flags: [EPHEMERAL_FLAG] 
            });
        }

        // /customizelevels
        if (interaction.commandName === 'customizelevels') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ content: '❌ Admin or Manage Server permissions required.', flags: [EPHEMERAL_FLAG] });
            }

            const panelData = await getLevelControlPanel(interaction.guildId, client);
            return interaction.reply({ ...panelData, flags: [EPHEMERAL_FLAG] });
        }
    });
};

levelingModule.LevelSettings = LevelSettings;
levelingModule.getLevelControlPanel = getLevelControlPanel;
levelingModule.buildLevelUpEmbed = buildLevelUpEmbed;
module.exports = levelingModule;
