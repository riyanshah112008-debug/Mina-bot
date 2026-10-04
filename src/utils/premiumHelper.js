// ==========================================
// 👑 STARRY PREMIUM VERIFICATION & FEATURE REGISTRY
// File Path: src/utils/premiumHelper.js
// Centralized Premium Guard • Feature Catalog • Aesthetic Notices
// ==========================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const config = require('../config');

const EPHEMERAL_FLAG = MessageFlags && MessageFlags.Ephemeral ? MessageFlags.Ephemeral : 64;

// High-speed RAM cache for ServerSettings premium status (5-minute TTL)
const serverSettingsPremiumCache = new Map();

// Complete Catalog of All Starry Premium Features
const ALL_PREMIUM_FEATURES = [
    {
        id: 'voice_247',
        name: '24/7 Voice Channel Persistence',
        category: 'Music & Audio',
        tier: 'Shield Plus / Pro Cluster / Lifetime',
        commands: [',247', '/247', ',stay', ',alwayson'],
        description: 'Keeps the bot in your voice channel 24/7 without disconnecting when members leave, ensuring zero-latency startup and uninterrupted radio.'
    },
    {
        id: 'audio_dsp_filters',
        name: 'Studio DSP Hi-Fi Audio Filters',
        category: 'Music & Audio',
        tier: 'Shield Plus / Pro Cluster / Lifetime',
        commands: [',bass', ',8d', ',nightcore', ',daycore', ',vaporwave', ',lofi', ',reverb', ',karaoke', ',surround', ',electronic', ',soft', ',radio', ',treble', ',pop', ',filter'],
        description: 'Access 15 studio-grade audio DSP effects: Physical Vibration Bass, 360° 8D Audio, Lo-Fi Chill, Slowed & Reverb, Karaoke Vocal Remover, 3D Surround, EDM/Club Master, Soft Chill, Retro Radio, Nightcore, Daycore, Vaporwave, Treble Boost, and Pop Clarity.'
    },
    {
        id: 'cloud_backups',
        name: 'Server Cloud Backup & Instant Restore',
        category: 'Server Security',
        tier: 'Shield Plus / Pro Cluster / Lifetime',
        commands: [',backup', ',restore <id>'],
        description: 'Create encrypted cloud snapshots of your entire server architecture (channels, categories, roles, permissions) with 1-click disaster recovery.'
    },
    {
        id: 'emergency_lockdown',
        name: 'Emergency Server Lockdown Shield',
        category: 'Server Security',
        tier: 'Shield Plus / Pro Cluster / Lifetime',
        commands: [',lockdown', ',unlockdown', ',masslock'],
        description: 'Instantaneous server-wide lockdown across all public text channels to neutralize raids and unauthorized permissions changes.'
    },
    {
        id: 'multibot_custom_nodes',
        name: 'Multi-Bot Worker Node Summoning',
        category: 'Multi-Bot Cluster',
        tier: 'Pro Cluster / Lifetime',
        commands: [',multibot add <token> <role>', ',multibot setrole'],
        description: 'Connect custom secondary bot tokens to your server cluster for simultaneous multi-channel audio playback and specialized worker task partitioning.'
    },
    {
        id: 'emoji_stealer',
        name: 'Bulk Emoji & Animated Sticker Stealer',
        category: 'Utility & Customization',
        tier: 'Shield Plus / Pro Cluster / Lifetime',
        commands: [',steal', ',emojisteal', '/steal'],
        description: 'Extract and upload emojis and animated stickers from other servers directly into your server in seconds.'
    },
    {
        id: 'flag_translator',
        name: 'Real-Time Flag Reaction Neural Translator',
        category: 'Utility & Localization',
        tier: 'Shield Plus / Pro Cluster / Lifetime',
        commands: ['Reaction with flag emojis (e.g. 🇪🇸, 🇯🇵, 🇫🇷)'],
        description: 'Instant multi-language translation cards triggered automatically when server members react to messages with country flag emojis.'
    },
    {
        id: 'web_captcha_gateway',
        name: 'Web Captcha Anti-Bot Verification Gateway',
        category: 'Server Security',
        tier: 'Shield Plus / Pro Cluster / Lifetime',
        commands: [',verify-setup', '/verify-setup'],
        description: 'High-security browser-based human verification portal that prevents raid bots and malicious alternate accounts from gaining member roles.'
    },
    {
        id: 'orbit_voice_boost',
        name: 'Dynamic Orbit Voice Room Custom Bitrate',
        category: 'Voice Management',
        tier: 'Shield Plus / Pro Cluster / Lifetime',
        commands: [',vc lock', ',vc bitrate', ',vc limit'],
        description: 'Join-to-create temporary voice channels with high-fidelity 384kbps audio bitrate, custom access control, and VIP voice lounges.'
    },
    {
        id: 'economy_multiplier',
        name: '2x Economy XP, Drop Rate & Loot Multiplier',
        category: 'Economy & Progression',
        tier: 'Shield Plus / Pro Cluster / Lifetime',
        commands: [',daily', ',fish', ',mine', ',work', 'Random Chest Drops'],
        description: 'Enjoy double credits, faster leveling XP, elevated rare/legendary loot chest spawn rates, and reduced gathering cooldowns.'
    },
    {
        id: 'moderation_appeals',
        name: 'Enhanced Moderation DM & Appeal Portal',
        category: 'Moderation',
        tier: 'Shield Plus / Pro Cluster / Lifetime',
        commands: ['Automated on kick, ban, timeout'],
        description: 'Detailed moderation infraction direct messages with official server branding, case IDs, and custom appeal website links.'
    },
    {
        id: 'vip_games',
        name: 'VIP Extended Truth or Dare Challenge Packs',
        category: 'Mini-Games',
        tier: 'Shield Plus / Pro Cluster / Lifetime',
        commands: [',truth', ',dare', '/truth', '/dare'],
        description: 'Access exclusive unfiltered truth questions and daring challenge decks for party gaming.'
    }
];

