const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ComponentType 
} = require('discord.js');
const { StarryAudioEngine } = require('../../utils/nativeAudioEngine');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('📑 View and interactively manage the music queue'),

    async execute(interaction, client) {
        await interaction.deferReply();

        const kPlayer = client.manager?.getPlayer(interaction.guild.id);
        const nativePlayer = StarryAudioEngine?.getPlayer(interaction.guild.id, client);

        const isNative = (!kPlayer || !kPlayer.queue?.current) && (nativePlayer && (nativePlayer.currentTrack || nativePlayer.queue.length > 0));
        const activePlayer = isNative ? nativePlayer : kPlayer;

        if (!activePlayer || (isNative ? !nativePlayer.currentTrack : !kPlayer.queue?.current)) {
            return interaction.editReply('❌ There is no music currently playing in this server.');
        }

        const formatTime = (ms) => {
            if (!ms) return '0:00';
            const totalSeconds = Math.floor(ms / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };

        const getTracks = () => isNative ? nativePlayer.queue : activePlayer.queue;
        const getCurrent = () => isNative ? nativePlayer.currentTrack : activePlayer.queue.current;

        let tracks = getTracks();
        const itemsPerPage = 10;
        let currentPage = 0;

        // Function to build the Queue Display Embed
        const generateEmbed = (page) => {
            const current = getCurrent();
            tracks = getTracks();
            const totalPages = Math.max(Math.ceil(tracks.length / itemsPerPage), 1);
            const start = page * itemsPerPage;
            const currentTracks = tracks.slice(start, start + itemsPerPage);

            const trackList = currentTracks.length > 0
                ? currentTracks.map((track, index) => {
                    const url = track.uri || track.url || 'https://discord.gg';
                    const dur = track.length || track.duration || 0;
                    return `**${start + index + 1}.** [${(track.title || 'Track').substring(0, 45)}](${url}) - \`${formatTime(dur)}\``;
                }).join('\n')
                : '*No upcoming songs in queue.*';

            const curUrl = current?.uri || current?.url || '';
            const curDur = current?.length || current?.duration || 0;

            return new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`🎶 Queue for ${interaction.guild.name}`)
                .setDescription(
                    `**Now Playing:**\n[${current ? current.title : 'None'}](${curUrl}) - \`${formatTime(curDur)}\`\n\n` +
                    `**Up Next:**\n${trackList}`
                )
                .setFooter({ 
                    text: `Page ${page + 1} of ${totalPages} • Total Queue: ${tracks.length} songs`, 
                    iconURL: client.user.displayAvatarURL() 
                });
        };

        // Function to build Navigation Buttons
        const generateButtons = (page) => {
            tracks = getTracks();
            const totalPages = Math.max(Math.ceil(tracks.length / itemsPerPage), 1);

            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('q_first').setEmoji('⏪').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('q_prev').setEmoji('◀️').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('q_next').setEmoji('▶️').setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages - 1),
                new ButtonBuilder().setCustomId('q_last').setEmoji('⏩').setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages - 1),
                new ButtonBuilder().setCustomId('q_move_modal').setLabel('Move Position').setEmoji('🔀').setStyle(ButtonStyle.Secondary).setDisabled(tracks.length < 2)
            );
        };

        // Function to build the "Play Next" Dropdown Menu
        const generatePlayNextMenu = (page) => {
            tracks = getTracks();
            const start = page * itemsPerPage;
            const currentTracks = tracks.slice(start, start + itemsPerPage);

            if (currentTracks.length === 0) return null;

            const options = currentTracks.map((track, index) => ({
                label: `${start + index + 1}. ${track.title || 'Track'}`.substring(0, 95),
                description: `Duration: ${formatTime(track.length || track.duration || 0)}`,
                value: `playnext_${start + index}`
            }));

            return new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('q_select_playnext')
                    .setPlaceholder('⏭️ Select a song to Play Next...')
                    .addOptions(options)
            );
        };

        // Function to build the "Remove Song" Dropdown Menu
        const generateRemoveMenu = (page) => {
            tracks = getTracks();
            const start = page * itemsPerPage;
            const currentTracks = tracks.slice(start, start + itemsPerPage);

            if (currentTracks.length === 0) return null;

            const options = currentTracks.map((track, index) => ({
                label: `${start + index + 1}. ${track.title || 'Track'}`.substring(0, 95),
                description: `Duration: ${formatTime(track.length || track.duration || 0)}`,
                value: `remove_${start + index}`
            }));

            return new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('q_select_remove')
                    .setPlaceholder('❌ Select a song to Remove...')
                    .addOptions(options)
            );
        };

        // Function to assemble components for response
        const getComponents = (page) => {
            const rows = [generateButtons(page)];
            const playNext = generatePlayNextMenu(page);
            const remove = generateRemoveMenu(page);
            if (playNext) rows.push(playNext);
            if (remove) rows.push(remove);
            return rows;
        };

        // Send initial Queue Message
        const message = await interaction.editReply({ 
            embeds: [generateEmbed(currentPage)], 
            components: getComponents(currentPage) 
        });

        // Component Collector for buttons, select menus, and modals with 1-year lifetime
        const collector = message.createMessageComponentCollector({ time: 2147483647 });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: '❌ Only the person who requested the queue can use these controls.', ephemeral: true });
            }

            tracks = getTracks();
            const totalPages = Math.max(Math.ceil(tracks.length / itemsPerPage), 1);

            // --- 1. PAGINATION CONTROLS ---
            if (i.customId === 'q_first') currentPage = 0;
            if (i.customId === 'q_prev') currentPage = Math.max(currentPage - 1, 0);
            if (i.customId === 'q_next') currentPage = Math.min(currentPage + 1, totalPages - 1);
            if (i.customId === 'q_last') currentPage = totalPages - 1;

            // --- 2. MOVE SONG POSITION (MODAL) ---
            if (i.customId === 'q_move_modal') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_move_queue')
                    .setTitle('Reorder Queue Position');

                const fromInput = new TextInputBuilder()
                    .setCustomId('move_from')
                    .setLabel('Move Song Number (From Position X)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g. 5')
                    .setRequired(true);

                const toInput = new TextInputBuilder()
                    .setCustomId('move_to')
                    .setLabel('To Position Number (To Position Y)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g. 2')
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(fromInput),
                    new ActionRowBuilder().addComponents(toInput)
                );

                await i.showModal(modal);

                try {
                    const modalSubmit = await i.awaitModalSubmit({ time: 30000 });
                    const fromPos = parseInt(modalSubmit.fields.getTextInputValue('move_from')) - 1;
                    const toPos = parseInt(modalSubmit.fields.getTextInputValue('move_to')) - 1;

                    if (isNaN(fromPos) || isNaN(toPos) || fromPos < 0 || toPos < 0 || fromPos >= tracks.length || toPos >= tracks.length) {
                        return modalSubmit.reply({ content: '❌ Invalid position numbers provided.', ephemeral: true });
                    }

                    // Perform queue move operation
                    const [movedTrack] = tracks.splice(fromPos, 1);
                    tracks.splice(toPos, 0, movedTrack);

                    await modalSubmit.reply({ content: `✅ Moved **${movedTrack.title}** from position **#${fromPos + 1}** to **#${toPos + 1}**!`, ephemeral: true });

                    return message.edit({
                        embeds: [generateEmbed(currentPage)],
                        components: getComponents(currentPage)
                    });
                } catch (err) {
                    return;
                }
            }

            // --- 3. PLAY NEXT SELECTION ---
            if (i.customId === 'q_select_playnext') {
                const selectedIndex = parseInt(i.values[0].replace('playnext_', ''));
                if (!isNaN(selectedIndex) && tracks[selectedIndex]) {
                    const [selectedTrack] = tracks.splice(selectedIndex, 1);
                    tracks.unshift(selectedTrack); // Insert at position 0 (next up)

                    await i.reply({ content: `⏭️ **${selectedTrack.title}** will now play next!`, ephemeral: true });
                }
            }

            // --- 4. REMOVE SONG SELECTION ---
            if (i.customId === 'q_select_remove') {
                const selectedIndex = parseInt(i.values[0].replace('remove_', ''));
                if (!isNaN(selectedIndex) && tracks[selectedIndex]) {
                    const [removedTrack] = tracks.splice(selectedIndex, 1);

                    await i.reply({ content: `❌ Removed **${removedTrack.title}** from the queue.`, ephemeral: true });
                }
            }

            // Update display after actions
            if (i.replied || i.deferred) {
                await message.edit({
                    embeds: [generateEmbed(currentPage)],
                    components: getComponents(currentPage)
                }).catch(() => {});
            } else {
                await i.update({
                    embeds: [generateEmbed(currentPage)],
                    components: getComponents(currentPage)
                }).catch(() => {});
            }
        });

        collector.on('end', () => {
            message.edit({ components: [] }).catch(() => {});
        });
    }
};
