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
const { AutomodGuild, AutomodChannel } = require('../models/AutomodSchema');

// Fast In-Memory Caches for Zero-Latency Message Filtering
const guildCache = new Map();
const channelCache = new Map();

/**
 * Initialize DB Caches into Memory
 */
async function initAutomodCaches() {
    try {
        if (!mongoose.connection || mongoose.connection.readyState !== 1) {
            return;
        }
        const gSettings = await AutomodGuild.find().lean();
        gSettings.forEach(s => guildCache.set(s.guildId, s.enabled));

        const cSettings = await AutomodChannel.find().lean();
        cSettings.forEach(s => channelCache.set(s.channelId, { links: s.links, emojis: s.emojis }));

        console.log(`✅ [AutoMod] Synchronized ${guildCache.size} guild rules & ${channelCache.size} channel rules into memory.`);
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
    return guildCache.has(guildId) ? guildCache.get(guildId) : true;
}

/**
 * Set Server-Wide AutoMod Status
 * @param {string} guildId
 * @param {boolean} enabled
 */
async function setGuildStatus(guildId, enabled) {
    if (!guildId) return false;
    guildCache.set(guildId, enabled);
    try {
        await AutomodGuild.findOneAndUpdate(
            { guildId },
            { enabled },
            { upsert: true, new: true }
        );
    } catch (err) {
        console.error('❌ [AutoMod] Error saving guild status:', err.message);
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
        const docs = await AutomodChannel.find({ guildId }).lean();
        return docs.filter(d => d.links === true || d.emojis === true);
    } catch (err) {
        console.error('❌ [AutoMod] Error listing guild overrides:', err.message);
        return [];
    }
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
 * Universal Target Channel Resolver
 */
async function resolveChannel(ctx, args = []) {
    if (ctx.isSlash) {
        const ch = ctx.interaction.options.getChannel('channel');
        if (ch) return ch;
    }
    if (ctx.message?.mentions?.channels?.size > 0) {
        return ctx.message.mentions.channels.first();
    }
    if (Array.isArray(args)) {
        for (const raw of args) {
            if (!raw) continue;
            const cleanId = raw.replace(/[<#>]/g, '').trim();
            if (/^\d{17,20}$/.test(cleanId)) {
                const fetched = ctx.guild.channels.cache.get(cleanId) || await ctx.guild.channels.fetch(cleanId).catch(() => null);
                if (fetched) return fetched;
            }
            // Match by channel name
            const chByName = ctx.guild.channels.cache.find(c => c.name.toLowerCase() === raw.toLowerCase());
            if (chByName) return chByName;
        }
    }
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
                    : '🔴 **Suspended** *(Use `,automod toggle enable` to activate)*',
                inline: false
            }
        )
        .setFooter({ text: '💡 Click the interactive buttons below to toggle channel filters in real-time.' })
        .setTimestamp();

    return embed;
}

/**
 * Build 1-Year Persistent Action Buttons for Channel AutoMod
 */
function createChannelAutomodButtons(channelId, settings) {
    const row = new ActionRowBuilder().addComponents(
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
    return row;
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
    resolveChannel,
    buildChannelAutomodEmbed,
    createChannelAutomodButtons
};
