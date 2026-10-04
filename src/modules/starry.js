// ==========================================
// 🧠 STARRY SUPREME MASTER AI ENGINE (PART 1 OF 7)
// File Path: modules/starry.js
// ==========================================
const { 
    PermissionFlagsBits, 
    PermissionsBitField,
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ChannelType, 
    MessageFlags,
    SlashCommandBuilder,
    AttachmentBuilder,
    AuditLogEvent
} = require('discord.js');
const { GoogleGenAI } = require('@google/genai');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let createCanvas, loadImage;
try {
    const canvasPkg = require('canvas');
    createCanvas = canvasPkg.createCanvas;
    loadImage = canvasPkg.loadImage;
} catch (e) {}

const EPHEMERAL_FLAG = MessageFlags.Ephemeral || 6;
const blacklistedUsers = new Set();

const DEFAULT_BAD_WORDS = [
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 
    'pussy', 'slut', 'whore', 'motherfucker', 'cock', 'nigger', 'faggot'
];

const badWordSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: true },
    words: { type: [String], default: DEFAULT_BAD_WORDS }
});
const BadWordSettings = mongoose.models.BadWordSettings || mongoose.model('BadWordSettings', badWordSchema);

const welcomeSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true }
});
const WelcomeSettings = mongoose.models.WelcomeSettings || mongoose.model('WelcomeSettings', welcomeSchema);

const goodbyeSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true }
});
const GoodbyeSettings = mongoose.models.GoodbyeSettings || mongoose.model('GoodbyeSettings', goodbyeSchema);

const masterSecuritySchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    autoKick: { type: Boolean, default: false }, 
    autoBan: { type: Boolean, default: false }, 
    ownerBypass: { type: Boolean, default: true },
    modules: { 
        antinuke: { type: Boolean, default: true }, 
        antiraid: { type: Boolean, default: true }, 
        altshield: { type: Boolean, default: false }, 
        automod: { type: Boolean, default: true } 
    },
    userInfractions: { type: Map, of: Number, default: {} }
});
const MasterSecurity = mongoose.models.MasterSecurity || mongoose.model('MasterSecurity', masterSecuritySchema);

let ServerSettings;
try {
    ServerSettings = mongoose.models.ServerSettings || require('../models/ServerSettings');
} catch (e) {
    const serverSettingsSchema = new mongoose.Schema({
        guildId: { type: String, required: true, unique: true },
        setupCompleted: { type: Boolean, default: false },
        verifiedRoleId: { type: String, default: null },
        triggerWord: { type: String, default: 'starry' }
    });
    ServerSettings = mongoose.models.ServerSettings || mongoose.model('ServerSettings', serverSettingsSchema);
}

const rawKeys = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || '';
const apiKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;