/**
 * Invalidate the ServerSettings premium RAM cache
 * @param {string|null} guildId 
 */
function invalidatePremiumCache(guildId = null) {
    if (guildId) {
        serverSettingsPremiumCache.delete(guildId);
    } else {
        serverSettingsPremiumCache.clear();
    }
}

/**
 * Checks whether a guild or user currently possesses active Starry Premium privileges.
 * @param {string} guildId
 * @param {string|null} userId
 * @param {import('discord.js').Client} client
 * @returns {Promise<boolean>}
 */
async function isServerOrUserPremium(guildId, userId = null, client = null) {
    // 1. Bot Owners always have full god-mode premium
    const BOT_OWNERS = config.BOT_OWNERS || ['1465049039153135639', '1257676837249617971'];
    if (process.env.OWNER_ID && !BOT_OWNERS.includes(process.env.OWNER_ID)) BOT_OWNERS.push(process.env.OWNER_ID);
    if (process.env.OWNER_IDS) {
        process.env.OWNER_IDS.split(',').map(s => s.trim()).forEach(id => {
            if (!BOT_OWNERS.includes(id)) BOT_OWNERS.push(id);
        });
    }
    if (userId && BOT_OWNERS.includes(userId)) return true;

    // 2. Primary Fast-Check via client.isPremium (checks high-speed RAM cache)
    if (client && typeof client.isPremium === 'function') {
        if (client.isPremium(guildId, userId)) return true;
    }

    const now = Date.now();

    // 3. Check ServerSettings database with RAM caching
    if (guildId) {
        const cached = serverSettingsPremiumCache.get(guildId);
        if (cached && now < cached.expires) {
            if (cached.isPremium) return true;
        } else {
            try {
                const ServerSettings = require('../models/ServerSettings');
                const settings = await ServerSettings.findOne({ guildId }).select('premium').lean();
                if (settings && settings.premium && settings.premium.isPremium) {
                    // Check if expired
                    if (!settings.premium.expiresAt || new Date(settings.premium.expiresAt).getTime() > now) {
                        serverSettingsPremiumCache.set(guildId, { isPremium: true, expires: now + 300000 });
                        if (client && typeof client.setPremiumCache === 'function') {
                            client.setPremiumCache(guildId, settings.premium.expiresAt ? new Date(settings.premium.expiresAt).getTime() : null);
                        }
                        return true;
                    }
                }
                serverSettingsPremiumCache.set(guildId, { isPremium: false, expires: now + 60000 });
            } catch (e) {
                // DB fallback
            }
        }
    }

    // 4. Fallback check on PremiumModel (PremiumGuilds) for either guild or user
    try {
        const mongoose = require('mongoose');
        const PremiumModel = mongoose.models.PremiumGuilds || mongoose.model('PremiumGuilds');
        if (PremiumModel) {
            const targets = [guildId, userId].filter(Boolean);
            if (targets.length > 0) {
                const activeRecord = await PremiumModel.findOne({
                    targetId: { $in: targets },
                    isPremium: true,
                    $or: [
                        { expiresAt: null },
                        { expiresAt: { $gt: new Date() } }
                    ]
                }).lean();

                if (activeRecord) {
                    const expMs = activeRecord.expiresAt ? new Date(activeRecord.expiresAt).getTime() : null;
                    if (client && typeof client.setPremiumCache === 'function') {
                        client.setPremiumCache(activeRecord.targetId, expMs);
                    }
                    if (guildId && activeRecord.targetId === guildId) {
                        serverSettingsPremiumCache.set(guildId, { isPremium: true, expires: now + 300000 });
                    }
                    return true;
                }
            }
        }
    } catch (dbErr) {}

    return false;
}

