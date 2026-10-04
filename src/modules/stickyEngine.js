// ==========================================
// 📌 STARRY STICKY MESSAGE ENGINE
// File Path: src/modules/stickyEngine.js
// Debounced Automatic Bottom-Pinned Channel Notice Dispatcher
// ==========================================
const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const StickyMessage = require('../models/StickyMessage');
const config = require('../config');

// In-memory cache for fast lookup and debounce
const stickyCache = new Map();
const channelTimers = new Map();

async function handleStickyMessage(message, client) {
    if (!message.guild || message.author.bot) return;
    const channelId = message.channel.id;

    let sticky = stickyCache.get(channelId);
    if (sticky === undefined) {
        try {
            sticky = await StickyMessage.findOne({ channelId });
            stickyCache.set(channelId, sticky || null);
        } catch (e) {
            return;
        }
    }
    if (!sticky) return;

    // If message is the sticky message itself, ignore
    if (sticky.lastMessageId === message.id) return;

    // Debounce to prevent rate limit when chat is rapid
    if (channelTimers.has(channelId)) return;

    const timer = setTimeout(async () => {
        channelTimers.delete(channelId);
        try {
            const currentSticky = stickyCache.get(channelId) || await StickyMessage.findOne({ channelId });
            if (!currentSticky) return;

            // Delete old sticky message if it exists
            if (currentSticky.lastMessageId) {
                try {
                    const oldMsg = await message.channel.messages.fetch(currentSticky.lastMessageId).catch(() => null);
                    if (oldMsg && typeof oldMsg.delete === 'function') {
                        await oldMsg.delete().catch(() => {});
                    }
                } catch (e) {}
            }

            // Post new sticky embed
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ name: '📌 Pinned Channel Notice', iconURL: client.user.displayAvatarURL({ dynamic: true }) })
                .setDescription(currentSticky.content)
                .setFooter({ text: 'Sticky Message • Starry Management' })
                .setTimestamp();

            const newMsg = await message.channel.send({ embeds: [embed] }).catch(() => null);
            if (newMsg) {
                currentSticky.lastMessageId = newMsg.id;
                await StickyMessage.updateOne({ channelId }, { lastMessageId: newMsg.id }).catch(() => {});
                stickyCache.set(channelId, currentSticky);
            }
        } catch (err) {}
    }, 2500);

    channelTimers.set(channelId, timer);
}

function initSticky(client) {
    client.on(Events.MessageCreate, (msg) => handleStickyMessage(msg, client));
    console.log('📌 [Sticky Engine] Pinned Channel Notice Handler Armed.');
}

function setCachedSticky(channelId, doc) {
    stickyCache.set(channelId, doc);
}

function deleteCachedSticky(channelId) {
    stickyCache.delete(channelId);
}

module.exports = {
    initSticky,
    setCachedSticky,
    deleteCachedSticky
};