function getNextAIClient() {
    if (apiKeys.length === 0) return null;
    const key = apiKeys[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    return new GoogleGenAI({ apiKey: key });
}

const AI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-flash-latest'];
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateAIResponseWithRetry(prompt) {
    if (apiKeys.length === 0) throw new Error('Missing GEMINI_API_KEY.');
    let lastError = null;

    for (const modelName of AI_MODELS) {
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const ai = getNextAIClient();
                if (!ai) continue;
                const generatePromise = ai.models.generateContent({ model: modelName, contents: prompt });
                const response = await Promise.race([
                    generatePromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout (${modelName} > 8s)`)), 8000))
                ]);
                if (response && response.text && response.text.trim().length > 0) {
                    return response.text.trim();
                }
            } catch (err) {
                lastError = err;
                if ((err.status === 429 || err.status === 503) && attempt < 2) {
                    await sleep(attempt * 300);
                    continue;
                }
                break;
            }
        }
    }
    throw lastError || new Error('AI Engine unreachable.');
}
// ==========================================
// 🧠 STARRY SUPREME MASTER AI ENGINE (PART 2 OF 7)
// File Path: modules/starry.js
// ==========================================

async function getBadWordPanelEmbed(guild, client) {
    let settings = await BadWordSettings.findOne({ guildId: guild.id });
    if (!settings) {
        settings = await BadWordSettings.create({ guildId: guild.id, enabled: true, words: DEFAULT_BAD_WORDS });
    }

    const embed = new EmbedBuilder()
        .setColor(settings.enabled ? '#2ecc71' : '#ed4245')
        .setAuthor({ name: `${guild.name} | Security Protocol`, iconURL: guild.iconURL({ dynamic: true }) })
        .setTitle('🛡️ Bad Word Moderation Control Panel')
        .setDescription(
            `Configure automated cuss word detection, auto-deletion, and warning notices for **${guild.name}**.\n\n` +
            `• **Engine Status:** ${settings.enabled ? '`ACTIVE 🟢`' : '`DISABLED 🔴`'}\n` +
            `• **Total Filtered Words:** \`${settings.words.length}\` words\n` +
            `• **Automated Enforcement:** Message Deletion + Public Warning + Direct DM Warning.`
        )
        .addFields({
            name: '📜 Sample Active Words',
            value: settings.words.length > 0 
                ? `\`\`\`${settings.words.slice(0, 15).join(', ')}${settings.words.length > 15 ? '...' : ''}\`\`\``
                : '*No words currently blacklisted.*'
        })
        .setFooter({ text: 'Use the buttons below to manage the bad word filter', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('badword_add_btn').setLabel('Add Word(s)').setStyle(ButtonStyle.Success).setEmoji('➕'),
        new ButtonBuilder().setCustomId('badword_remove_btn').setLabel('Remove Word(s)').setStyle(ButtonStyle.Danger).setEmoji('➖'),
        new ButtonBuilder().setCustomId('badword_list_btn').setLabel('View Full List').setStyle(ButtonStyle.Secondary).setEmoji('📜'),
        new ButtonBuilder().setCustomId('badword_toggle_btn').setLabel(settings.enabled ? 'Disable AutoMod' : 'Enable AutoMod').setStyle(settings.enabled ? ButtonStyle.Secondary : ButtonStyle.Primary)
    );

    return { embeds: [embed], components: [row] };
}

async function executeFullGuildBackup(guild) {
    try {
        const allRoles = await guild.roles.fetch();
        const allChannels = await guild.channels.fetch();
        return {
            rolesSaved: allRoles.size,
            categoriesSaved: allChannels.filter(c => c.type === ChannelType.GuildCategory).size,
            channelsSaved: allChannels.filter(c => c.type !== ChannelType.GuildCategory).size
        };
    } catch (e) {
        return { rolesSaved: guild.roles.cache.size, categoriesSaved: guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size, channelsSaved: guild.channels.cache.filter(c => c.type !== ChannelType.GuildCategory).size };
    }
}

async function getOrCreateCategory(guild, name, overwrites = []) {
    let cat = guild.channels.cache.find(c => c.name.toLowerCase() === name.toLowerCase() && c.type === ChannelType.GuildCategory);
    if (!cat) {
        cat = await guild.channels.create({ name, type: ChannelType.GuildCategory, permissionOverwrites: overwrites });
    }
    return cat;
}

// ==========================================
// 🛡️ STARRY LOG EMBED BUILDER
// Standardized embed formatting matching Starry Security layout
// Explicitly includes Target, Moderator Name, User IDs, Case Number, and Timestamps
// ==========================================
function createStarryLogEmbed({ title, emoji, color, target, moderator, reason, duration, expiresAt, caseId, extraFields = [], guild }) {
    const embed = new EmbedBuilder()
        .setColor(color || '#ED4245')
        .setAuthor({ 
            name: `${emoji ? emoji + ' ' : ''}${title}`, 
            iconURL: target?.displayAvatarURL ? target.displayAvatarURL({ dynamic: true }) : (guild?.iconURL({ dynamic: true }) || null)
        });

    if (target) {
        const targetTag = target.tag || (target.user ? target.user.tag : target.username || 'Unknown User');
        const targetId = target.id || 'N/A';
        embed.addFields({ name: '👤 Target User', value: `<@${targetId}> (\`${targetTag}\`)\n**User ID:** \`${targetId}\``, inline: false });
    }

    if (moderator) {
        const modTag = moderator.tag || (moderator.user ? moderator.user.tag : moderator.username || 'System Automation');
        const modId = moderator.id || 'N/A';
        embed.addFields({ name: '🛡️ Moderator', value: `<@${modId}> (\`${modTag}\`)\n**Moderator ID:** \`${modId}\``, inline: false });
    } else {
        embed.addFields({ name: '🛡️ Moderator', value: '`System Automation / Audit Log`', inline: false });
    }

    if (caseId) {
        embed.addFields({ name: '🏷️ Case ID', value: `\`#${caseId}\``, inline: true });
    }

    if (duration) {
        embed.addFields({ name: '⏳ Duration', value: `\`${duration}\``, inline: true });
    }

    if (expiresAt) {
        const timestamp = Math.floor(new Date(expiresAt).getTime() / 1000);
        embed.addFields({ name: '⏰ Until', value: `<t:${timestamp}:F> (<t:${timestamp}:R>)`, inline: true });
    }

    if (reason) {
        embed.addFields({ name: '📝 Reason', value: `>>> ${reason}`, inline: false });
    }

    if (extraFields.length > 0) {
        for (const field of extraFields) {
            embed.addFields(field);
        }
    }

    embed.setFooter({ 
        text: `User ID: ${target?.id || 'N/A'} • Starry Security Engine`, 
        iconURL: guild?.iconURL({ dynamic: true }) || null 
    });
    embed.setTimestamp();

    return embed;
}

async function deployActiveModulePanel(channel, moduleType, verifiedRole) {
    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const hasPanel = messages ? messages.some(m => m.author.id === channel.guild.client.user.id && (m.components.length > 0 || m.embeds.length > 0)) : false;

    if (!hasPanel) {
        let embed = new EmbedBuilder().setColor('#2b2d31');
        let components = [];

        if (moduleType === 'verification') {
            embed.setColor('#2ecc71').setTitle('🛡️ Server Web Verification Portal').setDescription('Welcome! Human verification is required before full channel access is granted.\n\nClick the button below to generate your secure verification link.');
            components = [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`verify_role_${verifiedRole?.id || 'active'}`).setLabel('Get Verification Link').setStyle(ButtonStyle.Primary).setEmoji('🌐'))];
        } else if (moduleType === 'tickets') {
            embed.setColor('#00F2FE').setTitle('🎫 Support & Application Portal').setDescription('• **Open Support Ticket:** Opens a private channel with staff.\n• **Apply for Staff:** Opens an application form.');
            components = [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('sys_create_ticket').setLabel('Open Support Ticket').setStyle(ButtonStyle.Primary).setEmoji('📩'),
                new ButtonBuilder().setCustomId('sys_apply_staff').setLabel('Apply for Staff').setStyle(ButtonStyle.Success).setEmoji('📝')
            )];
        } else if (moduleType === 'log_access') {
            embed.setColor('#3BA55C').setTitle('🟢 Access & Member Join Audit Engine').addFields({ name: 'Engine Status', value: '`RUNNING 🟢`', inline: true }, { name: 'Active Listeners', value: '`Member Joins • Leaves • Invites`', inline: true });
        } else if (moduleType === 'sus_tracker') {
            embed.setColor('#ED4245').setTitle('🚨 Young Account & Sus Profile Scanner').addFields({ name: 'Engine Status', value: '`ARMED 🚨`', inline: true }, { name: 'Detection Rule', value: '`Flags accounts < 7 days old`', inline: true });
        } else if (moduleType === 'inactivity_tracker') {
            embed.setColor('#5865F2').setTitle('💤 Engagement & Inactivity Scanner').addFields({ name: 'Engine Status', value: '`SCANNING 💤`', inline: true }, { name: 'Tracking Window', value: '`14-Day Inactivity Matrix`', inline: true });
        } else if (moduleType === 'status_monitor') {
            embed.setColor('#2ecc71').setTitle('🟢 Autonomous Network Telemetry & Uptime Hub').addFields({ name: 'Metrics Update', value: '`Loops every 60 seconds`', inline: true }, { name: 'Monitored Assets', value: '`Members • RAM Heap • Ping • Modules`', inline: true });
        }

        if (components.length > 0) {
            await channel.send({ embeds: [embed], components }).catch(() => {});
        } else if (embed.data.title) {
            await channel.send({ embeds: [embed] }).catch(() => {});
        }
    }
}

async function createNonDuplicatingActiveChannel(guild, options, verifiedRole) {
    let channel = guild.channels.cache.find(c => c.name.toLowerCase() === options.name.toLowerCase() && c.parentId === options.parent);
    if (!channel) {
        channel = await guild.channels.create({
            name: options.name, type: options.type || ChannelType.GuildText, parent: options.parent, topic: options.topic || '', permissionOverwrites: options.permissionOverwrites || []
        });
    }
    await deployActiveModulePanel(channel, options.moduleType, verifiedRole);
    return channel;
}
// ==========================================
// 🧠 STARRY SUPREME MASTER AI ENGINE (PART 3 OF 7)
// File Path: modules/starry.js
// ==========================================

async function provisionMasterServerStructure(interaction) {
    const guild = interaction.guild;
    const botMember = guild.members.me;

    let verifiedRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'verified');
    if (!verifiedRole) verifiedRole = await guild.roles.create({ name: 'Verified', color: '#2ecc71', reason: 'Starry Master System' });

    let staffRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'staff' || r.name.toLowerCase() === 'moderator');
    if (!staffRole) staffRole = await guild.roles.create({ name: 'Staff', color: '#3498db', reason: 'Starry Master System' });

    const hideEveryone = { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] };
    const showEveryone = { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] };
    const showVerified = { id: verifiedRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.Connect] };
    const staffFullControl = { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] };
    const botFullControl = { id: botMember.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] };

    const govCat = await getOrCreateCategory(guild, '🛡️ SECURITY & GOVERNANCE', [showEveryone, botFullControl]);
    await createNonDuplicatingActiveChannel(guild, { name: 'rules-and-info', parent: govCat.id, permissionOverwrites: [showEveryone, botFullControl] }, verifiedRole);
    await createNonDuplicatingActiveChannel(guild, { name: 'announcements', parent: govCat.id, permissionOverwrites: [showEveryone, botFullControl] }, verifiedRole);
    await createNonDuplicatingActiveChannel(guild, { name: 'server-status-monitor', parent: govCat.id, moduleType: 'status_monitor', permissionOverwrites: [showEveryone, botFullControl] }, verifiedRole);

    const sysCat = await getOrCreateCategory(guild, '🚨 INCIDENT & SECURITY LOGS', [hideEveryone, staffFullControl, botFullControl]);
    const sysChannels = [
        { name: 'logs-access', moduleType: 'log_access' }, 
        { name: 'logs-moderate', moduleType: 'log_moderate' },
        { name: 'logs-messages', moduleType: 'log_messages' }, 
        { name: 'logs-voice', moduleType: 'log_voice' },
        { name: 'logs-channels', moduleType: 'log_channels' }, 
        { name: 'logs-members', moduleType: 'log_members' }
    ];
    for (const item of sysChannels) {
        await createNonDuplicatingActiveChannel(guild, { name: item.name, parent: sysCat.id, moduleType: item.moduleType, permissionOverwrites: [hideEveryone, staffFullControl, botFullControl] }, verifiedRole);
    }

    const trackerCat = await getOrCreateCategory(guild, '📡 AUTOMATED TRACKERS', [hideEveryone, staffFullControl, botFullControl]);
    await createNonDuplicatingActiveChannel(guild, { name: 'sus-account-tracker', parent: trackerCat.id, moduleType: 'sus_tracker', permissionOverwrites: [hideEveryone, staffFullControl, botFullControl] }, verifiedRole);
    await createNonDuplicatingActiveChannel(guild, { name: 'inactivity-tracker', parent: trackerCat.id, moduleType: 'inactivity_tracker', permissionOverwrites: [hideEveryone, staffFullControl, botFullControl] }, verifiedRole);
    await createNonDuplicatingActiveChannel(guild, { name: 'chest-drops', parent: trackerCat.id, permissionOverwrites: [hideEveryone, showVerified, botFullControl] }, verifiedRole);

    const supportCat = await getOrCreateCategory(guild, '🎫 SUPPORT & APPLICATIONS');
    await createNonDuplicatingActiveChannel(guild, { name: 'verify-here', parent: supportCat.id, moduleType: 'verification', permissionOverwrites: [{ id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] }, { id: verifiedRole.id, deny: [PermissionFlagsBits.ViewChannel] }, botFullControl] }, verifiedRole);
    await createNonDuplicatingActiveChannel(guild, { name: 'open-a-ticket', parent: supportCat.id, moduleType: 'tickets', permissionOverwrites: [hideEveryone, showVerified, botFullControl] }, verifiedRole);

    const staffCat = await getOrCreateCategory(guild, '👑 ADMIN & STAFF HQ', [hideEveryone, staffFullControl, botFullControl]);
    await createNonDuplicatingActiveChannel(guild, { name: 'owners-chat', parent: staffCat.id, permissionOverwrites: [hideEveryone, staffFullControl, botFullControl] }, verifiedRole);
    await createNonDuplicatingActiveChannel(guild, { name: 'staff-discussion', parent: staffCat.id, permissionOverwrites: [hideEveryone, staffFullControl, botFullControl] }, verifiedRole);

    const commCat = await getOrCreateCategory(guild, '📊 COMMUNITY PROTOCOL', [hideEveryone, showVerified, botFullControl]);
    await createNonDuplicatingActiveChannel(guild, { name: 'general-chat', parent: commCat.id, permissionOverwrites: [hideEveryone, showVerified, botFullControl] }, verifiedRole);
    await createNonDuplicatingActiveChannel(guild, { name: 'bot-commands', parent: commCat.id, permissionOverwrites: [hideEveryone, showVerified, botFullControl] }, verifiedRole);

    if (ServerSettings) {
        await ServerSettings.findOneAndUpdate({ guildId: String(guild.id) }, { setupCompleted: true, verifiedRoleId: verifiedRole.id }, { upsert: true });
    }
    return { verifiedRole: verifiedRole.name, totalCategories: 6, totalChannels: 22 };
}

