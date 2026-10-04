const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { StarryAudioEngine } = require('../../utils/nativeAudioEngine');

const EPHEMERAL_FLAG = (MessageFlags && MessageFlags.Ephemeral) ? MessageFlags.Ephemeral : 64;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('📻 Toggle smart recommendation autoplay when playlist ends'),

    async execute(interaction, client) {
        const voiceChannel = interaction.member?.voice?.channel;
        if (!voiceChannel) {
            return interaction.reply({ content: '❌ You must be connected to a voice channel first!', flags: [EPHEMERAL_FLAG] });
        }

        let kPlayer = client.manager?.getPlayer(interaction.guild.id);
        if (!kPlayer && client.multiBot?.instances) {
            for (const inst of client.multiBot.instances.values()) {
                if (inst.client?.manager) {
                    const p = inst.client.manager.getPlayer(interaction.guild.id);
                    if (p) { kPlayer = p; break; }
                }
            }
        }

        let newState = false;
        if (kPlayer) {
            const cur = Boolean(kPlayer.data?.get('autoplay') || kPlayer.autoplay);
            newState = !cur;
            kPlayer.data?.set('autoplay', newState);
            kPlayer.autoplay = newState;

            if (newState) {
                const { triggerAutoplayBuffer } = require('../../utils/musicManager');
                triggerAutoplayBuffer(kPlayer, kPlayer.queue.length === 0 && !kPlayer.playing).catch(() => {});
            }

            // Live update the now-playing embed components
            const nowMsg = kPlayer.data?.get('nowPlayingMessage');
            if (nowMsg && typeof nowMsg.edit === 'function') {
                const { buildNowPlayingComponents } = require('../../utils/musicManager');
                nowMsg.edit({ components: buildNowPlayingComponents(interaction.guild.id, newState) }).catch(() => {});
            }
        } else {
            const player = StarryAudioEngine.getOrCreatePlayer(client, interaction.guild.id, voiceChannel, interaction.channel);
            player.autoplay = !player.autoplay;
            newState = player.autoplay;
            if (player.currentTrack && typeof player.sendNowPlayingPanel === 'function') {
                await player.sendNowPlayingPanel(player.currentTrack, true).catch(() => {});
            }
        }

        // Sync controller if deployed
        try {
            const musicController = require('../../modules/musicController');
            musicController.update(interaction.guild.id, client).catch(() => {});
        } catch (e) {}

        const embed = new EmbedBuilder()
            .setColor(newState ? '#57F287' : '#ED4245')
            .setAuthor({ 
                name: '📻 Autoplay Smart Stream Engine', 
                iconURL: 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96' 
            })
            .setTitle(newState ? '🟢 Autoplay Smart Stream: ENABLED' : '🔴 Autoplay Smart Stream: DISABLED')
            .setDescription(
                newState
                    ? `Starry will automatically fetch and queue matching recommended songs from Spotify & YouTube when the playlist ends!\n\n` +
                      `✨ **Pro-Tip:** You can also click the 📻 **AutoPlay** button on the player embed for 1-click toggling.`
                    : `Playback will stop when the current queue reaches the end.`
            )
            .setFooter({ text: 'Starry Hi-Fi Audio Engine • Continuous Streaming' });

        return interaction.reply({ embeds: [embed] });
    }
};

