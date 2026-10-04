// ==========================================
// 1. IMPORTS & SLASH COMMAND SCHEMA
// ==========================================
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    PermissionFlagsBits 
} = require('discord.js');

const BOT_OWNERS = ['1465049039153135639', '1257676837249617971'];
if (process.env.OWNER_ID && !BOT_OWNERS.includes(process.env.OWNER_ID)) {
    BOT_OWNERS.push(process.env.OWNER_ID);
}

const modPanelCommand = new SlashCommandBuilder()
    .setName('modpanel')
    .setDescription('Open an interactive Moderation Control Panel for a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('The user to moderate').setRequired(true));

// Helper: Duration Parser (e.g. 10m, 1h, 1d)
function parseDurationMs(str) {
    if (!str) return 10 * 60 * 1000; // Default 10 mins
    const match = str.trim().match(/^(\d+)\s*([smhd])?$/i);
    if (!match) return 10 * 60 * 1000;
    const amount = parseInt(match[1]);
    const unit = (match[2] || 'm').toLowerCase();
    if (unit === 's') return amount * 1000;
    if (unit === 'm') return amount * 60 * 1000;
    if (unit === 'h') return amount * 60 * 60 * 1000;
    if (unit === 'd') return amount * 24 * 60 * 60 * 1000;
    return 10 * 60 * 1000;
}

// ==========================================
// 2. MAIN MOD PANEL MODULE
// ==========================================
const modPanelModule = (client) => {

    if (client.commands && typeof client.commands.set === 'function') {
        client.commands.set('modpanel', { data: modPanelCommand, execute: handleModPanelCommand });
    }

    // --- Command Handler ---
    async function handleModPanelCommand(interaction) {
        const { member, options, user, guild } = interaction;
        const isOwner = BOT_OWNERS.includes(user.id);

        if (!isOwner && !member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ content: '❌ Access Denied: You do not have permission to open the mod panel.', ephemeral: true });
        }

        const targetUser = options.getUser('user', true);
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        const botMember = guild.members.me;

        // Role Hierarchy Check
        if (targetMember) {
            if (targetMember.id === guild.ownerId) {
                return interaction.reply({ content: '❌ Cannot open moderation panel for the **Server Owner**!', ephemeral: true });
            }
            if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
                return interaction.reply({ content: `❌ Cannot moderate **${targetUser.tag}** because their role position is equal to or higher than mine!`, ephemeral: true });
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🛡️ Moderation Control Center: ${targetUser.tag}`)
            .setDescription(`Select an enforcement action below to perform on <@${targetUser.id}>.\n\n*Clicking a button will prompt a pop-up window for inputting reasons and durations.*`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({ text: `Target ID: ${targetUser.id} • Starry Security Engine` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`modp_warn_${targetUser.id}`).setLabel('Warn').setStyle(ButtonStyle.Primary).setEmoji('⚠️'),
            new ButtonBuilder().setCustomId(`modp_timeout_${targetUser.id}`).setLabel('Timeout').setStyle(ButtonStyle.Secondary).setEmoji('⏱️'),
            new ButtonBuilder().setCustomId(`modp_kick_${targetUser.id}`).setLabel('Kick').setStyle(ButtonStyle.Danger).setEmoji('👢'),
            new ButtonBuilder().setCustomId(`modp_ban_${targetUser.id}`).setLabel('Ban').setStyle(ButtonStyle.Danger).setEmoji('🔨')
        );

        return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // --- Interactive Button & Modal Handlers ---
    client.on('interactionCreate', async (interaction) => {
        if (interaction.isChatInputCommand() && interaction.commandName === 'modpanel') {
            return handleModPanelCommand(interaction);
        }

        // 1. BUTTON CLICK -> OPEN MODAL
        if (interaction.isButton() && interaction.customId.startsWith('modp_')) {
            const [_, action, targetUserId] = interaction.customId.split('_');

            const modal = new ModalBuilder()
                .setCustomId(`modmodal_${action}_${targetUserId}`)
                .setTitle(`Enforce ${action.toUpperCase()}`);

            const reasonInput = new TextInputBuilder()
                .setCustomId('mod_reason')
                .setLabel('Reason for action')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Type the reason here...')
                .setRequired(false);

            const row1 = new ActionRowBuilder().addComponents(reasonInput);
            modal.addComponents(row1);

            if (action === 'timeout') {
                const durationInput = new TextInputBuilder()
                    .setCustomId('mod_duration')
                    .setLabel('Duration (e.g. 10m, 1h, 1d)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('10m')
                    .setRequired(true);
                const row2 = new ActionRowBuilder().addComponents(durationInput);
                modal.addComponents(row2);
            }

            return interaction.showModal(modal);
        }

        // 2. MODAL SUBMIT -> EXECUTE ACTION
        if (interaction.isModalSubmit() && interaction.customId.startsWith('modmodal_')) {
            await interaction.deferReply({ ephemeral: true });

            const [_, action, targetUserId] = interaction.customId.split('_');
            const reason = interaction.fields.getTextInputValue('mod_reason') || 'No reason provided by staff.';
            const guild = interaction.guild;
            const botMember = guild.members.me;

            const targetMember = await guild.members.fetch(targetUserId).catch(() => null);

            if (!targetMember && action !== 'ban') {
                return interaction.editReply({ content: '❌ Member is no longer in this server.' });
            }

            const caseId = Math.floor(Math.random() * 90000) + 10000;

            try {
                if (action === 'warn') {
                    if (typeof client.sendPremiumModDM === 'function') {
                        await client.sendPremiumModDM(targetMember, interaction.member, 'warn', reason, null, guild, caseId);
                    }
                    return interaction.editReply({ content: `⚠️ **Warned** <@${targetUserId}>!\n**Reason:** ${reason}` });
                }

                if (action === 'timeout') {
                    const durStr = interaction.fields.getTextInputValue('mod_duration');
                    const durationMs = parseDurationMs(durStr);

                    if (typeof client.sendPremiumModDM === 'function') {
                        await client.sendPremiumModDM(targetMember, interaction.member, 'timeout', reason, durStr, guild, caseId);
                    }
                    await targetMember.timeout(durationMs, `${reason} | By ${interaction.user.tag}`);
                    return interaction.editReply({ content: `⏱️ **Timed out** <@${targetUserId}> for \`${durStr}\`!\n**Reason:** ${reason}` });
                }

                if (action === 'kick') {
                    if (typeof client.sendPremiumModDM === 'function') {
                        await client.sendPremiumModDM(targetMember, interaction.member, 'kick', reason, null, guild, caseId);
                    }
                    await targetMember.kick(`${reason} | By ${interaction.user.tag}`);
                    return interaction.editReply({ content: `👢 **Kicked** <@${targetUserId}>!\n**Reason:** ${reason}` });
                }

                if (action === 'ban') {
                    if (targetMember && typeof client.sendPremiumModDM === 'function') {
                        await client.sendPremiumModDM(targetMember, interaction.member, 'ban', reason, 'Permanent', guild, caseId);
                    }
                    await guild.members.ban(targetUserId, { reason: `${reason} | By ${interaction.user.tag}` });
                    return interaction.editReply({ content: `🔨 **Banned** <@${targetUserId}>!\n**Reason:** ${reason}` });
                }
            } catch (err) {
                return interaction.editReply({ content: `❌ **Action Failed:** \`${err.message}\`` });
            }
        }
    });
};

modPanelModule.modPanelData = modPanelCommand;
module.exports = modPanelModule;