function start60sChannelTelemetryLoop(client) {
    setInterval(async () => {
        if (!client.guilds) return;
        client.guilds.cache.forEach(async (guild) => {
            try {
                const statusCh = guild.channels.cache.find(c => c.name === 'server-status-monitor');
                if (statusCh) {
                    const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
                    const statusEmbed = new EmbedBuilder().setColor('#2ecc71').setTitle('🟢 Autonomous Network Telemetry & Uptime Hub').addFields(
                        { name: '📊 Total Members', value: `\`${guild.memberCount}\``, inline: true },
                        { name: '🟢 System Uptime', value: `\`${(process.uptime() / 60).toFixed(1)} mins\``, inline: true },
                        { name: '🧠 RAM Usage (Heap)', value: `\`${memUsage} MB\``, inline: true },
                        { name: '📡 Bot Latency (Ping)', value: `\`${client.ws.ping}ms\``, inline: true }
                    );
                    const msgs = await statusCh.messages.fetch({ limit: 5 }).catch(() => null);
                    const botMsg = msgs ? msgs.find(m => m.author.id === client.user.id && m.embeds.length > 0) : null;
                    if (botMsg) await botMsg.edit({ embeds: [statusEmbed] }).catch(() => {});
                    else await statusCh.send({ embeds: [statusEmbed] }).catch(() => {});
                }
            } catch (err) {}
        });
    }, 60000);
}

const emergencyNukeCommand = new SlashCommandBuilder()
    .setName('emergency-nuke')
    .setDescription('⚡ Emergency Protocol: Purge channel or reset whole server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName('target').setDescription('Target scope').setRequired(true).addChoices(
        { name: 'Channel', value: 'channel' }, 
        { name: 'Server', value: 'server' }
    ))
    .addChannelOption(o => o.setName('channel').setDescription('Specific channel to nuke (defaults to current channel)').setRequired(false));

const modPanelSlashCommand = new SlashCommandBuilder()
    .setName('modpanel')
    .setDescription('🛡️ Open Moderation Control Center for a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('target').setDescription('Target user to moderate').setRequired(true));

const setupStarryCommand = new SlashCommandBuilder()
    .setName('setup-starry')
    .setDescription('✨ Autonomous Server Setup')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const modMasterCommand = new SlashCommandBuilder().setName('mod').setDescription('🛡️ Master Moderation Hub').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);
const autoModMasterCommand = new SlashCommandBuilder()
    .setName('automod')
    .setDescription('⚙️ AutoMod Hub • Channel & Server Protection')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => 
        sub.setName('channel')
            .setDescription('Configure AutoMod protection for a channel')
            .addStringOption(o => 
                o.setName('action')
                    .setDescription('Enable, disable, or check status')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Enable Filter', value: 'enable' },
                        { name: 'Disable Filter', value: 'disable' },
                        { name: 'Check Status', value: 'status' }
                    )
            )
            .addStringOption(o => 
                o.setName('filter')
                    .setDescription('Filter type to configure')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Links & Invites', value: 'links' },
                        { name: 'Emoji Spam (5+)', value: 'emojis' },
                        { name: 'All Filters (Both)', value: 'all' }
                    )
            )
            .addChannelOption(o => 
                o.setName('channel')
                    .setDescription('Target channel (defaults to current)')
                    .setRequired(false)
            )
    )
    .addSubcommand(sub => 
        sub.setName('status')
            .setDescription('View AutoMod status for a channel')
            .addChannelOption(o => 
                o.setName('channel')
                    .setDescription('Target channel (defaults to current)')
                    .setRequired(false)
            )
    )
    .addSubcommand(sub => 
        sub.setName('toggle')
            .setDescription('Toggle server-wide AutoMod engine')
            .addStringOption(o => 
                o.setName('action')
                    .setDescription('Enable or disable server-wide')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Enable', value: 'enable' },
                        { name: 'Disable', value: 'disable' }
                    )
            )
    );

const ignoreCommand = new SlashCommandBuilder()
    .setName('ignore')
    .setDescription('🚫 Disable/ignore AutoMod links or emojis in a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => 
        o.setName('type')
            .setDescription('Filter to ignore')
            .setRequired(true)
            .addChoices(
                { name: 'Links & Invites', value: 'links' },
                { name: 'Emoji Spam', value: 'emojis' },
                { name: 'All Filters', value: 'all' },
                { name: 'Check Status', value: 'status' }
            )
    )
    .addChannelOption(o => 
        o.setName('channel')
            .setDescription('Target channel (defaults to current)')
            .setRequired(false)
    );

const unignoreCommand = new SlashCommandBuilder()
    .setName('unignore')
    .setDescription('✅ Re-enable/unignore AutoMod links or emojis in a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => 
        o.setName('type')
            .setDescription('Filter to unignore/activate')
            .setRequired(true)
            .addChoices(
                { name: 'Links & Invites', value: 'links' },
                { name: 'Emoji Spam', value: 'emojis' },
                { name: 'All Filters', value: 'all' }
            )
    )
    .addChannelOption(o => 
        o.setName('channel')
            .setDescription('Target channel (defaults to current)')
            .setRequired(false)
    );
const moderateMasterCommand = new SlashCommandBuilder().setName('moderate').setDescription('⚙️ Security modules').setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
const verifySetupCommand = new SlashCommandBuilder().setName('verify-setup').setDescription('Setup verification').setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
// ==========================================
// 🧠 STARRY SUPREME MASTER AI ENGINE (PART 4 OF 7)
// File Path: modules/starry.js
// ==========================================

