const { Events } = require('discord.js');
const User = require('../models/User');

module.exports = (client) => {
    client.on(Events.MessageCreate, async message => {
        if (message.author.bot || !message.guild) return;

        // 15% chance per message to increase pet happiness (prevents database spam on every single word)
        if (Math.random() > 0.15) return; 

        try {
            const userData = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
            
            // If they have an active pet and it isn't maxed out yet
            if (userData && userData.activePet && userData.petHappiness < 100) {
                // Add 1 to 3 happiness points randomly
                const boost = Math.floor(Math.random() * 3) + 1;
                userData.petHappiness = Math.min(100, userData.petHappiness + boost);
                await userData.save();
            }
        } catch (error) {
            console.error('Pet System Error:', error);
        }
    });
};
