const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emergency-secure')
        .setDescription('🛡️ EMERGENCY: Strips all dangerous permissions from all roles. (Admins Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🛡️ INITIATE SECURITY PROTOCOL 🛡️')
            .setDescription('Are you sure? This will instantly remove `Administrator`, `Ban`, `Kick`, and `Manage` permissions from **EVERY ROLE** to stop a rogue staff member.');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('secure_confirm').setLabel('SECURE ROLES').setStyle(ButtonStyle.Danger).setEmoji('🛡️'),
            new ButtonBuilder().setCustomId('secure_cancel').setLabel('CANCEL').setStyle(ButtonStyle.Secondary)
        );

        const response = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        const filter = i => i.user.id === interaction.user.id;
        
        try {
            const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });
            if (confirmation.customId === 'secure_cancel') return confirmation.update({ content: '🚫 Security protocol aborted.', embeds: [], components: [] });

            await confirmation.update({ content: '🛡️ **STRIPPING DANGEROUS PERMISSIONS...**', embeds: [], components: [] });
            
            let strippedCount = 0;
            const roles = await interaction.guild.roles.fetch();
            const botRolePosition = interaction.guild.members.me.roles.highest.position;

            for (const [id, role] of roles) {
                // Do not strip the bot's own role, @everyone, or roles above the bot
                if (role.position >= botRolePosition || role.name === '@everyone' || role.managed) continue;

                try {
                    await role.setPermissions(role.permissions.remove([
                        PermissionFlagsBits.Administrator,
                        PermissionFlagsBits.BanMembers,
                        PermissionFlagsBits.KickMembers,
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.ManageRoles,
                        PermissionFlagsBits.ManageGuild,
                        PermissionFlagsBits.ManageWebhooks
                    ]));
                    strippedCount++;
                    await delay(500); // Anti-rate-limit delay
                } catch (err) {}
            }

            const safeChannel = interaction.guild.channels.cache.get(interaction.channel.id);
            if (safeChannel) safeChannel.send(`🛡️ **SERVER SECURED** 🛡️\nStripped dangerous permissions from **${strippedCount} roles**. The threat is contained.`);

        } catch (e) {
            await interaction.editReply({ content: '⚠️ Command timed out.', embeds: [], components: [] });
        }
    }
};