module.exports = async (client) => {
    if (client.starryEngineInitialized) return;
    client.starryEngineInitialized = true;

    console.log('🚀 Starry Security & Moderation Engine Active');

    start60sChannelTelemetryLoop(client);

    // Dynamic routing to specific log channels (Cache + API Fetch Fallback)
    client.getLogChannel = async (guild, logType = 'misc') => {
        if (!guild) return null;
        const typeMap = {
            'access': ['logs-access', 'user-invite-logs', 'invite-logs', 'join-logs'],
            'moderate': ['logs-moderate', 'mod-logs', 'warning-logs', 'audit-logs'],
            'messages': ['logs-messages', 'message-logs', 'chat-logs'],
            'voice': ['logs-voice', 'voice-logs', 'vc-logs'],
            'channels': ['logs-channels', 'channel-logs'],
            'members': ['logs-members', 'member-logs', 'role-logs']
        };
        const targetNames = typeMap[logType.toLowerCase()] || typeMap['access'];

        // 1. Direct cache lookup first
        let ch = guild.channels.cache.find(c => c && c.type === ChannelType.GuildText && targetNames.some(name => c.name.toLowerCase().includes(name)));
        if (ch) return ch;

        // 2. Fallback to fetching all channels via API
        try {
            const fetchedChannels = await guild.channels.fetch();
            ch = fetchedChannels.find(c => c && c.type === ChannelType.GuildText && targetNames.some(name => c.name.toLowerCase().includes(name)));
            if (ch) return ch;
            return fetchedChannels.find(c => c && c.type === ChannelType.GuildText && ['logs-server', 'server-logs', 'mod-logs', 'logs'].includes(c.name.toLowerCase())) || null;
        } catch (err) {
            console.error('❌ Log Channel Fetch Error:', err);
            return null;
        }
    };

    client.sendPremiumModDM = async (member, moderator, action, reason, duration, guild, caseId = 'N/A') => {
        if (!member || !member.user || member.user.bot) return false;
        const actionType = action.toLowerCase();
        let embedColor = actionType === 'ban' ? '#ED4245' : actionType === 'kick' ? '#DA373C' : '#FEE75C';

        const modEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setAuthor({ name: `${guild.name} | Security Notice`, iconURL: guild.iconURL({ dynamic: true }) })
            .setTitle(`🛡️ Moderation Action: ${actionType.toUpperCase()}`)
            .setDescription(`Hello **${member.user.username}**, you received a moderation discipline in **${guild.name}**.`)
            .addFields(
                { name: '👤 Target', value: `<@${member.id}> (\`${member.user.tag}\`)`, inline: true },
                { name: '🛡️ Moderator', value: moderator?.user ? `<@${moderator.id}> (\`${moderator.user.tag}\`)` : (moderator?.tag ? `<@${moderator.id}> (\`${moderator.tag}\`)` : '`Starry System`'), inline: true },
                { name: '🏷️ Case ID', value: `\`#${caseId}\``, inline: true },
                { name: '📝 Reason', value: `>>> ${reason || 'No reason provided.'}`, inline: false }
            )
            .setTimestamp();

        try { await member.send({ embeds: [modEmbed] }); return true; } catch (err) { return false; }
    };

    // ==========================================
    // 🌸 LOGS: ACCESS CHANNEL (Joins & Leaves)
    // ==========================================
    client.on('guildMemberAdd', async (member) => {
        if (member.user.bot) return;

        const accessLog = await client.getLogChannel(member.guild, 'access');
        if (accessLog) {
            const createdTimestamp = Math.floor(member.user.createdTimestamp / 1000);
            const joinEmbed = createStarryLogEmbed({
                title: 'Member Joined',
                emoji: '📥',
                color: '#2ECC71',
                target: member.user,
                extraFields: [
                    { name: '📅 Account Created', value: `<t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)`, inline: false },
                    { name: '📊 Server Census', value: `Member **#${member.guild.memberCount}**`, inline: true }
                ],
                guild: member.guild
            });
            await accessLog.send({ embeds: [joinEmbed] }).catch(() => {});
        }
    });

    client.on('guildMemberRemove', async (member) => {
        const accessLog = await client.getLogChannel(member.guild, 'access');
        if (accessLog) {
            const leaveEmbed = createStarryLogEmbed({
                title: 'Member Left',
                emoji: '📤',
                color: '#ED4245',
                target: member.user,
                extraFields: [
                    { name: '📊 Server Census', value: `Remaining Members: **${member.guild.memberCount}**`, inline: true }
                ],
                guild: member.guild
            });
            await accessLog.send({ embeds: [leaveEmbed] }).catch(() => {});
        }

        try {
            const config = await GoodbyeSettings.findOne({ guildId: member.guild.id });
            if (!config || !config.channelId) return;
            const goodbyeCh = member.guild.channels.cache.get(config.channelId);
            if (!goodbyeCh) return;

            const goodbyeEmbed = new EmbedBuilder()
                .setColor('#7289DA')
                .setTitle(`🥀 FAREWELL, TRAVELER 🥀`)
                .setDescription(`👋 **${member.user.tag}** has departed from **${member.guild.name}**. We wish you the absolute best on your future adventures! 🌠`)
                .addFields({ name: '📊 Server Census', value: `We are now down to **${member.guild.memberCount}** members.`, inline: false })
                .setImage('https://media.tenor.com/images/99208a68b444b0593457a82b3d39575e/tenor.gif')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `🥀 Starry Aesthetic Goodbye System • Safe travels!` })
                .setTimestamp();

            await goodbyeCh.send({ content: `🕊️ Goodbye **${member.user.username}**! Until we meet again...`, embeds: [goodbyeEmbed] }).catch(() => {});
        } catch (err) {}
    });

    // ==========================================
    // 💬 LOGS: MESSAGES CHANNEL
    // ==========================================
    client.on('messageDelete', async (message) => {
        try {
            if (!message.guild || message.partial) return;
            const logChannel = await client.getLogChannel(message.guild, 'messages');
            if (!logChannel || logChannel.id === message.channel.id) return;

            const deleteEmbed = createStarryLogEmbed({
                title: 'Message Deleted',
                emoji: '🗑️',
                color: '#ED4245',
                target: message.author || { id: 'Unknown', tag: 'Unknown' },
                extraFields: [
                    { name: '📺 Channel', value: `<#${message.channel.id}> (\`${message.channel.name}\`)`, inline: true },
                    { name: '🆔 Message ID', value: `\`${message.id}\``, inline: true },
                    { name: '📝 Content', value: message.content ? `>>> ${message.content.slice(0, 1000)}` : '*[No text content or attachment]*', inline: false }
                ],
                guild: message.guild
            });

            await logChannel.send({ embeds: [deleteEmbed] }).catch(() => {});
        } catch (err) {}
    });

    client.on('messageUpdate', async (oldMessage, newMessage) => {
        try {
            if (!oldMessage.guild || oldMessage.partial || newMessage.partial) return;
            if (oldMessage.author?.bot || oldMessage.content === newMessage.content) return;

            const logChannel = await client.getLogChannel(oldMessage.guild, 'messages');
            if (!logChannel) return;

            const editEmbed = createStarryLogEmbed({
                title: 'Message Edited',
                emoji: '✏️',
                color: '#FEE75C',
                target: oldMessage.author,
                extraFields: [
                    { name: '📺 Channel', value: `<#${oldMessage.channel.id}>`, inline: true },
                    { name: '🔗 Jump Link', value: `[Click Here](${newMessage.url})`, inline: true },
                    { name: '⬅️ Before', value: `>>> ${oldMessage.content?.slice(0, 900) || '*None*'}`, inline: false },
                    { name: '➡️ After', value: `>>> ${newMessage.content?.slice(0, 900) || '*None*'}`, inline: false }
                ],
                guild: oldMessage.guild
            });

            await logChannel.send({ embeds: [editEmbed] }).catch(() => {});
        } catch (err) {}
    });

    client.on('messageDeleteBulk', async (messages) => {
        try {
            const firstMsg = messages.first();
            if (!firstMsg || !firstMsg.guild) return;
            const logChannel = (await client.getLogChannel(firstMsg.guild, 'messages')) || (await client.getLogChannel(firstMsg.guild, 'moderate'));
            if (!logChannel) return;

            const bulkEmbed = createStarryLogEmbed({
                title: 'Bulk Message Purge',
                emoji: '🧹',
                color: '#FEE75C',
                target: null,
                extraFields: [
                    { name: '📺 Channel', value: `<#${firstMsg.channel.id}>`, inline: true },
                    { name: '📊 Total Purged', value: `\`${messages.size}\` messages`, inline: true }
                ],
                guild: firstMsg.guild
            });

            await logChannel.send({ embeds: [bulkEmbed] }).catch(() => {});
        } catch (err) {}
    });
