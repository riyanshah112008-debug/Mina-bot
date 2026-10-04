// ==========================================
// 🛡️ STARRY SUPREME AUTOMOD PRO ENGINE
// File Path: src/modules/automod.js
// Advanced Channel-Level & Server-Level Link & Emoji Spam Protection
// ==========================================
const { PermissionsBitField, Events } = require('discord.js');
const mongoose = require('mongoose');
const config = require('../config');
const automodHelper = require('../utils/automodHelper');

const OWNER_IDS = Array.isArray(config.BOT_OWNERS) ? config.BOT_OWNERS : ['1465049039153135639', '1257676837249617971'];

// ==========================================
// 🔗 ULTIMATE MEDIA & GIF URL CHECKER
// ==========================================
function isAllowedUrl(linkString) {
    try {
        const cleanLink = linkString.replace(/[.,!?>)]+$/, '');
        const parsed = new URL(cleanLink);
        const host = parsed.hostname.toLowerCase();
        const pathname = parsed.pathname.toLowerCase();

        const safeDomains = [
            'discord.com', 'discordapp.com', 'discordapp.net',
            'klipy.com', 'klipy.co',
            'tenor.com', 'tenor.co', 'tenor.googleapis.com',
            'giphy.com', 'gph.is',
            'imgur.com', 'imgur.io', 'redd.it', 'reddit.com', 'twimg.com',
            'gfycat.com', 'redgifs.com',
            'ezgif.com', 'gyazo.com', 'imgflip.com', 'coub.com',
            'gifdb.com', 'gifer.com', 'makeagif.com', 'streamable.com',
            'catbox.moe', 'icegif.com', 'cliply.co', 'tumblr.com', 'pinimg.com'
        ];

        const isSafeDomain = safeDomains.some(domain => host === domain || host.endsWith('.' + domain));
        if (isSafeDomain) return true;

        const mediaExtensions = ['.gif', '.gifv', '.webp', '.mp4', '.webm', '.png', '.jpg', '.jpeg'];
        if (mediaExtensions.some(ext => pathname.endsWith(ext))) return true;

        const safePaths = ['/view/', '/gifs/', '/watch/', '/gif/', '/gallery/', '/clip/', '/sticker/'];
        if (safePaths.some(path => pathname.includes(path))) return true;

        return false;
    } catch {
        return false;
    }
}

