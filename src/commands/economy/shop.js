const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const User = require('../../models/User');
const ShopItem = require('../../models/ShopItem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Open the server shop to buy exclusive roles and pets!'),

    async execute(interaction, client) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        // Fetch User and Shop Items
        const userData = await User.findOne({ userId, guildId });
        const items = await ShopItem.find({ guildId });
        const balance = userData ? userData.credits : 0;

        if (items.length === 0) {
            return interaction.reply('🛒 The shop is currently empty! Ask an admin to add items.');
        }

        const embed = new EmbedBuilder()
            .setColor('#23a559')
            .setTitle('🛍️ Starry Credit Shop')
            .setDescription(`Your Current Balance: 💳 **${balance.toLocaleString()} Credits**\n\nSelect an item from the menu below to purchase it!`)
            .setFooter({ text: 'Starry Economy', iconURL: client.user.displayAvatarURL() });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('shop_buy_menu')
            .setPlaceholder('Choose an item to purchase...')
            .addOptions(items.map(item => ({
                label: `${item.name} — 💳 ${item.price.toLocaleString()}`,
                description: item.description,
                value: item._id.toString(), // We pass the MongoDB ID to the handler
                emoji: item.emoji || '📦'
            })));

        const row = new ActionRowBuilder().addComponents(selectMenu);
        return interaction.reply({ embeds: [embed], components: [row] });
    }
};
