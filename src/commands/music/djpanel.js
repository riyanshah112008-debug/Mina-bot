const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('djpanel')
        .setDescription('🎛️ Post the ultimate interactive Starry DJ & Voice Control Hub')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, client) {
        const { channel, guild, member } = interaction;
        const voiceChannel = member.voice?.channel;

        const vcName = voiceChannel ? voiceChannel.name : 'Not Connected';
        const vcLimit = voiceChannel && voiceChannel.userLimit === 0 ? 'Unlimited' : (voiceChannel ? voiceChannel.userLimit : 'N/A');
        const vcStatus = voiceChannel ? (voiceChannel.permissionsFor(guild.roles.everyone).has('Connect') ? '🔓 Unlocked' : '🔒 Locked') : 'Unknown';

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎛️ Starry Ultimate DJ & Voice Control Hub')
            .setDescription(
                'Complete master command center for voice channel security, moderation, and music playback.\n\n' +
                `🎙️ **Active VC:** \`${vcName}\`\n` +
                `🔒 **Access Status:** ${vcStatus}\n` +
                `👥 **Member Capacity:** \`${voiceChannel ? voiceChannel.members.size : 0} / ${vcLimit}\``
            )
            .addFields(
                { name: '🔒 Security & Limits', value: 'Lock/Unlock VC or modify member entry limits on the fly.', inline: false },
                { name: '🎵 Audio & Playback', value: 'Manage queue, volume, skipping, looping, and filters effortlessly.', inline: false }
            )
            .setThumbnail(guild.iconURL({ dynamic: true }) || null)
            .setFooter({ text: 'Starry Audio Intelligence Engine', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        // Row 1: Voice Channel Security & Limits
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('dj_lock').setLabel('Lock').setEmoji('🔒').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('dj_unlock').setLabel('Unlock').setEmoji('🔓').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('dj_limit_plus').setLabel('+5 Limit').setEmoji('➕').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('dj_limit_minus').setLabel('-5 Limit').setEmoji('➖').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('dj_reset_limit').setLabel('Reset Limit').setEmoji('🔄').setStyle(ButtonStyle.Primary)
        );

        // Row 2: Playback & Queue Controls (Includes Loop & Shuffle)
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('music_pause').setLabel('Pause').setEmoji('⏸️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('music_skip').setLabel('Skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('dj_shuffle').setLabel('Shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('dj_loop').setLabel('Loop').setEmoji('🔁').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('music_stop').setLabel('Stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger)
        );

        // Row 3: Volume & Advanced Utilities
        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('dj_vol_down').setLabel('Vol -10%').setEmoji('🔉').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('dj_vol_up').setLabel('Vol +10%').setEmoji('🔊').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('dj_clear_queue').setLabel('Clear Queue').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('dj_refresh_panel').setLabel('Refresh Status').setEmoji('🔄').setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ content: '✅ Ultimate DJ Panel deployed successfully!', ephemeral: true });
        return channel.send({ embeds: [embed], components: [row1, row2, row3] });
    }
};