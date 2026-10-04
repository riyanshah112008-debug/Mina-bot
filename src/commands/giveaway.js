const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('🎉 Start an aesthetic giveaway in your server!')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt => 
            opt.setName('duration')
                .setDescription('Giveaway length (e.g., 10m, 2h, 1d)')
                .setRequired(true))
        .addStringOption(opt => 
            opt.setName('prize')
                .setDescription('The prize to win')
                .setRequired(true))
        .addIntegerOption(opt => 
            opt.setName('winners')
                .setDescription('Number of winners (Default: 1)')
                .setRequired(false))
        .addChannelOption(opt => 
            opt.setName('channel')
                .setDescription('Channel to post the giveaway (Default: Current channel)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)),

    async execute(interaction) {
        // Command is handled seamlessly by the module engine below
    }
};
