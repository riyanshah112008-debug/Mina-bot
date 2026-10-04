const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits,
    ChannelType,
    MessageFlags
} = require('discord.js');

const EPHEMERAL_FLAG = MessageFlags.Ephemeral || 6;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify-setup')
        .setDescription('Set up the server verification panel (Admins Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to send the verification panel')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('The role to give users when they verify')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        try {
            await interaction.deferReply({ flags: [EPHEMERAL_FLAG] }).catch(() => {});

            const { isServerOrUserPremium, createPremiumLockPayload } = require('../../utils/premiumHelper');
            const isPrem = await isServerOrUserPremium(interaction.guildId, interaction.user.id, client);
            if (!isPrem) {
                const payload = createPremiumLockPayload('Web Captcha Anti-Bot Verification Gateway', '/');
                return interaction.editReply(payload);
            }

            const channel = interaction.options.getChannel('channel');
            const role = interaction.options.getRole('role');

            const botMember = interaction.guild.members.me;

            // Permission Check
            const permissions = channel.permissionsFor(botMember);
            if (!permissions?.has(PermissionFlagsBits.SendMessages) || !permissions?.has(PermissionFlagsBits.EmbedLinks)) {
                return interaction.editReply({ content: `❌ I do not have permission to send messages and embeds in ${channel}!` });
            }

            // Role Hierarchy Check
            if (role.position >= botMember.roles.highest.position) {
                return interaction.editReply({ content: `⚠️ The role ${role} is higher than or equal to my highest role! Please move my bot role higher so I can assign it.` });
            }

            const embed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle('✅ Server Verification')
                .setDescription('Welcome! To protect this server from automated accounts, we require web verification.\n\nClick the button below to generate your secure verification link.')
                .setFooter({ text: 'Starry Security Protocol', iconURL: client.user.displayAvatarURL() });

            const button = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`verify_role_${role.id}`) 
                    .setLabel('Get Verification Link')
                    .setEmoji('🛡️')
                    .setStyle(ButtonStyle.Primary)
            );

            await channel.send({ embeds: [embed], components: [button] });
            return interaction.editReply({ content: `✅ Verification panel successfully set up in ${channel} for role ${role}!` });

        } catch (error) {
            console.error('🔴 verify-setup Error:', error);
            const content = `❌ **Verification Setup Error:** \`${error.message || 'Unknown error'}\``;
            if (interaction.deferred) {
                await interaction.editReply({ content }).catch(() => {});
            } else {
                await interaction.reply({ content, flags: [EPHEMERAL_FLAG] }).catch(() => {});
            }
        }
    }
};
