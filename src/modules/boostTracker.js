const { Events, EmbedBuilder, MessageType } = require('discord.js');
const BoostChannel = require('../models/BoostChannel');

module.exports = (client) => {
    client.on(Events.MessageCreate, async (message) => {
        // Discord uses specific Message Types for boosts
        const boostTypes = [
            MessageType.UserPremiumGuildSubscription,
            MessageType.UserPremiumGuildSubscriptionTier1,
            MessageType.UserPremiumGuildSubscriptionTier2,
            MessageType.UserPremiumGuildSubscriptionTier3
        ];

        if (boostTypes.includes(message.type)) {
            try {
                // Fetch the configured channel from the DB
                const boostData = await BoostChannel.findOne({ guildId: message.guild.id });
                if (!boostData) return; // If no channel is set, do nothing

                const targetChannel = message.guild.channels.cache.get(boostData.channelId);
                if (!targetChannel) return;

                const embed = new EmbedBuilder()
                    .setColor('#ff73fa') // Official Discord Boost Pink
                    .setTitle('🚀 NEW SERVER BOOST! 🚀')
                    .setDescription(`**THANK YOU SO MUCH <@${message.author.id}>!** 💜\n\nYour boost helps support the server and unlocks epic new perks for the entire community!`)
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setImage('https://cdn.otakugifs.xyz/gifs/celebrate/a4cee6028f5fec0e.gif') // Sparkle/Boost celebration GIF banner
                    .setFooter({ text: `Total Server Boosts: ${message.guild.premiumSubscriptionCount}`, iconURL: message.guild.iconURL() });

                await targetChannel.send({ content: `Everyone say thank you to <@${message.author.id}>! 🎉`, embeds: [embed] });
            } catch (err) {
                console.error('Boost Tracker Error:', err);
            }
        }
    });
};
