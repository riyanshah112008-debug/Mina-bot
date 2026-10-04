const { EmbedBuilder, PermissionsBitField } = require('discord.js');

// Track messages for spam detection
const userMessageLog = new Map();

// Add any inappropriate words you want to block here (lowercase)
const badWordsList = [
    'badword1', 'badword2', 'scam', 'free nitro', 'click here for free'
];

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild) return;

        // Admins bypass the anti-abuse filters
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        const content = message.content.toLowerCase();

        // ==========================================
        // 1. BAD WORD SCANNER
        // ==========================================
        const containsBadWord = badWordsList.some(word => content.includes(word));
        
        if (containsBadWord) {
            await message.delete().catch(() => {});
            
            const warningEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('🛑 Inappropriate Content Blocked')
                .setDescription(`<@${message.author.id}>, your message was removed for containing restricted words.`);
            
            const warningMsg = await message.channel.send({ embeds: [warningEmbed] }).catch(() => {});
            if (warningMsg) setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
            return; // Stop processing to avoid double-punishing
        }

        // ==========================================
        // 2. RAPID ANTI-SPAM DETECTOR
        // ==========================================
        const userId = message.author.id;
        const now = Date.now();
        
        if (!userMessageLog.has(userId)) {
            userMessageLog.set(userId, []);
        }

        const timestamps = userMessageLog.get(userId);
        timestamps.push(now);

        // Keep only messages sent in the last 5 seconds
        const recentMessages = timestamps.filter(time => now - time < 5000);
        userMessageLog.set(userId, recentMessages);

        // Trigger: More than 5 messages in 5 seconds
        if (recentMessages.length >= 5) {
            userMessageLog.delete(userId); // Clear their log so they don't get double timed-out

            try {
                // Timeout for 5 minutes
                await message.member.timeout(5 * 60 * 1000, "Anti-Abuse: Rapid Message Spam");
                
                // Bulk delete their recent spam in this channel
                const msgsToDelete = await message.channel.messages.fetch({ limit: 10 });
                const userMsgs = msgsToDelete.filter(m => m.author.id === userId);
                await message.channel.bulkDelete(userMsgs, true).catch(() => {});

                await message.channel.send(`🔨 **Auto-Mod:** <@${userId}> has been timed out for 5 minutes due to rapid spamming.`);
            } catch (err) {
                console.error(`Failed to timeout spammer: ${err.message}`);
            }
        }
    });
};
        