/**
 * Constructs the aesthetic, professional Starry Premium Required embed.
 * @param {string} featureName Name of the locked feature
 * @param {string} prefix Server prefix
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function createPremiumLockPayload(featureName, prefix = ',') {
    const embed = new EmbedBuilder()
        .setColor('#F59E0B') // Premium Gold
        .setAuthor({ 
            name: 'Starry Premium Exclusive Feature', 
            iconURL: 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96' 
        })
        .setTitle(`👑 Starry Premium Required`)
        .setDescription(
            `**${featureName}** is an exclusive **Starry Premium** feature!\n\n` +
            `This server currently does not have an active Premium subscription. Upgrading unlocks high-performance audio, disaster-recovery backups, god-mode security, and multi-bot cluster power across your entire community.`
        )
        .addFields(
            {
                name: '💎 Premium Benefits Include:',
                value: 
                    '• **📻 24/7 Voice Channel Mode** — Bot stays in voice permanently\n' +
                    '• **🎧 Studio DSP Hi-Fi Audio Filters** — Bassboost, 8D, Nightcore, Vaporwave\n' +
                    '• **💾 Cloud Backups & Restore** — Full server layout & permissions snapshot\n' +
                    '• **🚨 Emergency Lockdown Shield** — 1-click server-wide raid isolation\n' +
                    '• **🤖 Multi-Bot Worker Nodes** — Custom bot tokens for multi-room audio\n' +
                    '• **📥 Unlimited Emoji/Sticker Steal** — Direct 1-click upload\n' +
                    '• **💰 2x Economy XP & Loot** — Double credits, rare drops & faster leveling',
                inline: false
            },
            {
                name: '⚡ How to Unlock:',
                value: 
                    `• Run \`${prefix}premium\` to view full pricing and plan details.\n` +
                    `• Already have a key? Use \`${prefix}redeem <license_key>\` to activate instantly.\n` +
                    `• Contact bot owners to activate Premium for your server.`,
                inline: false
            }
        )
        .setFooter({ text: 'Starry Premium Infrastructure • Instant Activation' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('premium_view_perks_btn')
            .setLabel('View Premium Perks')
            .setStyle(ButtonStyle.Success)
            .setEmoji('👑'),
        new ButtonBuilder()
            .setLabel('Dashboard & Web Center')
            .setStyle(ButtonStyle.Link)
            .setURL('https://starry-bot.loca.lt')
            .setEmoji('🌐')
    );

    return { embeds: [embed], components: [row] };
}

/**
 * Constructs the detailed perks breakdown embed for all 12 premium features.
 * @param {string} prefix Server prefix
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function createPremiumPerksPayload(prefix = ',') {
    const embed = new EmbedBuilder()
        .setColor('#F59E0B')
        .setAuthor({ 
            name: 'Starry Premium • Elite Tier Catalog', 
            iconURL: 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96' 
        })
        .setTitle('👑 All Starry Premium Features & Perks')
        .setDescription(
            `Unlock maximum performance, continuous 24/7 audio, server backup vaults, and autonomous worker node clustering for your server.\n\n` +
            `To activate, run \`${prefix}redeem <license_key>\` or contact our bot developers.`
        );

    const categories = {};
    for (const f of ALL_PREMIUM_FEATURES) {
        if (!categories[f.category]) categories[f.category] = [];
        categories[f.category].push(f);
    }

    for (const [category, features] of Object.entries(categories)) {
        const value = features.map(f => `• **${f.name}**\n  ↳ \`${f.commands.join('`, `')}\`\n  ↳ *${f.description}*`).join('\n');
        embed.addFields({ name: `💎 ${category}`, value: value.slice(0, 1024), inline: false });
    }

    embed.setFooter({ text: 'Starry Premium • Infinite Possibilities' }).setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Dashboard & Web Center')
            .setStyle(ButtonStyle.Link)
            .setURL('https://starry-bot.loca.lt')
            .setEmoji('🌐')
    );

    return { embeds: [embed], components: [row] };
}

/**
 * Guard function to easily protect any command or feature.
 * Automatically replies with the premium notice if check fails.
 * @param {import('../utils/contextHelper').CommandContext|any} ctx
 * @param {string} featureName
 * @returns {Promise<boolean>} True if permitted, false if blocked
 */
async function requirePremium(ctx, featureName) {
    const guildId = ctx.guild?.id || ctx.guildId;
    const userId = ctx.user?.id || ctx.author?.id;
    const client = ctx.client;

    const isPermitted = await isServerOrUserPremium(guildId, userId, client);
    if (isPermitted) return true;

    const prefix = ctx.prefix || ',';
    const payload = createPremiumLockPayload(featureName, prefix);

    if (ctx.isSlash || ctx.interaction) {
        const replyFunc = ctx.interaction.deferred || ctx.interaction.replied ? ctx.interaction.followUp : ctx.interaction.reply;
        await replyFunc.call(ctx.interaction, { ...payload, flags: [EPHEMERAL_FLAG] }).catch(() => {});
    } else if (typeof ctx.reply === 'function') {
        await ctx.reply(payload).catch(() => {});
    }

    return false;
}

module.exports = {
    ALL_PREMIUM_FEATURES,
    isServerOrUserPremium,
    invalidatePremiumCache,
    createPremiumLockPayload,
    createPremiumPerksPayload,
    requirePremium
};
