const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ChestChannel = require('../../models/ChestChannel');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chest-setup')
        .setDescription('Enable or disable automatic chest drops in a channel (Admins Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) 
        .addSubcommand(sub => sub
            .setName('enable')
            .setDescription('Enable chest drops in a specific channel')
            .addChannelOption(opt => opt.setName('channel').setDescription('Select the channel').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('disable')
            .setDescription('Disable chest drops in a specific channel')
            .addChannelOption(opt => opt.setName('channel').setDescription('Select the channel').setRequired(true))
        ),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const channel = interaction.options.getChannel('channel');

        if (!client.chestChannelsCache) {
            client.chestChannelsCache = new Set();
            const channels = await ChestChannel.find();
            channels.forEach(c => client.chestChannelsCache.add(c.channelId));
        }

        if (sub === 'enable') {
            const existing = await ChestChannel.findOne({ channelId: channel.id });
            if (existing) {
                return interaction.reply({ content: `✅ Chest drops are **already enabled** in ${channel}!`, ephemeral: true });
            }

            await ChestChannel.create({ guildId: interaction.guild.id, channelId: channel.id });
            client.chestChannelsCache.add(channel.id);

            return interaction.reply({ content: `🎉 Successfully **ENABLED** automatic chest drops in ${channel}! Keep chatting to see them appear.`, ephemeral: true });
        }

        if (sub === 'disable') {
            await ChestChannel.deleteOne({ channelId: channel.id });
            client.chestChannelsCache.delete(channel.id);

            return interaction.reply({ content: `🚫 Successfully **DISABLED** automatic chest drops in ${channel}.`, ephemeral: true });
        }
    }
};
