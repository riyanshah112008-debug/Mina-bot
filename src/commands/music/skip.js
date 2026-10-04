const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { StarryAudioEngine } = require('../../utils/nativeAudioEngine');

const EPHEMERAL_FLAG = (MessageFlags && MessageFlags.Ephemeral) ? MessageFlags.Ephemeral : 64;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('⏭️ Skips the current track'),
        
    async execute(interaction, client) {
        const player = StarryAudioEngine.getPlayer(interaction.guild.id) || (client.manager ? client.manager.getPlayer(interaction.guild.id) : null);
        
        if (!player || (!player.currentTrack && !player.playing)) {
            return interaction.reply({ content: '❌ Nothing is currently playing in this server.', flags: [EPHEMERAL_FLAG] });
        }

        const title = player.currentTrack?.title || player.queue?.current?.title || 'Current Track';
        player.skip();
        return interaction.reply(`⏭️ **Skipped:** \`${title}\``);
    }
};
