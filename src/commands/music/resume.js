const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { StarryAudioEngine } = require('../../utils/nativeAudioEngine');

const EPHEMERAL_FLAG = (MessageFlags && MessageFlags.Ephemeral) ? MessageFlags.Ephemeral : 64;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('▶️ Resumes paused audio playback'),
        
    async execute(interaction, client) {
        const player = StarryAudioEngine.getPlayer(interaction.guild.id) || (client.manager ? client.manager.getPlayer(interaction.guild.id) : null);
        
        if (!player || (!player.currentTrack && !player.playing)) {
            return interaction.reply({ content: '❌ Nothing is currently playing in this server.', flags: [EPHEMERAL_FLAG] });
        }
        if (!player.paused) {
            return interaction.reply({ content: '⚠️ The audio is not paused!', flags: [EPHEMERAL_FLAG] });
        }

        player.pause(false);
        return interaction.reply('▶️ **Resumed audio playback.**');
    }
};
