// ==========================================
// 🛡️ STARRY AUTOMOD PRO • CORE CONTROLLER & CACHE ENGINE
// File Path: src/utils/automodHelper.js
// High-Speed In-Memory Cache with Atomic MongoDB Sync
// Provides Channel-Level and Server-Level Filters for Links & Emojis
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits,
    ChannelType 
} = require('discord.js');
const mongoose = require('mongoose');
const config = require('../config');
const db = require('./database');
const { AutomodGuild, AutomodChannel } = require('../models/AutomodSchema');

const isDbConnected = () => Boolean(mongoose.connection && mongoose.connection.readyState === 1);

// Fast In-Memory Caches for Zero-Latency Message Filtering
const guildCache = new Map();
const channelCache = new Map();

/**
 * Initialize DB Caches into Memory
 */
async function initAutomodCaches() {
    try {
        if (isDbConnected()) {
            const gSettings = await AutomodGuild.find().lean();
            gSettings.forEach(s => guildCache.set(s.guildId, s.enabled));

            const cSettings = await AutomodChannel.find().lean();
            cSettings.forEach(s => channelCache.set(s.channelId, { links: s.links, emojis: s.emojis }));

            console.log(`✅ [AutoMod] Synchronized ${guildCache.size} guild rules & ${channelCache.size} channel rules into memory.`);
        }
    } catch (err) {
        console.error('❌ [AutoMod] Failed to synchronize MongoDB cache:', err.message);
    }
}

/**
 * Get Server-Wide AutoMod Status
 * @param {string} guildId
 * @returns {boolean} true = enabled, false = disabled
 */
function getGuildStatus(guildId) {
    if (!guildId) return true;
    if (guildCache.has(guildId)) return guildCache.get(guildId);
    try {
        const localSettings = db.getGuildSettings ? db.getGuildSettings(guildId) : null;
        if (localSettings && localSettings.automod && localSettings.automod.enabled !== undefined) {
            guildCache.set(guildId, localSettings.automod.enabled);
            return localSettings.automod.enabled;
        }
    } catch (_) {}
    return true;
}

/**
 * Set Server-Wide AutoMod Status
 * @param {string} guildId
 * @param {boolean} enabled
 */
async function setGuildStatus(guildId, enabled) {
    if (!guildId) return false;
    guildCache.set(guildId, enabled);

    // Save to local JSON database for persistent offline resilience
    try {
        if (db.updateGuildSettings && db.getGuildSettings) {
            const current = db.getGuildSettings(guildId) || {};
            const automod = current.automod || {};
            automod.enabled = enabled;
            db.updateGuildSettings(guildId, { automod });
        }
    } catch (_) {}

    // Save to MongoDB if online
    if (isDbConnected()) {
        try {
            await AutomodGuild.findOneAndUpdate(
                { guildId },
                { enabled },
                { upsert: true, new: true }
            );
        } catch (err) {
            console.error('❌ [AutoMod] Error saving guild status:', err.message);
        }
    }
    return enabled;
}

/**
 * Get Channel-Specific Settings
 * Note: In DB, `links: true` means links are ignored/allowed (filter disabled).
 * `linksActive: true` means AutoMod is blocking unauthorized links.
 * @param {string} channelId 
 * @param {string} [guildId]
 */
async function getChannelSettings(channelId, guildId = null) {
    if (!channelId) {
        return { channelId: '', guildId: '', links: false, emojis: false, linksActive: true, emojisActive: true };
    }

    let raw = channelCache.get(channelId);
    if (!raw) {
        try {
            const dbDoc = await AutomodChannel.findOne({ channelId }).lean();
            if (dbDoc) {
                raw = { links: Boolean(dbDoc.links), emojis: Boolean(dbDoc.emojis) };
            } else {
                raw = { links: false, emojis: false };
            }
        } catch {
            raw = { links: false, emojis: false };
        }
        channelCache.set(channelId, raw);
    }

    return {
        channelId,
        guildId,
        links: Boolean(raw.links),
        emojis: Boolean(raw.emojis),
        linksActive: !raw.links,
        emojisActive: !raw.emojis
    };
}

/**
 * Set Channel Filter State (Links, Emojis, or All)
 * @param {string} channelId 
 * @param {string} guildId 
 * @param {'links'|'emojis'|'all'} filterType 
 * @param {boolean} shouldEnable - true = AutoMod active (blocking); false = AutoMod disabled (ignored/allowed)
 */
