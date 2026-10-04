const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { StarryAudioEngine } = require('../../utils/nativeAudioEngine');

const EPHEMERAL_FLAG = (MessageFlags && MessageFlags.Ephemeral) ? MessageFlags.Ephemeral : 64;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('🔊 Adjust playback output volume (1-150%)')
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Volume level (1 to 150)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(150)
        ),
        
    async execute(interaction, client) {
        const player = StarryAudioEngine.getPlayer(interaction.guild.id) || (client.manager ? client.manager.getPlayer(interaction.guild.id) : null);
        
        if (!player) {
            return interaction.reply({ content: '❌ No active audio stream in this server.', flags: [EPHEMERAL_FLAG] });
        }

        const amount = interaction.options.getInteger('amount');
        player.setVolume(amount);
        return interaction.reply(`🔊 **Volume set to ${amount}%!**`);
    }
};
