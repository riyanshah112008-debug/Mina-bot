const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { StarryAudioEngine } = require('../../utils/nativeAudioEngine');

const EPHEMERAL_FLAG = (MessageFlags && MessageFlags.Ephemeral) ? MessageFlags.Ephemeral : 64;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('⏹️ Stops playback, clears queue, and disconnects'),
        
    async execute(interaction, client) {
        const player = StarryAudioEngine.getPlayer(interaction.guild.id) || (client.manager ? client.manager.getPlayer(interaction.guild.id) : null);
        
        if (!player) {
            return interaction.reply({ content: '❌ No active audio session in this server.', flags: [EPHEMERAL_FLAG] });
        }

        player.destroy();
        return interaction.reply('⏹️ **Audio playback stopped and queue cleared.**');
    }
};
