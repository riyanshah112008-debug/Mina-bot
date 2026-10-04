// ==========================================
// 🎁 SUPREME DISCORD NITRO CLAIM & GIVEAWAY DETECTOR
// File Path: src/modules/nitroClaimDetector.js
// Real-Time Discord Nitro Link Sniffing • Instant Claim Detection • Speed Metrics & Persistence
// ==========================================
const { EmbedBuilder, Events, PermissionFlagsBits, MessageFlags } = require('discord.js');
const fetch = require('node-fetch');
const NitroClaim = require('../models/NitroClaim');
const config = require('../config');

const NITRO_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gift|discord\.com\/gifts|discordapp\.com\/gifts)\/([a-zA-Z0-9]{16,24})/gi;

const activeNitroGifts = new Map(); // code -> { messageId, channelId, guildId, senderId, senderTag, detectedAt, giftType, claimed, claimerId, claimerTag }
const processedCodes = new Set();

function formatSpeed(ms) {
    if (ms < 1000) return `${ms}ms (⚡ Godspeed)`;
    const s = (ms / 1000).toFixed(2);
    if (ms < 3000) return `${s}s (🚀 Lightning Fast)`;
    if (ms < 10000) return `${s}s (🏎️ Very Fast)`;
    return `${s}s (🐢 Slow)`;
}

async function fetchGiftInfo(code) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`https://discord.com/api/v10/entitlements/gift-codes/${code}?with_application=false&with_user=true`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
            const data = await res.json();
            let giftType = 'Discord Nitro';
            if (data.subscription_plan) {
                const name = data.subscription_plan.name || '';
                if (name.toLowerCase().includes('basic')) giftType = 'Discord Nitro Basic ($2.99)';
                else if (name.toLowerCase().includes('classic')) giftType = 'Discord Nitro Classic ($4.99)';
                else giftType = 'Discord Nitro Boost ($9.99)';
            }
            return {
                valid: true,
                redeemed: !!(data.redeemed || (data.uses && data.uses >= data.max_uses)),
                giftType,
                user: data.user || null,
                raw: data
            };
        } else if (res.status === 404) {
            return { valid: false, redeemed: true, giftType: 'Discord Nitro (Claimed/Expired)' };
        }
    } catch (e) {}
    return { valid: false, redeemed: false, giftType: 'Discord Nitro' };
}

async function announceNitroClaim(channel, giftData, claimer, speedMs) {
    const embed = new EmbedBuilder()
        .setColor('#F47FFF') // Discord Nitro Signature Pink/Purple
        .setAuthor({ 
            name: '✨ DISCORD NITRO CLAIM DETECTED ✨', 
            iconURL: 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96' 
        })
        .setTitle(`🎉 Nitro Gift Claimed in #${channel.name}!`)
        .setDescription(
            `A Discord Nitro gift link dropped in chat has just been claimed!\n\n` +
            `🎁 **Gift Type:** \`${giftData.giftType || 'Discord Nitro'}\`\n` +
            `👤 **Claimed By:** ${claimer ? `<@${claimer.id}> (\`${claimer.tag || claimer.username}\`)` : '`Unknown Member / Direct Claim`'}\n` +
            `📤 **Dropped By:** <@${giftData.senderId}> (\`${giftData.senderTag}\`)\n` +
            `⚡ **Claim Speed:** \`${formatSpeed(speedMs)}\`\n` +
            `🔗 **Code:** \`discord.gift/${giftData.code.substring(0, 4)}••••••••\`\n` +
            `💬 **Channel:** <#${channel.id}>`
        )
        .setThumbnail(claimer ? (claimer.displayAvatarURL ? claimer.displayAvatarURL({ dynamic: true }) : 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96') : 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96')
        .setFooter({ text: 'Supreme Nitro & Giveaway Claim Tracker Engine • Prefix: ,' })
        .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});

    // Save to Database
    try {
        await NitroClaim.create({
            guildId: channel.guild.id,
            channelId: channel.id,
            messageId: giftData.messageId,
            code: giftData.code,
            giftType: giftData.giftType,
            senderId: giftData.senderId,
            senderTag: giftData.senderTag,
            claimerId: claimer ? claimer.id : 'Unknown',
            claimerTag: claimer ? (claimer.tag || claimer.username) : 'Unknown',
            claimedAt: new Date(),
            speedMs: speedMs,
            status: 'claimed'
        });
    } catch (dbErr) {
        console.warn('⚠️ NitroClaim DB Save Warning:', dbErr.message);
    }
}

