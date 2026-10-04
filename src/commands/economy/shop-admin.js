const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ShopItem = require('../../models/ShopItem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop-admin')
        .setDescription('Manage the server economy shop (Admins Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub
            .setName('add-role')
            .setDescription('Add a role to the shop')
            .addRoleOption(opt => opt.setName('role').setDescription('The role to sell').setRequired(true))
            .addNumberOption(opt => opt.setName('price').setDescription('Price in credits').setRequired(true))
            .addStringOption(opt => opt.setName('description').setDescription('Item description').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('add-pet')
            .setDescription('Add a pet to the shop')
            .addStringOption(opt => opt.setName('name').setDescription('Name of the pet (e.g., Dragon)').setRequired(true))
            .addNumberOption(opt => opt.setName('price').setDescription('Price in credits').setRequired(true))
            .addStringOption(opt => opt.setName('description').setDescription('Pet description').setRequired(true))
            .addStringOption(opt => opt.setName('emoji').setDescription('Emoji for the pet').setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const price = interaction.options.getNumber('price');
        const desc = interaction.options.getString('description');

        if (sub === 'add-role') {
            const role = interaction.options.getRole('role');
            await ShopItem.create({
                guildId: interaction.guild.id, name: role.name, description: desc,
                price: price, type: 'role', roleId: role.id, emoji: '🎭'
            });
            return interaction.reply({ content: `✅ Added Role **${role.name}** to the shop for 💳 ${price} Credits!`, ephemeral: true });
        } 
        
        if (sub === 'add-pet') {
            const name = interaction.options.getString('name');
            const emoji = interaction.options.getString('emoji');
            await ShopItem.create({
                guildId: interaction.guild.id, name: name, description: desc,
                price: price, type: 'pet', emoji: emoji
            });
            return interaction.reply({ content: `✅ Added Pet **${emoji} ${name}** to the shop for 💳 ${price} Credits!`, ephemeral: true });
        }
    }
};
