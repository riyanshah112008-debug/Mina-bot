const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emergency-unban')
        .setDescription('🏥 EMERGENCY: Unbans every single user in the server ban list. (Admins Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('🏥 INITIATE MASS UNBAN 🏥')
            .setDescription('Are you sure? This will wipe the entire ban list and unban **EVERYONE** who was previously banned from this server.');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('unban_confirm').setLabel('UNBAN EVERYONE').setStyle(ButtonStyle.Danger).setEmoji('🏥'),
            new ButtonBuilder().setCustomId('unban_cancel').setLabel('CANCEL').setStyle(ButtonStyle.Secondary)
        );

        const response = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        const filter = i => i.user.id === interaction.user.id;
        
        try {
            const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });
            if (confirmation.customId === 'unban_cancel') return confirmation.update({ content: '🚫 Mass unban aborted.', embeds: [], components: [] });

            await confirmation.update({ content: '🏥 **FETCHING BAN LIST...**', embeds: [], components: [] });
            
            const bans = await interaction.guild.bans.fetch();
            if (bans.size === 0) return interaction.followUp({ content: 'The ban list is already empty!', ephemeral: true });

            let unbannedCount = 0;

            for (const [userId, banInfo] of bans) {
                try {
                    await interaction.guild.members.unban(userId, 'Emergency Mass Unban Protocol');
                    unbannedCount++;
                    await delay(300); // Anti-rate-limit delay
                } catch (err) {}
            }

            const safeChannel = interaction.guild.channels.cache.get(interaction.channel.id);
            if (safeChannel) safeChannel.send(`🏥 **RECOVERY COMPLETE** 🏥\nSuccessfully unbanned **${unbannedCount} users**.`);

        } catch (e) {
            await interaction.editReply({ content: '⚠️ Command timed out.', embeds: [], components: [] });
        }
    }
};