// ==========================================
// 🧠 STARRY SUPREME MASTER AI ENGINE (PART 5 OF 7)
// File Path: modules/starry.js
// ==========================================

    // ==========================================
    // 🔊 LOGS: VOICE CHANNEL
    // ==========================================
    client.on('voiceStateUpdate', async (oldState, newState) => {
        try {
            const guild = newState.guild || oldState.guild;
            const voiceLog = await client.getLogChannel(guild, 'voice');
            if (!voiceLog) return;

            const member = newState.member || oldState.member;
            if (!member || member.user.bot) return;

            if (!oldState.channelId && newState.channelId) {
                const joinVcEmbed = createStarryLogEmbed({
                    title: 'Joined Voice Channel',
                    emoji: '🔊',
                    color: '#2ECC71',
                    target: member.user,
                    extraFields: [{ name: '🎙️ Voice Channel', value: `<#${newState.channelId}>`, inline: true }],
                    guild
                });
                await voiceLog.send({ embeds: [joinVcEmbed] }).catch(() => {});
            } else if (oldState.channelId && !newState.channelId) {
                const leaveVcEmbed = createStarryLogEmbed({
                    title: 'Left Voice Channel',
                    emoji: '🔇',
                    color: '#ED4245',
                    target: member.user,
                    extraFields: [{ name: '🎙️ Voice Channel', value: `<#${oldState.channelId}>`, inline: true }],
                    guild
                });
                await voiceLog.send({ embeds: [leaveVcEmbed] }).catch(() => {});
            } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                const moveVcEmbed = createStarryLogEmbed({
                    title: 'Moved Voice Channel',
                    emoji: '🔀',
                    color: '#5865F2',
                    target: member.user,
                    extraFields: [
                        { name: '⬅️ From Channel', value: `<#${oldState.channelId}>`, inline: true },
                        { name: '➡️ To Channel', value: `<#${newState.channelId}>`, inline: true }
                    ],
                    guild
                });
                await voiceLog.send({ embeds: [moveVcEmbed] }).catch(() => {});
            }
        } catch (err) {}
    });

    // ==========================================
    // 📁 LOGS: CHANNELS CHANNEL
    // ==========================================
    client.on('channelCreate', async (channel) => {
        if (!channel.guild) return;
        const channelLog = await client.getLogChannel(channel.guild, 'channels');
        if (!channelLog) return;

        const embed = createStarryLogEmbed({
            title: 'Channel Created',
            emoji: '📺',
            color: '#2ECC71',
            target: null,
            extraFields: [
                { name: '📛 Channel Name', value: `<#${channel.id}> (\`${channel.name}\`)`, inline: true },
                { name: '🆔 Channel ID', value: `\`${channel.id}\``, inline: true }
            ],
            guild: channel.guild
        });
        await channelLog.send({ embeds: [embed] }).catch(() => {});
    });

    client.on('channelDelete', async (channel) => {
        if (!channel.guild) return;
        const channelLog = await client.getLogChannel(channel.guild, 'channels');
        if (!channelLog) return;

        const embed = createStarryLogEmbed({
            title: 'Channel Deleted',
            emoji: '🗑️',
            color: '#ED4245',
            target: null,
            extraFields: [
                { name: '📛 Channel Name', value: `\`${channel.name}\``, inline: true },
                { name: '🆔 Channel ID', value: `\`${channel.id}\``, inline: true }
            ],
            guild: channel.guild
        });
        await channelLog.send({ embeds: [embed] }).catch(() => {});
    });

    // ==========================================
    // 👥 LOGS: MEMBERS CHANNEL (Roles & Nicknames)
    // ==========================================
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        try {
            const memberLog = await client.getLogChannel(newMember.guild, 'members');
            if (!memberLog) return;

            const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
            const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

            if (addedRoles.size > 0) {
                const embed = createStarryLogEmbed({
                    title: 'Member Granted Role(s)',
                    emoji: '🛡️',
                    color: '#2ECC71',
                    target: newMember.user,
                    extraFields: [
                        { name: '➕ Added Role(s)', value: addedRoles.map(r => `<@&${r.id}>`).join(', '), inline: false }
                    ],
                    guild: newMember.guild
                });
                await memberLog.send({ embeds: [embed] }).catch(() => {});
            }

            if (removedRoles.size > 0) {
                const embed = createStarryLogEmbed({
                    title: 'Member Removed Role(s)',
                    emoji: '🛑',
                    color: '#ED4245',
                    target: newMember.user,
                    extraFields: [
                        { name: '➖ Removed Role(s)', value: removedRoles.map(r => `<@&${r.id}>`).join(', '), inline: false }
                    ],
                    guild: newMember.guild
                });
                await memberLog.send({ embeds: [embed] }).catch(() => {});
            }

            if (oldMember.nickname !== newMember.nickname) {
                const embed = createStarryLogEmbed({
                    title: 'Member Nickname Changed',
                    emoji: '🏷️',
                    color: '#5865F2',
                    target: newMember.user,
                    extraFields: [
                        { name: '⬅️ Before', value: `\`${oldMember.nickname || oldMember.user.username}\``, inline: true },
                        { name: '➡️ After', value: `\`${newMember.nickname || newMember.user.username}\``, inline: true }
                    ],
                    guild: newMember.guild
                });
                await memberLog.send({ embeds: [embed] }).catch(() => {});
            }
        } catch (err) {}
    });

    // ==========================================
    // 🛡️ AUDIT LOG FALLBACK (CAPTURES DISCORD UI ACTIONS & MODERATOR NAMES)
    // ==========================================
    client.on('guildAuditLogEntryCreate', async (auditLog, guild) => {
        try {
            const logChannel = await client.getLogChannel(guild, 'moderate');
            if (!logChannel) return;

            const { action, executor, target, reason } = auditLog;
            if (!executor || (executor.bot && executor.id === client.user.id)) return;

            if (action === AuditLogEvent.MemberUpdate) {
                const timeoutChange = auditLog.changes?.find(c => c.key === 'communication_disabled_until');
                if (timeoutChange) {
                    const expiresAt = timeoutChange.new;
                    const targetUser = await client.users.fetch(target.id).catch(() => target);
                    if (expiresAt) {
                        const embed = createStarryLogEmbed({
                            title: 'Member Timed Out',
                            emoji: '⏰',
                            color: '#ED4245',
                            target: targetUser,
                            moderator: executor,
                            reason: reason || 'Action via Discord UI',
                            expiresAt: expiresAt,
                            guild
                        });
                        await logChannel.send({ embeds: [embed] }).catch(() => {});
                    } else {
                        const embed = createStarryLogEmbed({
                            title: 'Member Timeout Removed',
                            emoji: '🔓',
                            color: '#2ECC71',
                            target: targetUser,
                            moderator: executor,
                            reason: reason || 'Timeout removed via Discord UI',
                            guild
                        });
                        await logChannel.send({ embeds: [embed] }).catch(() => {});
                    }
                }
            }

            if (action === AuditLogEvent.MemberBanAdd) {
                const targetUser = await client.users.fetch(target.id).catch(() => target);
                const embed = createStarryLogEmbed({
                    title: 'Member Banned',
                    emoji: '🔨',
                    color: '#ED4245',
                    target: targetUser,
                    moderator: executor,
                    reason: reason || 'Banned via Discord UI',
                    guild
                });
                await logChannel.send({ embeds: [embed] }).catch(() => {});
            }

            if (action === AuditLogEvent.MemberKick) {
                const targetUser = await client.users.fetch(target.id).catch(() => target);
                const embed = createStarryLogEmbed({
                    title: 'Member Kicked',
                    emoji: '🚪',
                    color: '#DA373C',
                    target: targetUser,
                    moderator: executor,
                    reason: reason || 'Kicked via Discord UI',
                    guild
                });
                await logChannel.send({ embeds: [embed] }).catch(() => {});
            }
        } catch (err) {}
    });
