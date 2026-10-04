const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const BoostChannel = require('../../models/BoostChannel');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('boost-setup')
        .setDescription('Set the channel for server boost announcements (Admins Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(opt => opt.setName('channel').setDescription('The channel to send boost messages in').setRequired(true)),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');

        // Save or update the channel in the database
        await BoostChannel.findOneAndUpdate(
            { guildId: interaction.guild.id },
            { channelId: channel.id },
            { upsert: true, new: true }
        );

        return interaction.reply({ 
            content: `✅ Success! All future Server Boost announcements will be sent to ${channel}!`, 
            ephemeral: true 
        });
    }
};
