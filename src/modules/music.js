// ==========================================
// 🎵 STARRY SUPREME MUSIC ENGINE MODULE
const { EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const EPHEMERAL_FLAG = (MessageFlags && MessageFlags.Ephemeral) ? MessageFlags.Ephemeral : 64;

module.exports = (client) => {
    const checkPermissions = (channel, botMember) => {
        const permissions = channel.permissionsFor(botMember);
        return permissions?.has(PermissionsBitField.Flags.Connect) && permissions?.has(PermissionsBitField.Flags.Speak);
    };

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;

        const command = interaction.commandName;
        const musicCommands = new Set(['play', 'pause', 'resume', 'skip', 'stop', 'queue', 'volume']);
        if (!musicCommands.has(command)) return;

        const voiceChannel = interaction.member?.voice?.channel;
        if (!voiceChannel) {
            return interaction.reply({ content: '❌ You must be connected to a voice channel to play music!', flags: [EPHEMERAL_FLAG] }).catch(() => {});
        }

        if (!checkPermissions(voiceChannel, interaction.guild.members.me)) {
            return interaction.reply({ content: '❌ I need **Connect** and **Speak** permissions in your voice channel!', flags: [EPHEMERAL_FLAG] }).catch(() => {});
        }

        const manager = client.manager;
        if (!manager) {
            return interaction.reply({ content: '❌ Music Manager is not properly initialized on the bot server.', flags: [EPHEMERAL_FLAG] }).catch(() => {});
        }

        try {
            if (command === 'play') {
                const rawSong = typeof interaction.options?.getString === 'function' ? interaction.options.getString('song') : (interaction.args ? interaction.args.join(' ') : null);
                const query = rawSong?.trim();
                if (!query) {
                    return interaction.reply({ content: '❌ Please provide a song title or URL! Example: `/play beggin`', flags: [EPHEMERAL_FLAG] }).catch(() => {});
                }
                
                // 1. Immediately defer reply to eliminate Discord 3s timeout
                await interaction.deferReply({ flags: [EPHEMERAL_FLAG] }).catch(() => {});

                // 2. Search for the requested track
                const res = await manager.search(query, { requester: interaction.user });

                if (!res || !res.tracks || res.tracks.length === 0 || res.loadType === 'empty' || res.loadType === 'error') {
                    return interaction.editReply({ content: '❌ No songs found matching your query.' });
                }

                // 3. Create Kazagumo Player with correct parameter keys
                let player = manager.getPlayer(interaction.guild.id);
                if (!player) {
                    player = await manager.createPlayer({
                        guildId: interaction.guild.id,
                        voiceId: voiceChannel.id,
                        textId: interaction.channel.id,
                        deaf: true
                    });
                }

                // If active in a different channel, switch voice channel
                if (player.voiceId !== voiceChannel.id) {
                    player.setVoiceChannel(voiceChannel.id);
                }

                // 4. Queue tracks and start playback
                if (res.loadType === 'playlist') {
                    for (const track of res.tracks) {
                        player.queue.add(track);
                    }
                    if (!player.playing && !player.paused) player.play();
                    return interaction.editReply({ content: `✅ Loaded playlist **${res.playlist?.name || 'Playlist'}** (${res.tracks.length} tracks queued).` });
                } else {
                    const track = res.tracks[0];
                    player.queue.add(track);
                    if (!player.playing && !player.paused) player.play();
                    return interaction.editReply({ content: `🎵 Added to queue: **${track.title}**` });
                }
            }

            const player = manager.getPlayer(interaction.guild.id);
            if (!player) {
                return interaction.reply({ content: '❌ No active music session in this server.', flags: [EPHEMERAL_FLAG] });
            }

            if (command === 'pause') {
                if (player.paused) return interaction.reply({ content: '⚠️ Music is already paused.', flags: [EPHEMERAL_FLAG] });
                player.pause(true);
                return interaction.reply({ content: '⏸️ **Paused playback.**', flags: [EPHEMERAL_FLAG] });
            }

            if (command === 'resume') {
                if (!player.paused) return interaction.reply({ content: '⚠️ Music is not paused.', flags: [EPHEMERAL_FLAG] });
                player.pause(false);
                return interaction.reply({ content: '▶️ **Resumed playback.**', flags: [EPHEMERAL_FLAG] });
            }

            if (command === 'skip') {
                player.skip();
                return interaction.reply({ content: '⏭️ **Skipped current song.**', flags: [EPHEMERAL_FLAG] });
            }

            if (command === 'stop') {
                player.destroy();
                return interaction.reply({ content: '🛑 **Stopped playback and left voice channel.**', flags: [EPHEMERAL_FLAG] });
            }

            if (command === 'volume') {
                const volume = interaction.options.getInteger('amount', true);
                player.setVolume(volume);
                return interaction.reply({ content: `🔊 **Volume set to ${volume}%.**`, flags: [EPHEMERAL_FLAG] });
            }

            if (command === 'queue') {
                if (!player.queue || player.queue.length === 0) {
                    return interaction.reply({ content: '📭 The queue is currently empty.', flags: [EPHEMERAL_FLAG] });
                }
                const queueList = player.queue.slice(0, 10).map((t, i) => `**${i + 1}.** ${t.title}`).join('\n');
                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🎶 Current Music Queue')
                    .setDescription(queueList)
                    .setFooter({ text: `Total songs: ${player.queue.length}` });
                return interaction.reply({ embeds: [embed], flags: [EPHEMERAL_FLAG] });
            }

        } catch (error) {
            console.error('🔴 Music Command Error:', error);
            const content = `❌ **Music Error:** \`${error.message || 'Unknown error'}\``;
            if (interaction.deferred) {
                await interaction.editReply({ content }).catch(() => {});
            } else {
                await interaction.reply({ content, flags: [EPHEMERAL_FLAG] }).catch(() => {});
            }
        }
    });
};
