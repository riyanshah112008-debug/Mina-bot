// ==========================================
// ⏰ STARRY CELESTIAL REMINDER ENGINE
// File Path: src/modules/reminderEngine.js
// Autonomous MongoDB Scheduler • Channel & DM Notifications
// ==========================================
const { EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const Reminder = require('../models/Reminder');
const config = require('../config');

let reminderInterval = null;

function parseDuration(input) {
    if (!input || typeof input !== 'string') return null;
    const str = input.toLowerCase().trim();

    // Regex for combinations like 1d12h30m or single units like 10m, 2h, 1d, 30s
    const regex = /(?:(\d+)\s*d)?\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/;
    const matches = str.match(regex);

    if (!matches) return null;

    const days = parseInt(matches[1] || '0', 10);
    const hours = parseInt(matches[2] || '0', 10);
    const minutes = parseInt(matches[3] || '0', 10);
    const seconds = parseInt(matches[4] || '0', 10);

    const totalMs = (days * 86400 + hours * 3600 + minutes * 60 + seconds) * 1000;
    return totalMs > 0 ? totalMs : null;
}

function formatTimeRemaining(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(' ');
}

async function createReminder(userId, guildId, channelId, durationMs, message, isDM = false) {
    const remindAt = new Date(Date.now() + durationMs);
    const reminder = await Reminder.create({
        userId,
        guildId: isDM ? null : guildId,
        channelId,
        remindAt,
        message,
        isDM,
        completed: false
    });
    return reminder;
}

async function checkDueReminders(client) {
    if (!client || !client.isReady()) return;
    if (mongoose.connection.readyState !== 1) return;

    try {
        const now = new Date();
        const due = await Reminder.find({
            remindAt: { $lte: now },
            completed: false
        }).limit(25);

        for (const rem of due) {
            rem.completed = true;
            await rem.save().catch(() => {});

            try {
                const user = await client.users.fetch(rem.userId).catch(() => null);
                if (!user) continue;

                const embed = new EmbedBuilder()
                    .setColor(config.EMBED_COLORS.PRIMARY)
                    .setAuthor({ name: '⏰ Starlight Reminder Alert', iconURL: client.user.displayAvatarURL({ dynamic: true }) })
                    .setTitle('🔔 A Reminder You Set Has Arrived!')
                    .setDescription(`>>> **${rem.message}**`)
                    .addFields(
                        { name: '📅 Set At', value: `<t:${Math.floor(rem.createdAt.getTime() / 1000)}:R>`, inline: true },
                        { name: '✨ Target User', value: `<@${rem.userId}>`, inline: true }
                    )
                    .setFooter({ text: 'Starry Cosmic Reminders • Prefix: ,' })
                    .setTimestamp();

                let sent = false;
                if (!rem.isDM && rem.channelId) {
                    const channel = await client.channels.fetch(rem.channelId).catch(() => null);
                    if (channel && typeof channel.send === 'function') {
                        await channel.send({
                            content: `🔔 <@${rem.userId}>, here is your celestial reminder!`,
                            embeds: [embed]
                        }).catch(() => {});
                        sent = true;
                    }
                }

                if (!sent) {
                    await user.send({
                        content: `🔔 Here is your celestial reminder!`,
                        embeds: [embed]
                    }).catch(() => {});
                }
            } catch (err) {
                console.error(`[Reminder] Failed delivering reminder ${rem._id}:`, err.message);
            }
        }
    } catch (err) {
        // Silently catch transient check errors
    }
}

function initReminderWorker(client) {
    if (reminderInterval) clearInterval(reminderInterval);
    // Check every 10 seconds
    reminderInterval = setInterval(() => checkDueReminders(client), 10000);
    checkDueReminders(client);
    console.log('⏰ [Reminder Engine] Autonomous Starlight Reminder Scheduler Armed.');
}

module.exports = {
    initReminderWorker,
    createReminder,
    parseDuration,
    formatTimeRemaining
};
