const { PermissionsBitField } = require('discord.js');

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild) return;
        
        // Ignore staff members
        if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

        // Regex patterns to detect both custom Discord emojis and standard keyboard emojis
        const customEmojiRegex = /<a?:[a-zA-Z0-9_]+:[0-9]+>/g;
        const unicodeEmojiRegex = /[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g;

        const customEmojis = message.content.match(customEmojiRegex) || [];
        const unicodeEmojis = message.content.match(unicodeEmojiRegex) || [];
        const totalEmojis = customEmojis.length + unicodeEmojis.length;

        // If the message contains more than 8 emojis, wipe it
        if (totalEmojis > 8) {
            try {
                await message.delete();
                const warning = await message.channel.send(`⚠️ <@${message.author.id}>, please do not spam emojis!`).catch(() => {});
                
                // Delete the warning after 4 seconds
                if (warning) {
                    setTimeout(() => warning.delete().catch(() => {}), 4000);
                }
            } catch (error) {
                return;
            }
        }
    });
};
