// ==========================================
// ⭐ STARRY CELESTIAL STARBOARD ENGINE
// File Path: src/modules/starboardEngine.js
// Autonomous Reaction Showcase • Real-Time Star Tallying
// ==========================================
const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { StarboardConfig, StarboardMessage } = require('../models/StarboardConfig');
const config = require('../config');

function initStarboard(client) {
    client.on(Events.MessageReactionAdd, async (reaction, user) => {
        try {
            if (user.bot) return;
            if (reaction.partial) await reaction.fetch().catch(() => {});
            const message = reaction.message.partial ? await reaction.message.fetch().catch(() => null) : reaction.message;
            if (!message || !message.guild) return;

            const emojiName = reaction.emoji.name;
            if (emojiName !== '⭐' && emojiName !== '🌟') return;

            const sbConfig = await StarboardConfig.findOne({ guildId: message.guild.id });
            if (!sbConfig || !sbConfig.enabled || !sbConfig.channelId) return;
            if (message.channel.id === sbConfig.channelId) return; // Don't starboard messages from the starboard itself

            const count = reaction.count;
            if (count < sbConfig.starCount) return;

            const targetChannel = message.guild.channels.cache.get(sbConfig.channelId) || await message.guild.channels.fetch(sbConfig.channelId).catch(() => null);
            if (!targetChannel) return;

            // Check if already posted
            let existingEntry = await StarboardMessage.findOne({
                guildId: message.guild.id,
                originalMessageId: message.id
            });

            const starEmoji = count >= 10 ? '💫' : (count >= 5 ? '🌟' : '⭐');
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setAuthor({ 
                    name: message.author.tag, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .setDescription(message.content || '*[Image/Media]*')
                .setFooter({ text: `Message ID: ${message.id} • #${message.channel.name}` })
                .setTimestamp(message.createdAt);

            // Attach image if present
            const imageAttachment = message.attachments?.find(att => att.contentType?.startsWith('image/'));
            if (imageAttachment) {
                embed.setImage(imageAttachment.url);
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Jump to Starlit Message')
                    .setStyle(ButtonStyle.Link)
                    .setURL(message.url)
                    .setEmoji('🌌')
            );

            const contentText = `${starEmoji} **${count}** <#${message.channel.id}>`;

            if (existingEntry) {
                // Update existing showcase
                try {
                    const sbMsg = await targetChannel.messages.fetch(existingEntry.starboardMessageId).catch(() => null);
                    if (sbMsg) {
                        await sbMsg.edit({ content: contentText, embeds: [embed], components: [row] });
                        existingEntry.stars = count;
                        await existingEntry.save().catch(() => {});
                    }
                } catch (e) {}
            } else {
                // Post fresh showcase
                const sentMsg = await targetChannel.send({
                    content: contentText,
                    embeds: [embed],
                    components: [row]
                }).catch(() => null);

                if (sentMsg) {
                    await StarboardMessage.create({
                        guildId: message.guild.id,
                        originalMessageId: message.id,
                        channelId: message.channel.id,
                        starboardMessageId: sentMsg.id,
                        stars: count
                    }).catch(() => {});
                }
            }
        } catch (err) {
            // Silently handle reaction errors
        }
    });

    console.log('⭐ [Starboard Engine] Celestial Reaction Showcase Armed.');
}

module.exports = {
    initStarboard
};