async function setChannelFilter(channelId, guildId, filterType, shouldEnable) {
    if (!channelId) throw new Error('channelId is required');

    const current = await getChannelSettings(channelId, guildId);

    // In DB schema: true = ignored / filter disabled; false = filter active / blocked
    let newLinks = current.links;
    let newEmojis = current.emojis;

    if (filterType === 'links' || filterType === 'all') {
        newLinks = !shouldEnable;
    }
    if (filterType === 'emojis' || filterType === 'all') {
        newEmojis = !shouldEnable;
    }

    // Update in-memory cache immediately
    channelCache.set(channelId, { links: newLinks, emojis: newEmojis });

    // Write atomically to MongoDB
    try {
        const updateData = {
            links: newLinks,
            emojis: newEmojis,
            updatedAt: new Date()
        };
        if (guildId) updateData.guildId = guildId;

        await AutomodChannel.findOneAndUpdate(
            { channelId },
            { $set: updateData },
            { upsert: true, new: true }
        );
    } catch (err) {
        console.error('❌ [AutoMod] Failed to persist channel filter:', err.message);
    }

    return {
        channelId,
        guildId,
        links: newLinks,
        emojis: newEmojis,
        linksActive: !newLinks,
        emojisActive: !newEmojis
    };
}

/**
 * Reset Channel AutoMod Overrides to Default Active Protection
 * @param {string} channelId 
 * @param {string} [guildId]
 */
async function resetChannelSettings(channelId, guildId = null) {
    if (!channelId) return null;
    channelCache.set(channelId, { links: false, emojis: false });
    try {
        await AutomodChannel.findOneAndDelete({ channelId });
    } catch (err) {
        console.error('❌ [AutoMod] Failed to reset channel settings:', err.message);
    }
    return {
        channelId,
        guildId,
        links: false,
        emojis: false,
        linksActive: true,
        emojisActive: true
    };
}

/**
 * List all channel overrides for a specific guild
 * @param {string} guildId 
 */
async function listGuildOverrides(guildId) {
    if (!guildId) return [];
    try {
        if (isDbConnected()) {
            const docs = await AutomodChannel.find({ guildId }).lean();
            return docs.filter(d => d.links === true || d.emojis === true);
        }
    } catch (err) {
        console.error('❌ [AutoMod] Error listing guild overrides:', err.message);
    }
    // Fallback: in-memory cache
    const overrides = [];
    for (const [cId, data] of channelCache.entries()) {
        if (data.links === true || data.emojis === true) {
            overrides.push({ channelId: cId, guildId, links: data.links, emojis: data.emojis });
        }
    }
    return overrides;
}

/**
 * Check if a member has permission to manage automod
 */
function canManageAutomod(member, user, guild) {
    if (!member || !user || !guild) return false;
    if (Array.isArray(config.BOT_OWNERS) && config.BOT_OWNERS.includes(user.id)) return true;
    if (guild.ownerId === user.id) return true;
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
    return false;
}

/**
 * Resolves an explicit channel from args or mentions if present.
 * Returns null if no explicit channel was passed (avoids default fallback to ctx.channel).
 */
function resolveExplicitChannel(ctx, args = []) {
    if (ctx.isSlash) {
        const ch = ctx.interaction?.options?.getChannel?.('channel');
        if (ch) return ch;
    }
    if (ctx.message?.mentions?.channels?.size > 0) {
        return ctx.message.mentions.channels.first();
    }
    if (Array.isArray(args)) {
        const reservedKeywords = new Set([
            'server', 'guild', 'global', 'entire', 'whole',
            'all', 'both', 'everything',
            'on', 'off', 'enable', 'disable', 'activate', 'deactivate', 'allowblock', 'ignore', 'true', 'false',
            'status', 'check', 'view', 'info',
            'list', 'channels', 'overrides', 'reset', 'clear', 'toggle',
            'links', 'link', 'url', 'urls',
            'emojis', 'emoji', 'emote', 'emotes',
            'channel', 'here', 'this'
        ]);

        for (const raw of args) {
            if (!raw) continue;
            const lower = raw.toLowerCase().trim();
            if (reservedKeywords.has(lower)) continue;

            const cleanId = raw.replace(/[<#>]/g, '').trim();
            if (/^\d{17,20}$/.test(cleanId)) {
                const fetched = ctx.guild?.channels?.cache?.get(cleanId);
                if (fetched) return fetched;
            }
            // Match by channel name
            const chByName = ctx.guild?.channels?.cache?.find(c => c.name.toLowerCase() === lower);
            if (chByName) return chByName;
        }
    }
    return null;
}

/**
 * Universal Target Channel Resolver (falls back to current channel)
 */
async function resolveChannel(ctx, args = []) {
    const explicit = resolveExplicitChannel(ctx, args);
    if (explicit) return explicit;
    return ctx.channel;
}

/**
 * Build Elegant Channel AutoMod Status Embed
 */
function buildChannelAutomodEmbed(guild, channel, settings, isGuildEnabled = true) {
    const isBothActive = settings.linksActive && settings.emojisActive;
    const isBothDisabled = !settings.linksActive && !settings.emojisActive;
    
    let color = '#2ECC71'; // Green
    if (isBothDisabled) color = '#E74C3C'; // Red
    else if (!isBothActive) color = '#F1C40F'; // Yellow

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`🛡️ Starry AutoMod • Channel Configuration`)
        .setDescription(`Channel: <#${channel.id}> (\`${channel.name || channel.id}\`)\nServer: **${guild.name}**`)
        .addFields(
            {
                name: '🔗 Link Protection',
                value: settings.linksActive 
                    ? '🟢 **ACTIVE (Blocking Links)**\n*Unauthorized external links & invites are deleted & timed out.*' 
                    : '🔴 **DISABLED (Links Allowed)**\n*Members can freely post links in this channel.*',
                inline: true
            },
            {
                name: '😀 Emoji Spam Filter',
                value: settings.emojisActive 
                    ? '🟢 **ACTIVE (Blocking 5+ Emojis)**\n*Spamming 5 or more emojis triggers auto-timeout.*' 
                    : '🔴 **DISABLED (Emojis Allowed)**\n*Members can post multiple emojis without restriction.*',
                inline: true
            },
            {
                name: '🌐 Server AutoMod Engine',
                value: isGuildEnabled 
                    ? '🟢 **Globally Active** across entire server' 
                    : '🔴 **DISABLED / SUSPENDED Server-Wide** *(Use `,automod server on` or button below to enable)*',
                inline: false
            }
        )
        .setFooter({ text: '💡 Use buttons below or type ,automod server on/off to manage server-wide.' })
        .setTimestamp();

    return embed;
}

/**
 * Build 1-Year Persistent Action Buttons for Channel AutoMod
 */
function createChannelAutomodButtons(channelId, settings, isGuildEnabled = true) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`am_toggle_links_${channelId}`)
            .setLabel(settings.linksActive ? '🔗 Links: Active' : '🔗 Links: Ignored')
            .setStyle(settings.linksActive ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`am_toggle_emojis_${channelId}`)
            .setLabel(settings.emojisActive ? '😀 Emojis: Active' : '😀 Emojis: Ignored')
            .setStyle(settings.emojisActive ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`am_refresh_${channelId}`)
            .setLabel('🔄 Refresh')
            .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`am_toggle_server_${channelId}`)
            .setLabel(isGuildEnabled ? '🌐 Server AutoMod: ON' : '🌐 Server AutoMod: OFF')
            .setStyle(isGuildEnabled ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`am_server_dashboard_${channelId}`)
            .setLabel('🛡️ Server Dashboard')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`am_list_overrides_${channelId}`)
            .setLabel('📋 Overrides')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`am_reset_channel_${channelId}`)
            .setLabel('⚙️ Reset Channel')
            .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2];
}

