const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emergency-lockdown')
        .setDescription('🚨 EMERGENCY: Freezes the entire server. Nobody can type or join VC. (Admins Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🚨 INITIATE GLOBAL LOCKDOWN 🚨')
            .setDescription('Are you sure you want to lock down the entire server? \n\nThis will remove typing and voice access for `@everyone` in all channels. Only Admins will be able to speak.');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('lock_confirm').setLabel('LOCKDOWN SERVER').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
            new ButtonBuilder().setCustomId('lock_cancel').setLabel('CANCEL').setStyle(ButtonStyle.Secondary)
        );

        const response = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        const filter = i => i.user.id === interaction.user.id;
        
        try {
            const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });
            if (confirmation.customId === 'lock_cancel') return confirmation.update({ content: '🚫 Lockdown aborted.', embeds: [], components: [] });

            await confirmation.update({ content: '🔒 **LOCKING DOWN ALL CHANNELS...**', embeds: [], components: [] });
            
            let lockedCount = 0;
            const channels = await interaction.guild.channels.fetch();

            for (const [id, channel] of channels) {
                try {
                    await channel.permissionOverwrites.edit(interaction.guild.id, {
                        SendMessages: false,
                        Connect: false
                    });
                    lockedCount++;
                    await delay(300); // Anti-rate-limit delay
                } catch (err) {}
            }

            const safeChannel = interaction.guild.channels.cache.get(interaction.channel.id);
            if (safeChannel) safeChannel.send(`🚨 **GLOBAL LOCKDOWN COMPLETE** 🚨\nLocked **${lockedCount} channels**. The server is now frozen.`);

        } catch (e) {
            await interaction.editReply({ content: '⚠️ Command timed out.', embeds: [], components: [] });
        }
    }
};
