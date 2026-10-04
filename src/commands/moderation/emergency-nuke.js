const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Helper function to prevent Discord from crashing due to rate limits
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emergency-nuke')
        .setDescription('⚠️ EMERGENCY: Deletes all channels (except General) AND all roles. (Admins Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // 1. Send the Ultimate Warning
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('☢️ TOTAL EMERGENCY NUKE ☢️')
            .setDescription(
                '**WARNING: THIS ACTION IS COMPLETELY IRREVERSIBLE.**\n\n' +
                'Are you absolutely sure you want to vaporize this server? This will delete:\n' +
                '🗑️ **EVERY CATEGORY & CHANNEL**\n' +
                '🗑️ **EVERY CUSTOM ROLE**\n\n' +
                '*Exceptions: Channels named `general`, the channel you are in right now, and roles higher than the bot.*'
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nuke_confirm').setLabel('NUKE EVERYTHING').setStyle(ButtonStyle.Danger).setEmoji('☢️'),
            new ButtonBuilder().setCustomId('nuke_cancel').setLabel('CANCEL').setStyle(ButtonStyle.Secondary)
        );

        // Ephemeral so only the admin sees the button
        const response = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        const filter = i => i.user.id === interaction.user.id;
        
        try {
            // 2. Wait for them to click a button (Expires in 30 seconds)
            const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

            if (confirmation.customId === 'nuke_cancel') {
                return confirmation.update({ content: '🚫 Nuke aborted. The server is safe.', embeds: [], components: [] });
            }

            // 3. IF CONFIRMED, START THE NUKE
            await confirmation.update({ content: '☢️ **INITIATING TOTAL NUKE PROTOCOL...** ☢️\nVaporizing channels and roles now...', embeds: [], components: [] });

            // --- PHASE 1: DELETE CHANNELS ---
            const channels = await interaction.guild.channels.fetch();
            let deletedChannels = 0;

            for (const [id, channel] of channels) {
                // Protect the channel the command was sent in AND any channel with 'general' in the name
                if (id === interaction.channel.id || channel.name.toLowerCase().includes('general')) {
                    continue; 
                }

                try {
                    await channel.delete('Emergency Nuke Protocol initiated by Admin');
                    deletedChannels++;
                    await delay(400); // 0.4s delay so Discord doesn't block the bot
                } catch (err) {
                    console.log(`[Nuke] Could not delete channel ${channel.name}: ${err.message}`);
                }
            }

            // --- PHASE 2: DELETE ROLES ---
            const roles = await interaction.guild.roles.fetch();
            let deletedRoles = 0;
            const botRolePosition = interaction.guild.members.me.roles.highest.position;

            for (const [id, role] of roles) {
                // Protect @everyone, integration/bot roles (managed), and roles above the bot's rank
                if (role.name === '@everyone' || role.managed || role.position >= botRolePosition) {
                    continue;
                }

                try {
                    await role.delete('Emergency Nuke Protocol initiated by Admin');
                    deletedRoles++;
                    await delay(400); // 0.4s delay so Discord doesn't block the bot
                } catch (err) {
                    console.log(`[Nuke] Could not delete role ${role.name}: ${err.message}`);
                }
            }

            // 4. Send final confirmation
            const safeChannel = interaction.guild.channels.cache.get(interaction.channel.id);
            if (safeChannel) {
                const finishEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('☢️ Server Nuke Complete')
                    .setDescription(`The threat has been neutralized. Successfully wiped:\n\n` +
                                    `🧨 **${deletedChannels} Channels**\n` +
                                    `🧨 **${deletedRoles} Roles**`);
                
                await safeChannel.send({ embeds: [finishEmbed] });
            }

        } catch (e) {
            // If they don't click anything for 30 seconds, cancel it automatically
            await interaction.editReply({ content: '⚠️ Command timed out. Nuke aborted.', embeds: [], components: [] });
        }
    }
};