// ==========================================
// 🚀 MAIN AUTOMOD MODULE EXPORT
// ==========================================
module.exports = (client) => {
    client.automod = automodHelper;

    const linkPattern = /https?:\/\/\S+/g;
    const emojiPattern = /<a?:[a-zA-Z0-9_]+:[0-9]+>|[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

    // Load DB Caches once Discord Bot connects
    client.once(Events.ClientReady || 'clientReady', async () => {
        await automodHelper.initAutomodCaches();
        console.log('✅ Automod Engine Ready (MongoDB Connected & Caches Synced)');
    });

    // ==========================================
    // 1. SLASH COMMANDS INTERACTION LISTENER
    // ==========================================
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.guild || !interaction.member) return;

        const validCommands = ['automod', 'ignore', 'unignore'];
        if (!validCommands.includes(interaction.commandName)) return;

        const isOwner = typeof client.isOwner === 'function' 
            ? client.isOwner(interaction.user.id) 
            : OWNER_IDS.includes(interaction.user.id);
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                        interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild);

        if (!isAdmin && !isOwner) {
            return interaction.reply({ 
                content: '❌ You need **Administrator** or **Manage Server** permissions to manage Automod settings.', 
                ephemeral: true 
            }).catch(() => {});
        }

        const guildId = interaction.guildId;

        // /automod Command
        if (interaction.commandName === 'automod') {
            const sub = interaction.options.getSubcommand(false);

            // Subcommand: toggle or server (server-wide)
            if (sub === 'toggle' || sub === 'server') {
                const action = interaction.options.getString('action');
                let targetState;
                if (action) {
                    targetState = action === 'enable' || action === 'on';
                } else {
                    targetState = !automodHelper.getGuildStatus(guildId);
                }
                await automodHelper.setGuildStatus(guildId, targetState);
                const overrides = await automodHelper.listGuildOverrides(guildId);
                const embed = automodHelper.buildServerAutomodEmbed(interaction.guild, targetState, overrides);
                const buttons = automodHelper.createServerAutomodButtons(interaction.channelId, targetState);
                return interaction.reply({
                    content: `${targetState ? '✅' : '🚫'} Server-wide Automod is now **${targetState ? 'ENABLED' : 'DISABLED'}**.`,
                    embeds: [embed],
                    components: Array.isArray(buttons) ? buttons : [buttons]
                }).catch(() => {});
            }

            // Subcommand: status
            if (sub === 'status') {
                const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
                const settings = await automodHelper.getChannelSettings(targetChannel.id, guildId);
                const isGuildEnabled = automodHelper.getGuildStatus(guildId);
                const embed = automodHelper.buildChannelAutomodEmbed(interaction.guild, targetChannel, settings, isGuildEnabled);
                const buttons = automodHelper.createChannelAutomodButtons(targetChannel.id, settings, isGuildEnabled);

                return interaction.reply({
                    embeds: [embed],
                    components: Array.isArray(buttons) ? buttons : [buttons]
                }).catch(() => {});
            }

            // Subcommand: channel (or default)
            const action = interaction.options.getString('action') || 'status';
            const filter = interaction.options.getString('filter') || 'all';
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

            if (action === 'status') {
                const settings = await automodHelper.getChannelSettings(targetChannel.id, guildId);
                const isGuildEnabled = automodHelper.getGuildStatus(guildId);
                const embed = automodHelper.buildChannelAutomodEmbed(interaction.guild, targetChannel, settings, isGuildEnabled);
                const buttons = automodHelper.createChannelAutomodButtons(targetChannel.id, settings, isGuildEnabled);

                return interaction.reply({
                    embeds: [embed],
                    components: Array.isArray(buttons) ? buttons : [buttons]
                }).catch(() => {});
            }

            const shouldEnable = action === 'enable';
            const updated = await automodHelper.setChannelFilter(targetChannel.id, guildId, filter, shouldEnable);
            const isGuildEnabled = automodHelper.getGuildStatus(guildId);
            const embed = automodHelper.buildChannelAutomodEmbed(interaction.guild, targetChannel, updated, isGuildEnabled);
            const buttons = automodHelper.createChannelAutomodButtons(targetChannel.id, updated, isGuildEnabled);

            const filterLabel = filter === 'all' ? 'All filters (links & emojis)' : `Filter **${filter}**`;
            return interaction.reply({
                content: `${shouldEnable ? '✅' : '🚫'} ${filterLabel} is now **${shouldEnable ? 'ENABLED' : 'DISABLED'}** in <#${targetChannel.id}>.`,
                embeds: [embed],
                components: Array.isArray(buttons) ? buttons : [buttons]
            }).catch(() => {});
        }

        // /ignore and /unignore Commands
        if (interaction.commandName === 'ignore' || interaction.commandName === 'unignore') {
            const filter = interaction.options.getString('type') || interaction.options.getString('filter') || 'all';
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            const channelId = channel.id;

            if (filter === 'status' && interaction.commandName === 'ignore') {
                const settings = await automodHelper.getChannelSettings(channelId, guildId);
                const isGuildEnabled = automodHelper.getGuildStatus(guildId);
                const embed = automodHelper.buildChannelAutomodEmbed(interaction.guild, channel, settings, isGuildEnabled);
                const buttons = automodHelper.createChannelAutomodButtons(channelId, settings, isGuildEnabled);
                return interaction.reply({ embeds: [embed], components: Array.isArray(buttons) ? buttons : [buttons], ephemeral: true }).catch(() => {});
            }

            const shouldEnable = interaction.commandName === 'unignore';
            const updated = await automodHelper.setChannelFilter(channelId, guildId, filter, shouldEnable);
            const isGuildEnabled = automodHelper.getGuildStatus(guildId);
            const embed = automodHelper.buildChannelAutomodEmbed(interaction.guild, channel, updated, isGuildEnabled);
            const buttons = automodHelper.createChannelAutomodButtons(channelId, updated, isGuildEnabled);

            const filterLabel = filter === 'all' ? 'All Automod filters' : `Automod **${filter}** filter`;
            return interaction.reply({
                content: `${shouldEnable ? '✅' : '🚫'} ${filterLabel} is now **${shouldEnable ? 'ENABLED' : 'DISABLED'}** in <#${channelId}>.`,
                embeds: [embed],
                components: Array.isArray(buttons) ? buttons : [buttons]
            }).catch(() => {});
        }
    });

    // ==========================================
    // 2. REAL-TIME CHAT FILTER & TIMEOUT ENGINE
    // ==========================================
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild) return;

        // Staff / Owner Bypass
        const isStaff = message.member && (
            message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
            message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
            message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)
        );
        const isOwner = typeof client.isOwner === 'function' 
            ? client.isOwner(message.author.id) 
            : (typeof config.isBotOwner === 'function' ? config.isBotOwner(message.author.id, client) : OWNER_IDS.includes(message.author.id));

        if (isStaff || isOwner) return;

        const configPrefix = config.DEFAULT_PREFIX || ',';
        if (message.content.startsWith(configPrefix) || message.content.startsWith('.')) return; // Prefix command bypass

        // 1. Check Server Automod Status
        const isServerEnabled = automodHelper.getGuildStatus(message.guild.id);
        if (!isServerEnabled) return;

        // 2. Fetch Channel Settings (From In-Memory Cache with DB fallback)
        const channelSettings = await automodHelper.getChannelSettings(message.channel.id, message.guild.id);

        // 3. Match Content
        const rawLinks = message.content.match(linkPattern) || [];
        const unauthorizedLinks = rawLinks.filter(link => !isAllowedUrl(link));
        const emojis = message.content.match(emojiPattern) || [];

        const isLinkSpam = channelSettings.linksActive && unauthorizedLinks.length >= 1;
        const isEmojiSpam = channelSettings.emojisActive && emojis.length >= 5;

        // 4. Action Execution
        if (isLinkSpam || isEmojiSpam) {
            try { await message.delete(); } catch {}

            if (isLinkSpam) {
                try {
                    await message.member.timeout(10 * 60 * 1000, "Automod: Unauthorized Link Spam");
                    const warnMsg = await message.channel.send(`⚠️ ${message.author.toString()} has been timed out for **10 minutes** for sending an unauthorized link.`);
                    setTimeout(() => warnMsg.delete().catch(() => {}), 7000);
                } catch {}
            } else if (isEmojiSpam) {
                try {
                    await message.member.timeout(2 * 60 * 1000, "Automod: Emoji Spam");
                    const warnMsg = await message.channel.send(`⚠️ ${message.author.toString()} has been timed out for **2 minutes** for emoji spam.`);
                    setTimeout(() => warnMsg.delete().catch(() => {}), 7000);
                } catch {}
            }
        }
    });
};
