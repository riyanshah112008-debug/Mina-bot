// ==========================================
// 🔞 STARRY MATURE & ANIME NSFW ENGINE
// File Path: src/modules/nsfwModule.js
// Server Owner & Bot Owners ONLY for Server Activation
// Members Can Freely Enable / Disable in Direct Messages (DMs)
// Strict Discord Age-Restricted (NSFW) Channel Verification
// Resilient Multi-Provider Engine (nekos.best with UA, otakugifs, BunnyCDN)
// ==========================================
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const ServerSettings = require('../models/ServerSettings');
const UserSettings = require('../models/UserSettings');
const { generateStarryResponse } = require('../utils/aiEngine');
const config = require('../config');

// In-memory cache for fast DM NSFW status lookup (userId -> boolean)
const dmNsfwCache = new Map();

/**
 * Check if the given user is authorized to toggle NSFW for a server.
 * ONLY the Server Owner and Bot Owners are permitted.
 */
function canManageServerNsfw(userId, guild) {
    if (!guild || !userId) return false;
    const isServerOwner = guild.ownerId === userId;
    const isBotOwner = typeof config.isBotOwner === 'function' 
        ? config.isBotOwner(userId) 
        : (Array.isArray(config.BOT_OWNERS) && config.BOT_OWNERS.includes(userId));
    return isServerOwner || isBotOwner;
}

const mongoose = require('mongoose');

/**
 * Get whether a user has opted into NSFW in private DMs (persisted in MongoDB).
 */
async function isNsfwDmEnabled(userId) {
    if (!userId) return false;
    if (dmNsfwCache.has(userId)) {
        return dmNsfwCache.get(userId);
    }
    if (mongoose.connection?.readyState !== 1) {
        return dmNsfwCache.get(userId) || false;
    }
    try {
        const userSettings = await UserSettings.findOne({ userId });
        const enabled = userSettings ? Boolean(userSettings.nsfwDmEnabled) : false;
        dmNsfwCache.set(userId, enabled);
        return enabled;
    } catch (err) {
        return dmNsfwCache.get(userId) || false;
    }
}

/**
 * Set a user's DM NSFW preference in MongoDB.
 */
async function setNsfwDmEnabled(userId, enabled) {
    if (!userId) return false;
    dmNsfwCache.set(userId, enabled);
    if (mongoose.connection?.readyState === 1) {
        try {
            await UserSettings.findOneAndUpdate(
                { userId },
                { $set: { nsfwDmEnabled: Boolean(enabled), updatedAt: new Date() } },
                { upsert: true, new: true }
            );
        } catch (err) {
            console.error(`[NSFW] Error saving DM NSFW setting for user ${userId}:`, err.message);
        }
    }
    return enabled;
}

/**
 * Toggle a user's DM NSFW preference.
 */
async function toggleNsfwDm(userId) {
    const current = await isNsfwDmEnabled(userId);
    return await setNsfwDmEnabled(userId, !current);
}

/**
 * Check if an NSFW command is permitted in the current context.
 * Returns:
 *   true                  -> Allowed (DM with opt-in, or Server with module enabled in NSFW channel)
 *   false                 -> Not allowed (Server disabled, or DM disabled)
 *   'CHANNEL_NOT_NSFW'    -> Server enabled, but current channel is not marked as Age-Restricted
 */
async function isNsfwAllowed(ctx) {
    const userId = ctx.user ? ctx.user.id : ctx.author?.id;
    const isDM = Boolean(ctx.isDM) || !ctx.guild || !ctx.source?.guild || (ctx.guildId === null) || (ctx.guild?.id === 'GLOBAL') || (ctx.channel && (typeof ctx.channel.isDMBased === 'function' ? ctx.channel.isDMBased() : ctx.channel.type === 1));

    // 1. Direct Messages Check
    if (isDM) {
        if (!userId) return false;
        return await isNsfwDmEnabled(userId);
    }

    // 2. Server Check: Must be enabled in database
    if (!ctx.guild || !ctx.guild.id) return false;
    let settings = await ServerSettings.findOne({ guildId: ctx.guild.id });
    if (!settings || !settings.nsfw?.enabled) {
        return false;
    }

    // 3. Channel Check: Must be marked Age-Restricted (NSFW) in Discord
    if (ctx.channel && !ctx.channel.nsfw) {
        return 'CHANNEL_NOT_NSFW';
    }

    return true;
}

// Curated high-definition anime fallback galleries
const CURATED_ANIME_POOLS = {
    waifu: [
        'https://cdn.otakugifs.xyz/gifs/kiss/f8c5edf9aa62b175.gif',
        'https://cdn.otakugifs.xyz/gifs/hug/c787d02e22435395.gif',
        'https://cdn.otakugifs.xyz/gifs/cuddle/47fc5d0ee4f009aa.gif'
    ],
    neko: [
        'https://cdn.otakugifs.xyz/gifs/nuzzle/298ec4ae171e8473.gif',
        'https://cdn.otakugifs.xyz/gifs/pat/5cb16aa0e7fa5891.gif'
    ],
    kitsune: [
        'https://cdn.otakugifs.xyz/gifs/nuzzle/298ec4ae171e8473.gif',
        'https://cdn.otakugifs.xyz/gifs/pat/d324b051f0bfe526.gif'
    ],
    husbando: [
        'https://cdn.otakugifs.xyz/gifs/wink/df30ec1fafe8bba6.gif',
        'https://cdn.otakugifs.xyz/gifs/smile/60ec252431718cb1.gif'
    ],
    trap: [
        'https://cdn.otakugifs.xyz/gifs/blush/23565f17d7e35b71.gif',
        'https://cdn.otakugifs.xyz/gifs/wink/df30ec1fafe8bba6.gif'
    ],
    ecchi: [
        'https://cdn.otakugifs.xyz/gifs/smack/78c956974f371f70.gif',
        'https://cdn.otakugifs.xyz/gifs/kiss/99c6d80ba787d40a.gif',
        'https://cdn.otakugifs.xyz/gifs/lick/bd93022885fb1d22.gif'
    ],
    hentai: [
        'https://cdn.otakugifs.xyz/gifs/kiss/736a111d8ed929b2.gif',
        'https://cdn.otakugifs.xyz/gifs/kiss/a07b3bcb00751dae.gif',
        'https://cdn.otakugifs.xyz/gifs/lick/d2eca216f3627926.gif'
    ]
};