module.exports = (client) => {
    console.log('🎁 [Nitro Claim Detector] Initializing Discord Nitro & Giveaway Sniffer Engine...');

    // 1. Sniff incoming messages for Nitro gift links
    client.on(Events.MessageCreate, async (message) => {
        if (!message.guild || message.author.bot) return;

        const content = message.content || '';
        const matches = [...content.matchAll(NITRO_REGEX)];
        if (!matches || matches.length === 0) return;

        for (const match of matches) {
            const code = match[1];
            if (!code || processedCodes.has(code)) continue;

            const detectedAt = Date.now();
            const giftData = {
                code,
                messageId: message.id,
                channelId: message.channel.id,
                guildId: message.guild.id,
                senderId: message.author.id,
                senderTag: message.author.tag || message.author.username,
                detectedAt,
                giftType: 'Discord Nitro',
                claimed: false
            };

            activeNitroGifts.set(code, giftData);
            processedCodes.add(code);

            // Fetch initial info in background
            fetchGiftInfo(code).then(info => {
                if (info && info.giftType) giftData.giftType = info.giftType;
            });

            // Fast Polling Watcher (Checks every 400ms for 30s to catch sub-second claims)
            let checks = 0;
            const watcherInterval = setInterval(async () => {
                checks++;
                if (checks > 75 || giftData.claimed) {
                    clearInterval(watcherInterval);
                    return;
                }

                const currentInfo = await fetchGiftInfo(code);
                if (currentInfo && currentInfo.redeemed && !giftData.claimed) {
                    giftData.claimed = true;
                    clearInterval(watcherInterval);

                    const speedMs = Date.now() - detectedAt;
                    let claimer = currentInfo.user || null;

                    // If API doesn't return user, check latest message edits / author
                    if (!claimer) {
                        try {
                            const freshMsg = await message.channel.messages.fetch(message.id).catch(() => null);
                            if (freshMsg) {
                                // Check embed contents for claimer mention
                                const embedText = JSON.stringify(freshMsg.embeds || []);
                                const userMatch = embedText.match(/(\d{17,20})/);
                                if (userMatch && userMatch[1] && userMatch[1] !== message.author.id) {
                                    claimer = await client.users.fetch(userMatch[1]).catch(() => null);
                                }
                            }
                        } catch (e) {}
                    }

                    await announceNitroClaim(message.channel, giftData, claimer, speedMs);
                }
            }, 400);
        }
    });

    // 2. Sniff message updates (When Discord updates the gift embed to "Claimed")
    client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
        if (!newMessage.guild) return;

        const content = (newMessage.content || '') + ' ' + (oldMessage?.content || '');
        const matches = [...content.matchAll(NITRO_REGEX)];
        if (!matches || matches.length === 0) return;

        for (const match of matches) {
            const code = match[1];
            const giftData = activeNitroGifts.get(code);
            if (!giftData || giftData.claimed) continue;

            const info = await fetchGiftInfo(code);
            if (info && info.redeemed) {
                giftData.claimed = true;
                const speedMs = Date.now() - giftData.detectedAt;
                const claimer = info.user || null;
                await announceNitroClaim(newMessage.channel, giftData, claimer, speedMs);
            }
        }
    });

    console.log('✅ Nitro Claim & Giveaway Sniffing Engine Armed and Listening!');
};

module.exports.getRecentClaims = async (guildId, limit = 10) => {
    try {
        return await NitroClaim.find({ guildId }).sort({ claimedAt: -1 }).limit(limit).lean();
    } catch (e) {
        return [];
    }
};

module.exports.getStats = async (guildId) => {
    try {
        const total = await NitroClaim.countDocuments({ guildId });
        const fastest = await NitroClaim.find({ guildId, speedMs: { $gt: 0 } }).sort({ speedMs: 1 }).limit(1).lean();
        return { total, fastest: fastest[0] || null };
    } catch (e) {
        return { total: 0, fastest: null };
    }
};