// ==========================================
// 🧠 STARRY SUPREME MASTER AI ENGINE (PART 6 OF 7)
// File Path: modules/starry.js
// ==========================================

    // Single unified interaction router preventing double event binding & timeout errors
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.guild) return;

        // ==========================================
        // ⚡ INSTANT DEFERRAL TO PREVENT 3s TIMEOUT
        // ==========================================
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'setup-starry') {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: [EPHEMERAL_FLAG] }).catch(() => {});
                }
                try {
                    const result = await provisionMasterServerStructure(interaction);
                    const embed = new EmbedBuilder()
                        .setColor('#2ecc71')
                        .setTitle('✨ Autonomous Server Setup Complete!')
                        .setDescription(`Configured **6 Categories** and **${result.totalChannels} Security & Log Channels**!`);
                    return interaction.editReply({ embeds: [embed] });
                } catch (err) {
                    console.error('❌ Setup Error:', err);
                    return interaction.editReply({ content: `❌ **Setup failed:** \`${err.message}\`` });
                }
            }

            if (interaction.commandName === 'modpanel') {
                const targetUser = interaction.options.getUser('target', true);

                const panelEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setAuthor({ name: `${interaction.guild.name} | Security Control`, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                    .setTitle(`🛡️ Moderation Control Center: ${targetUser.username}`)
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                    .setDescription(
                        `Select an enforcement action below to perform on <@${targetUser.id}>.\n\n` +
                        `*Clicking a button will prompt a pop-up window for inputting reasons and durations.*`
                    )
                    .setFooter({ text: `Target ID: ${targetUser.id} • Starry Security Engine`, iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();

                const actionRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`mp_warn_${targetUser.id}`).setLabel('Warn').setStyle(ButtonStyle.Primary).setEmoji('⚠️'),
                    new ButtonBuilder().setCustomId(`mp_timeout_${targetUser.id}`).setLabel('Timeout').setStyle(ButtonStyle.Secondary).setEmoji('⏰'),
                    new ButtonBuilder().setCustomId(`mp_kick_${targetUser.id}`).setLabel('Kick').setStyle(ButtonStyle.Danger).setEmoji('🚪'),
                    new ButtonBuilder().setCustomId(`mp_ban_${targetUser.id}`).setLabel('Ban').setStyle(ButtonStyle.Danger).setEmoji('🔨')
                );

                return interaction.reply({ embeds: [panelEmbed], components: [actionRow], flags: [EPHEMERAL_FLAG] });
            }
        }

        // ==========================================
        // 🔘 BUTTON CLICK HANDLERS (MODPANEL + BADWORD + SOCIAL + VERIFY)
        // ==========================================
        if (interaction.isButton()) {
            // --- MODPANEL BUTTON ACTIONS ---
            if (interaction.customId.startsWith('mp_')) {
                const parts = interaction.customId.split('_');
                const action = parts[1];
                const targetId = parts[2];

                if (action === 'warn') {
                    const modal = new ModalBuilder().setCustomId(`md_warn_${targetId}`).setTitle('Issue User Warning');
                    const reasonInput = new TextInputBuilder().setCustomId('mod_reason').setLabel('Reason for Warning').setStyle(TextInputStyle.Paragraph).setPlaceholder('Enter reason').setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                    return interaction.showModal(modal);
                }

                if (action === 'timeout') {
                    const modal = new ModalBuilder().setCustomId(`md_timeout_${targetId}`).setTitle('Timeout Member');
                    const durInput = new TextInputBuilder().setCustomId('mod_duration').setLabel('Duration (e.g. 10m, 1h, 1d)').setStyle(TextInputStyle.Short).setPlaceholder('10m').setRequired(true);
                    const reasonInput = new TextInputBuilder().setCustomId('mod_reason').setLabel('Reason for Timeout').setStyle(TextInputStyle.Paragraph).setPlaceholder('Enter reason').setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(durInput), new ActionRowBuilder().addComponents(reasonInput));
                    return interaction.showModal(modal);
                }

                if (action === 'kick') {
                    const modal = new ModalBuilder().setCustomId(`md_kick_${targetId}`).setTitle('Kick Member');
                    const reasonInput = new TextInputBuilder().setCustomId('mod_reason').setLabel('Reason for Kick').setStyle(TextInputStyle.Paragraph).setPlaceholder('Enter reason').setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                    return interaction.showModal(modal);
                }

                if (action === 'ban') {
                    const modal = new ModalBuilder().setCustomId(`md_ban_${targetId}`).setTitle('Ban Member');
                    const reasonInput = new TextInputBuilder().setCustomId('mod_reason').setLabel('Reason for Ban').setStyle(TextInputStyle.Paragraph).setPlaceholder('Enter reason').setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                    return interaction.showModal(modal);
                }
            }

            // --- BADWORD PANEL BUTTONS ---
            if (interaction.customId.startsWith('badword_')) {
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: '❌ Only Administrators can manage this panel.', flags: [EPHEMERAL_FLAG] });
                }

                const guildId = interaction.guild.id;

                if (interaction.customId === 'badword_toggle_btn') {
                    let settings = await BadWordSettings.findOne({ guildId });
                    if (!settings) {
                        settings = await BadWordSettings.create({ guildId, enabled: true, words: DEFAULT_BAD_WORDS });
                    } else {
                        settings.enabled = !settings.enabled;
                        await settings.save();
                    }

                    const panel = await getBadWordPanelEmbed(interaction.guild, client);
                    return interaction.update(panel);
                }

                if (interaction.customId === 'badword_add_btn') {
                    const modal = new ModalBuilder().setCustomId('badword_add_modal').setTitle('Add Bad Words to Filter');
                    const input = new TextInputBuilder().setCustomId('badwords_input').setLabel('Words to Add (comma separated)').setStyle(TextInputStyle.Paragraph).setPlaceholder('e.g. word1, word2').setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    return interaction.showModal(modal);
                }

                if (interaction.customId === 'badword_remove_btn') {
                    const modal = new ModalBuilder().setCustomId('badword_remove_modal').setTitle('Remove Bad Words from Filter');
                    const input = new TextInputBuilder().setCustomId('badwords_input').setLabel('Words to Remove (comma separated)').setStyle(TextInputStyle.Paragraph).setPlaceholder('e.g. word1, word2').setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    return interaction.showModal(modal);
                }

                if (interaction.customId === 'badword_list_btn') {
                    const settings = await BadWordSettings.findOne({ guildId });
                    const wordsList = settings?.words?.length ? settings.words.join(', ') : 'No bad words currently filtered.';
                    const listEmbed = new EmbedBuilder().setColor('#5865F2').setTitle('📜 Complete Filtered Bad Words List').setDescription(`\`\`\`${wordsList.slice(0, 3900)}\`\`\``).setTimestamp();
                    return interaction.reply({ embeds: [listEmbed], flags: [EPHEMERAL_FLAG] });
                }
            }
        }

        // ==========================================
        // 📝 MODAL SUBMISSIONS HANDLER
        // ==========================================
        if (interaction.isModalSubmit()) {
            // --- MODPANEL MODALS ---
            if (interaction.customId.startsWith('md_')) {
                const parts = interaction.customId.split('_');
                const action = parts[1];
                const targetId = parts[2];

                const targetUser = await client.users.fetch(targetId).catch(() => null);
                if (!targetUser) return interaction.reply({ content: '❌ Target user not found.', flags: [EPHEMERAL_FLAG] });

                const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
                const reason = interaction.fields.getTextInputValue('mod_reason') || 'No reason provided';
                const caseId = Math.floor(Math.random() * 90000) + 10000;
                const logChannel = await client.getLogChannel(interaction.guild, 'moderate');

                // ⚠️ WARN
                if (action === 'warn') {
                    await interaction.reply({ content: `⚠️ **Warned <@${targetUser.id}>!**\n**Reason:** ${reason}`, flags: [EPHEMERAL_FLAG] });

                    if (targetMember) {
                        await client.sendPremiumModDM(targetMember, interaction.member, 'Warning', reason, null, interaction.guild, caseId);
                    }

                    if (logChannel) {
                        const warnLogEmbed = createStarryLogEmbed({
                            title: 'Member Warned',
                            emoji: '⚠️',
                            color: '#FEE75C',
                            target: targetUser,
                            moderator: interaction.user,
                            reason: reason,
                            caseId: caseId,
                            guild: interaction.guild
                        });
                        await logChannel.send({ embeds: [warnLogEmbed] }).catch(err => console.error('❌ Log dispatch error:', err.message));
                    }
                    return;
                }

                // ⏰ TIMEOUT
                if (action === 'timeout') {
                    const durationStr = interaction.fields.getTextInputValue('mod_duration') || '10m';
                    function parseDuration(text) {
                        const match = text.match(/(\d+)\s*(s|m|h|d)/i);
                        if (!match) return 10 * 60 * 1000;
                        const val = parseInt(match[1]);
                        const unit = match[2].toLowerCase();
                        if (unit === 's') return val * 1000;
                        if (unit === 'm') return val * 60 * 1000;
                        if (unit === 'h') return val * 3600 * 1000;
                        if (unit === 'd') return val * 86400 * 1000;
                        return 10 * 60 * 1000;
                    }

                    const durationMs = parseDuration(durationStr);
                    const expiresAt = new Date(Date.now() + durationMs);

                    if (!targetMember) return interaction.reply({ content: '❌ Member is not in the server.', flags: [EPHEMERAL_FLAG] });

                    await client.sendPremiumModDM(targetMember, interaction.member, 'Timeout', reason, durationStr, interaction.guild, caseId);
                    await targetMember.timeout(durationMs, `${reason} | Executed by ${interaction.user.tag}`);

                    await interaction.reply({ content: `⏰ **Timed out <@${targetUser.id}> for ${durationStr}!**`, flags: [EPHEMERAL_FLAG] });

                    if (logChannel) {
                        const timeoutLogEmbed = createStarryLogEmbed({
                            title: 'Member Timed Out',
                            emoji: '⏰',
                            color: '#ED4245',
                            target: targetUser,
                            moderator: interaction.user,
                            reason: reason,
                            duration: durationStr,
                            expiresAt: expiresAt,
                            caseId: caseId,
                            guild: interaction.guild
                        });
                        await logChannel.send({ embeds: [timeoutLogEmbed] }).catch(err => console.error('❌ Log dispatch error:', err.message));
                    }
                    return;
                }

                // 🚪 KICK
                if (action === 'kick') {
                    if (!targetMember) return interaction.reply({ content: '❌ Member is not in the server.', flags: [EPHEMERAL_FLAG] });

                    await client.sendPremiumModDM(targetMember, interaction.member, 'Kick', reason, null, interaction.guild, caseId);
                    await targetMember.kick(`${reason} | Executed by ${interaction.user.tag}`);

                    await interaction.reply({ content: `🚪 **Kicked <@${targetUser.id}>!**`, flags: [EPHEMERAL_FLAG] });

                    if (logChannel) {
                        const kickLogEmbed = createStarryLogEmbed({
                            title: 'Member Kicked',
                            emoji: '🚪',
                            color: '#DA373C',
                            target: targetUser,
                            moderator: interaction.user,
                            reason: reason,
                            caseId: caseId,
                            guild: interaction.guild
                        });
                        await logChannel.send({ embeds: [kickLogEmbed] }).catch(err => console.error('❌ Log dispatch error:', err.message));
                    }
                    return;
                }

                // 🔨 BAN
                if (action === 'ban') {
                    if (targetMember) {
                        await client.sendPremiumModDM(targetMember, interaction.member, 'Ban', reason, null, interaction.guild, caseId);
                    }

                    await interaction.guild.members.ban(targetUser.id, { reason: `${reason} | Executed by ${interaction.user.tag}` });
                    await interaction.reply({ content: `🔨 **Banned <@${targetUser.id}>!**`, flags: [EPHEMERAL_FLAG] });

                    if (logChannel) {
                        const banLogEmbed = createStarryLogEmbed({
                            title: 'Member Banned',
                            emoji: '🔨',
                            color: '#ED4245',
                            target: targetUser,
                            moderator: interaction.user,
                            reason: reason,
                            caseId: caseId,
                            guild: interaction.guild
                        });
                        await logChannel.send({ embeds: [banLogEmbed] }).catch(err => console.error('❌ Log dispatch error:', err.message));
                    }
                    return;
                }
            }

            // --- BADWORD MODALS ---
            if (interaction.customId === 'badword_add_modal') {
                const inputWords = interaction.fields.getTextInputValue('badwords_input').split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
                let settings = await BadWordSettings.findOne({ guildId: interaction.guild.id });
                if (!settings) settings = new BadWordSettings({ guildId: interaction.guild.id, enabled: true, words: DEFAULT_BAD_WORDS });

                const added = [];
                for (const word of inputWords) {
                    if (!settings.words.includes(word)) {
                        settings.words.push(word);
                        added.push(word);
                    }
                }
                await settings.save();
                await interaction.reply({ content: `✅ Added **${added.length}** new word(s) to the filter list!`, flags: [EPHEMERAL_FLAG] });
                const panel = await getBadWordPanelEmbed(interaction.guild, client);
                if (interaction.message) await interaction.message.edit(panel).catch(() => {});
            }

            if (interaction.customId === 'badword_remove_modal') {
                const removeWords = interaction.fields.getTextInputValue('badwords_input').split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
                let settings = await BadWordSettings.findOne({ guildId: interaction.guild.id });
                if (settings && settings.words) {
                    settings.words = settings.words.filter(w => !removeWords.includes(w.toLowerCase()));
                    await settings.save();
                }
                await interaction.reply({ content: `✅ Removed specified word(s) from the filter list!`, flags: [EPHEMERAL_FLAG] });
                const panel = await getBadWordPanelEmbed(interaction.guild, client);
                if (interaction.message) await interaction.message.edit(panel).catch(() => {});
            }
        }
    });