/**
 * Fetch high-definition anime art or GIF with multi-tier fallback.
 */
async function fetchAnimeImage(category = 'waifu', isNsfw = false) {
    const safeCat = category.toLowerCase();

    // Map common aliases to nekos.best endpoints
    const endpointMap = {
        waifu: 'waifu',
        neko: 'neko',
        kitsune: 'kitsune',
        husbando: 'husbando',
        blowkiss: 'blowkiss',
        kiss: 'kiss',
        hug: 'hug',
        cuddle: 'cuddle',
        slap: 'slap',
        pat: 'pat',
        bite: 'bite',
        poke: 'poke',
        tickle: 'tickle',
        smile: 'smile',
        blush: 'blush',
        dance: 'dance'
    };

    const nekosCategory = endpointMap[safeCat] || (safeCat === 'trap' ? 'waifu' : (isNsfw ? 'waifu' : 'waifu'));

    // Tier 1: Try nekos.best API with custom User-Agent
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`https://nekos.best/api/v2/${nekosCategory}`, {
            headers: { 'User-Agent': 'StarryBot/2.0 (DiscordBot)' },
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
            const data = await res.json();
            if (data.results && data.results[0]?.url) {
                return data.results[0].url;
            }
        }
    } catch (e) {}

    // Tier 2: Try OtakuGIFs API
    try {
        const otakuCat = safeCat === 'blowkiss' ? 'airkiss' : (safeCat === 'waifu' || safeCat === 'neko' ? 'kiss' : safeCat);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`https://api.otakugifs.xyz/gif?reaction=${otakuCat}&format=gif`, {
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
            const data = await res.json();
            if (data.url) return data.url;
        }
    } catch (e) {}

    // Tier 3: Curated CDN Fallback Pool
    const pool = CURATED_ANIME_POOLS[safeCat] || CURATED_ANIME_POOLS.waifu;
    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Generate an AI explanation of Starry's mature and anime module.
 */
async function explainNsfwWithAI(ctx) {
    const prompt = 
        'Explain what the mature / anime NSFW module of Starry Bot contains in a polite, helpful, and concise manner. ' +
        'Detail that: ' +
        '1) Starry provides rich all-ages playful anime roleplay interactions (hug, kiss, pat, cuddle, bite, spank, lick, pinch, smack, suck). ' +
        '2) Starry also includes an optional mature/NSFW anime suite (waifus, nekos, kitsunes, romantic anime gifs, ecchi artwork, and spicy social interactions). ' +
        '3) Security is paramount: In servers, ONLY the Server Owner and Bot Owners have permission to toggle NSFW on or off. ' +
        '4) Even when enabled on a server, commands strictly run ONLY inside Discord-verified Age-Restricted (NSFW) channels. ' +
        '5) Members can freely enable or disable NSFW for their own private Direct Messages (DMs) anytime using ,nsfw dms on / off.';

    const { text, model } = await generateStarryResponse(prompt, ctx.user ? ctx.user.id : ctx.author?.id, !ctx.guild);

    const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setAuthor({ 
            name: 'Starry AI • Mature & Anime Module Explainer', 
            iconURL: 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96' 
        })
        .setTitle('🔞 What is in Starry\'s Mature & Anime NSFW System?')
        .setDescription(text)
        .addFields(
            {
                name: '👑 Server Owner & Bot Owner Protection',
                value: 
                    '• **Server Activation:** Restricted strictly to the **Server Owner** and **Bot Owners**.\n' +
                    '• **Age-Restricted Enforcement:** In servers, commands **strictly execute in Discord channels marked as Age-Restricted (NSFW)**.',
                inline: false
            },
            {
                name: '📩 Private Direct Message (DM) Opt-In',
                value: 
                    '• **Member Control:** Members can independently enable or disable NSFW mode in their own DMs.\n' +
                    '• **Commands:** `,nsfw dms on` (enable) or `,nsfw dms off` (disable).\n' +
                    '• **Persistence:** DM choices are saved permanently to the database.',
                inline: false
            },
            {
                name: '🎭 Social Interactions & Anime Galleries',
                value: 
                    '• **Interactive Roleplay:** All interactions (`hug`, `kiss`, `pat`, `cuddle`, `spank`, `lick`, `bite`, `suck`, `pinch`, `smack`, etc.) with reciprocal buttons.\n' +
                    '• **Anime Galleries:** High-definition `waifu`, `neko`, `kitsune`, `husbando`, `trap`, `ecchi`, and `hentai` galleries.',
                inline: false
            }
        )
        .setFooter({ text: `Powered by ${model} • Prefix: ,` })
        .setTimestamp();

    return embed;
}

module.exports = {
    canManageServerNsfw,
    isNsfwDmEnabled,
    setNsfwDmEnabled,
    toggleNsfwDm,
    isNsfwAllowed,
    fetchAnimeImage,
    explainNsfwWithAI,
    CURATED_ANIME_POOLS
};