/**
 * Build Server-Wide AutoMod Dashboard Embed
 */
function buildServerAutomodEmbed(guild, isGuildEnabled = true, overrides = []) {
    const embed = new EmbedBuilder()
        .setColor(isGuildEnabled ? '#2ECC71' : '#ED4245')
        .setTitle(`🛡️ Starry AutoMod • Server Dashboard`)
        .setDescription(`Server: **${guild.name}** (\`${guild.id}\`)\nAutonomous Real-time Server Moderation & Spam Shield`)
        .addFields(
            {
                name: '🌐 Server AutoMod Engine',
                value: isGuildEnabled 
                    ? '🟢 **Globally Active**\n*All protective filters are actively shielding the entire server.*' 
                    : '🔴 **SUSPENDED / DISABLED**\n*Automated deletions and mutes are turned off server-wide.*',
                inline: false
            },
            {
                name: '🔗 Link Protection',
                value: 'Deletes unauthorized external invites & links.\n*Whitelisted media, GIFs, and staff exempt.*',
                inline: true
            },
            {
                name: '😀 Emoji Spam Protection',
                value: 'Auto-mutes users sending 5 or more emojis.\n*Staff & bot owners exempt.*',
                inline: true
            },
            {
                name: '📋 Channel Overrides',
                value: overrides.length > 0 
                    ? `\`${overrides.length}\` channel(s) customized with channel-specific rules.\n*(Click **View Overrides** below)*` 
                    : 'No channel overrides active. All channels use default protection.',
                inline: false
            }
        )
        .setFooter({ text: '💡 Use buttons below or type ,automod server on / off to toggle.' })
        .setTimestamp();

    return embed;
}

/**
 * Build Server-Wide Control Buttons
 */
function createServerAutomodButtons(channelId, isGuildEnabled = true) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`am_toggle_server_${channelId}`)
            .setLabel(isGuildEnabled ? '🌐 Turn Server AutoMod OFF' : '🌐 Turn Server AutoMod ON')
            .setStyle(isGuildEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`am_channel_config_${channelId}`)
            .setLabel('⚙️ Channel Config')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`am_list_overrides_${channelId}`)
            .setLabel('📋 View Overrides')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`am_refresh_${channelId}`)
            .setLabel('🔄 Refresh')
            .setStyle(ButtonStyle.Primary)
    );
    return [row];
}

module.exports = {
    guildCache,
    channelCache,
    initAutomodCaches,
    getGuildStatus,
    setGuildStatus,
    getChannelSettings,
    setChannelFilter,
    resetChannelSettings,
    listGuildOverrides,
    canManageAutomod,
    resolveExplicitChannel,
    resolveChannel,
    buildChannelAutomodEmbed,
    createChannelAutomodButtons,
    buildServerAutomodEmbed,
    createServerAutomodButtons
};