// ==========================================
// 🧠 STARRY SUPREME MASTER AI ENGINE (PART 7 OF 7)
// File Path: modules/starry.js
// ==========================================

    function cleanCategoryName(str) {
        if (!str) return '';
        return str.toLowerCase()
            .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F800}-\u{1F8FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
            .replace(/&/g, 'and')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async function handleBadWordAutoMod(client, message) {
        if (!message.guild || message.author.bot || !message.member) return false;

        const text = message.content.trim();
        const lowerText = text.toLowerCase();

        if (lowerText === '.badon') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                await message.reply('❌ You need **Administrator** permissions to use `.badon`.');
                return true;
            }
            let settings = await BadWordSettings.findOne({ guildId: message.guild.id });
            if (!settings) {
                settings = await BadWordSettings.create({ guildId: message.guild.id, enabled: true, words: DEFAULT_BAD_WORDS });
            } else {
                settings.enabled = true;
                await settings.save();
            }
            const panel = await getBadWordPanelEmbed(message.guild, client);
            await message.reply({ content: '✅ Bad word moderation is now **ENABLED**!', ...panel });
            return true;
        }

        if (lowerText === '.badoff') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                await message.reply('❌ You need **Administrator** permissions to use `.badoff`.');
                return true;
            }
            await BadWordSettings.findOneAndUpdate({ guildId: message.guild.id }, { enabled: false }, { upsert: true });
            await message.reply('🛑 Bad word moderation has been **DISABLED**.');
            return true;
        }

        if (message.member.permissions.has(PermissionFlagsBits.Administrator)) return false;

        const settings = await BadWordSettings.findOne({ guildId: message.guild.id });
        if (!settings || !settings.enabled || !settings.words || settings.words.length === 0) return false;

        const cleanedContent = lowerText.replace(/[^a-z0-9\s]/gi, '');
        const wordsInMsg = cleanedContent.split(/\s+/);

        const detectedWord = settings.words.find(badWord => {
            const bw = badWord.toLowerCase().trim();
            if (!bw) return false;
            return lowerText.includes(bw) || wordsInMsg.includes(bw);
        });

        if (detectedWord) {
            await message.delete().catch(() => {});
            const publicWarn = await message.channel.send(`⚠️ <@${message.author.id}>, your message was removed because it contained bad/cuss words! Please keep the channel clean.`).catch(() => null);
            if (publicWarn) setTimeout(() => publicWarn.delete().catch(() => {}), 6000);

            const dmWarnEmbed = new EmbedBuilder()
                .setColor('#ed4245')
                .setAuthor({ name: `${message.guild.name} | Security Warning`, iconURL: message.guild.iconURL({ dynamic: true }) })
                .setTitle('🛑 Language Warning Notice')
                .setDescription(`Hello **${message.author.username}**, your message in **${message.guild.name}** was deleted for violating the server's bad word policy.`)
                .addFields(
                    { name: '📺 Channel', value: `<#${message.channel.id}>`, inline: true },
                    { name: '⚠️ Detected Cuss Word', value: `\`${detectedWord}\``, inline: true },
                    { name: '📝 Original Content', value: `\`\`\`${message.content.slice(0, 500)}\`\`\``, inline: false }
                )
                .setFooter({ text: 'Please refrain from using bad language in public channels.' })
                .setTimestamp();

            await message.author.send({ embeds: [dmWarnEmbed] }).catch(() => {});
            return true;
        }
        return false;
    }

    async function handleAutoModPing(message) {
        if (!message.guild || message.author.bot || !message.member) return false;
        const rawPingMatches = message.content.match(/<@!?\d+>|<@&\d+>|@everyone|@here/g) || [];
        const totalPings = Math.max(message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 1 : 0), rawPingMatches.length);

        if (totalPings >= 5) {
            const botMember = message.guild.members.me;
            if (botMember && botMember.permissions.has(PermissionFlagsBits.ManageMessages)) await message.delete().catch(() => {});

            if (botMember && botMember.permissions.has(PermissionFlagsBits.ModerateMembers) && message.member.roles.highest.position < botMember.roles.highest.position && message.author.id !== message.guild.ownerId) {
                await message.member.timeout(10 * 60 * 1000, `Mass Ping AutoMod (${totalPings} pings)`).catch(() => {});
                const warningMsg = await message.channel.send(`🛡️ **AutoMod:** <@${message.author.id}> was timed out for **10 minutes** due to Mass Mentioning!`).catch(() => null);
                if (warningMsg) setTimeout(() => warningMsg.delete().catch(() => {}), 6000);
            }
            return true;
        }
        return false;
    }

    async function handleSmartModeration(client, message, triggerWord = 'starry') {
        if (!message.guild || message.author.bot) return false;

        const rawContent = message.content;
        const lowerContent = rawContent.toLowerCase();

        const mentionsBot = message.mentions.has(client.user.id);
        const hasTriggerWord = lowerContent.includes(triggerWord) || lowerContent.includes('jarvis');
        if (!mentionsBot && !hasTriggerWord) return false;

        const isTimeout = lowerContent.includes('timeout') || lowerContent.includes('mute');
        const isUntimeout = lowerContent.includes('untimeout') || lowerContent.includes('unmute');
        const isKick = lowerContent.includes('kick');
        const isBan = lowerContent.includes('ban');
        const isPurge = lowerContent.includes('purge') || lowerContent.includes('clear') || lowerContent.includes('clean');

        if (!isTimeout && !isUntimeout && !isKick && !isBan && !isPurge) return false;

        const executor = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
        const botMember = message.guild.members.me || await message.guild.members.fetch(client.user.id).catch(() => null);

        if (isPurge) {
            if (!executor || !executor.permissions.has(PermissionFlagsBits.ManageMessages)) {
                await message.reply('❌ You need **Manage Messages** permissions to purge.');
                return true;
            }
            const numberMatch = lowerContent.match(/\b\d+\b/);
            const count = numberMatch ? parseInt(numberMatch[0]) : 5;
            const deleteCount = Math.min(count, 99) + 1;

            const deleted = await message.channel.bulkDelete(deleteCount, true).catch(() => null);
            const actualDeletedCount = deleted ? Math.max(0, deleted.size - 1) : count;

            const sent = await message.channel.send(`🧹 Successfully cleared ${actualDeletedCount} messages!`).catch(() => null);
            if (sent) setTimeout(() => sent.delete().catch(() => {}), 3500);

            const logChannel = (await client.getLogChannel(message.guild, 'messages')) || (await client.getLogChannel(message.guild, 'moderate'));
            if (logChannel) {
                const purgeEmbed = createStarryLogEmbed({
                    title: 'Channel Messages Purged',
                    emoji: '🧹',
                    color: '#FEE75C',
                    target: null,
                    moderator: message.author,
                    extraFields: [
                        { name: '📺 Channel', value: `<#${message.channel.id}>`, inline: true },
                        { name: '📊 Amount Deleted', value: `\`${actualDeletedCount}\` messages`, inline: true }
                    ],
                    guild: message.guild
                });
                await logChannel.send({ embeds: [purgeEmbed] }).catch(() => {});
            }
            return true;
        }

        try {
            let targetUser = message.mentions.users.filter(u => u.id !== client.user.id).first();
            if (!targetUser) {
                const idMatch = rawContent.match(/\b\d{17,19}\b/);
                if (idMatch) targetUser = await client.users.fetch(idMatch[0]).catch(() => null);
            }

            if (!targetUser) {
                await message.reply('❌ Please mention a valid user to moderate.');
                return true;
            }

            const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
            let reason = 'No reason provided';
            if (lowerContent.includes('for ')) reason = rawContent.substring(rawContent.toLowerCase().indexOf('for ') + 4).trim();

            const caseId = Math.floor(Math.random() * 90000) + 10000;
            const logChannel = await client.getLogChannel(message.guild, 'moderate');

            if (isTimeout && !isUntimeout) {
                const durationMs = 10 * 60 * 1000;
                const durationStr = '10m';
                const expiresAt = new Date(Date.now() + durationMs);

                if (targetMember) {
                    await client.sendPremiumModDM(targetMember, executor, 'Timeout', reason, durationStr, message.guild, caseId);
                    await targetMember.timeout(durationMs, `${reason} | Executed by ${message.author.tag}`);
                }

                const embed = createStarryLogEmbed({
                    title: 'Member Timed Out',
                    emoji: '⏰',
                    color: '#ED4245',
                    target: targetUser,
                    moderator: message.author,
                    reason: reason,
                    duration: durationStr,
                    expiresAt: expiresAt,
                    caseId: caseId,
                    guild: message.guild
                });

                await message.reply({ embeds: [embed] });
                if (logChannel) await logChannel.send({ embeds: [embed] }).catch(() => {});
                return true;
            }

            if (isKick) {
                if (targetMember) {
                    await client.sendPremiumModDM(targetMember, executor, 'Kick', reason, null, message.guild, caseId);
                    await targetMember.kick(`${reason} | Executed by ${message.author.tag}`);
                }

                const embed = createStarryLogEmbed({
                    title: 'Member Kicked',
                    emoji: '🚪',
                    color: '#DA373C',
                    target: targetUser,
                    moderator: message.author,
                    reason: reason,
                    caseId: caseId,
                    guild: message.guild
                });

                await message.reply({ embeds: [embed] });
                if (logChannel) await logChannel.send({ embeds: [embed] }).catch(() => {});
                return true;
            }

            if (isBan) {
                if (targetMember) {
                    await client.sendPremiumModDM(targetMember, executor, 'Ban', reason, null, message.guild, caseId);
                }
                await message.guild.members.ban(targetUser.id, { reason: `${reason} | Executed by ${message.author.tag}` });

                const embed = createStarryLogEmbed({
                    title: 'Member Banned',
                    emoji: '🔨',
                    color: '#ED4245',
                    target: targetUser,
                    moderator: message.author,
                    reason: reason,
                    caseId: caseId,
                    guild: message.guild
                });

                await message.reply({ embeds: [embed] });
                if (logChannel) await logChannel.send({ embeds: [embed] }).catch(() => {});
                return true;
            }

        } catch (err) {
            await message.reply(`❌ Action failed: \`${err.message}\``).catch(() => {});
            return true;
        }

        return false;
    }

    client.on('messageCreate', async (message) => {
        if (!message.guild || message.author.bot || !message.content || blacklistedUsers.has(message.author.id)) return;

        let triggerWord = 'starry';
        if (await handleBadWordAutoMod(client, message)) return;
        if (await handleAutoModPing(message)) return;
        const modHandled = await handleSmartModeration(client, message, triggerWord);
        if (modHandled) return;
    });
};

module.exports.provisionMasterServerStructure = provisionMasterServerStructure;
module.exports.generateAIResponseWithRetry = generateAIResponseWithRetry;
module.exports.executeFullGuildBackup = executeFullGuildBackup;
module.exports.emergencyNukePayload = emergencyNukeCommand.toJSON();
module.exports.modPanelPayload = modPanelSlashCommand.toJSON();
module.exports.setupStarryPayload = setupStarryCommand.toJSON();
module.exports.modMasterPayload = modMasterCommand.toJSON();
module.exports.autoModMasterPayload = autoModMasterCommand.toJSON();
module.exports.ignorePayload = ignoreCommand.toJSON();
module.exports.unignorePayload = unignoreCommand.toJSON();
module.exports.moderateMasterPayload = moderateMasterCommand.toJSON();
module.exports.verifySetupPayload = verifySetupCommand.toJSON();
