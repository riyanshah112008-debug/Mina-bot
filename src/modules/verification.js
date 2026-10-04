const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const crypto = require('crypto');
const { getPublicUrl } = require('../utils/tunnelManager');

/**
 * Resolves the target role to grant on successful verification.
 * Checks roleId, ServerSettings database configuration, or role named 'Verified'/'Member'.
 */
async function resolveTargetRole(guild, roleId) {
    if (!guild) return null;

    // 1. Direct role lookup if valid snowflake
    if (roleId && roleId !== 'active' && /^\d{17,20}$/.test(roleId)) {
        const directRole = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
        if (directRole) return directRole;
    }

    // 2. Check ServerSettings database configuration (only if MongoDB connection is open)
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection && mongoose.connection.readyState === 1) {
            const ServerSettings = require('../models/ServerSettings');
            const settings = await ServerSettings.findOne({ guildId: String(guild.id) }).lean();
            const configuredId = settings?.verification?.roleId || settings?.verifiedRoleId;
            if (configuredId && /^\d{17,20}$/.test(configuredId)) {
                const role = guild.roles.cache.get(configuredId) || await guild.roles.fetch(configuredId).catch(() => null);
                if (role) return role;
            }
        }
    } catch (e) {}

    // 3. Guild role named 'Verified' or 'Member'
    const namedRole = guild.roles.cache.find(r => {
        const name = r.name.toLowerCase();
        return name === 'verified' || name === 'member' || name === 'members' || name === 'human';
    });
    if (namedRole) return namedRole;

    return null;
}

module.exports = (client) => {
    if (!client.verifyMap) {
        client.verifyMap = new Map();
    }

    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isButton()) return;

        // ----------------------------------------------------
        // 1. INITIAL VERIFICATION PANEL CLICK
        // Handles: `verify_role_<roleId>` and `verify_human_btn`
        // ----------------------------------------------------
        if (interaction.customId.startsWith('verify_role_') || interaction.customId === 'verify_human_btn') {
            try {
                let requestedRoleId = 'active';
                if (interaction.customId.startsWith('verify_role_')) {
                    requestedRoleId = interaction.customId.replace('verify_role_', '').trim();
                }

                const targetRole = await resolveTargetRole(interaction.guild, requestedRoleId);

                if (targetRole && interaction.member.roles.cache.has(targetRole.id)) {
                    return interaction.reply({
                        content: `✅ You already have the **${targetRole.name}** role and are fully verified!`,
                        ephemeral: true
                    });
                }

                // Generate a secure, unique 32-character hex token
                const token = crypto.randomBytes(16).toString('hex');
                const effectiveRoleId = targetRole ? targetRole.id : requestedRoleId;

                // Save to bot verifyMap
                client.verifyMap.set(token, {
                    userId: interaction.user.id,
                    guildId: interaction.guild.id,
                    roleId: effectiveRoleId
                });

                // Auto-expire after 15 minutes
                setTimeout(() => {
                    if (client.verifyMap.has(token)) {
                        client.verifyMap.delete(token);
                    }
                }, 15 * 60 * 1000);

                // Build public verification URL
                const baseUrl = getPublicUrl();
                const verifyUrl = `${baseUrl}/verify?token=${token}`;

                // Row with Dual-Path: Instant Discord Verification + Public Web Portal
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`verify_direct_${effectiveRoleId}_${token}`)
                        .setLabel('⚡ Verify in Discord (Instant)')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setLabel('🌐 Verify on Website')
                        .setStyle(ButtonStyle.Link)
                        .setURL(verifyUrl)
                );

                const embed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('🛡️ Server Human Verification Portal')
                    .setDescription(
                        `Welcome to **${interaction.guild.name}**!\n\n` +
                        `To protect the server from automated raid bots, please choose your verification method:\n\n` +
                        `• **⚡ Option 1 (Recommended — 100% Guaranteed Public Access):**\n` +
                        `Click **"⚡ Verify in Discord (Instant)"** below to verify immediately right inside Discord. **No browser, no VPN, and no website connection required!**\n\n` +
                        `• **🌐 Option 2 (Web Portal):**\n` +
                        `Click **"🌐 Verify on Website"** to verify via our secure browser portal.\n\n` +
                        `*(Note: If your ISP or mobile network blocks Render or gives \`ERR_CONNECTION_REFUSED\`, use Option 1 above!)*`
                    )
                    .setFooter({
                        text: 'Starry Security Shield • Link expires in 15 mins',
                        iconURL: client.user ? client.user.displayAvatarURL() : undefined
                    });

                return interaction.reply({
                    embeds: [embed],
                    components: [row],
                    ephemeral: true
                });
            } catch (err) {
                console.error('Verification Initialization Error:', err);
                if (!interaction.replied && !interaction.deferred) {
                    return interaction.reply({
                        content: `❌ Verification error: ${err.message || 'Unknown error'}. Please alert an admin.`,
                        ephemeral: true
                    }).catch(() => {});
                }
            }
        }

        // ----------------------------------------------------
        // 2. INSTANT DIRECT IN-DISCORD VERIFICATION
        // Handles: `verify_direct_<roleId>_<token>`
        // ----------------------------------------------------
        if (interaction.customId.startsWith('verify_direct_')) {
            try {
                const parts = interaction.customId.split('_');
                const roleId = parts[2];
                const token = parts[3];

                const targetRole = await resolveTargetRole(interaction.guild, roleId);
                if (!targetRole) {
                    return interaction.reply({
                        content: '⚠️ The verification role is not configured or could not be found. Please contact a server administrator.',
                        ephemeral: true
                    });
                }

                if (interaction.member.roles.cache.has(targetRole.id)) {
                    return interaction.reply({
                        content: `✅ You are already verified with the **${targetRole.name}** role!`,
                        ephemeral: true
                    });
                }

                const botMember = interaction.guild.members.me || await interaction.guild.members.fetch(client.user.id).catch(() => null);
                if (!botMember) {
                    return interaction.reply({
                        content: '❌ Internal error resolving bot server membership.',
                        ephemeral: true
                    });
                }

                if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    return interaction.reply({
                        content: '❌ **Bot Permission Error:** I need the `Manage Roles` permission to assign roles. Please ask a server admin to grant it.',
                        ephemeral: true
                    });
                }

                if (targetRole.position >= botMember.roles.highest.position) {
                    return interaction.reply({
                        content: `⚠️ **Role Hierarchy Error:** The role **${targetRole.name}** is higher than or equal to my highest role. A server admin must drag my bot role above **${targetRole.name}** in Server Settings → Roles.`,
                        ephemeral: true
                    });
                }

                // Assign the verified role
                await interaction.member.roles.add(targetRole, 'Starry Instant Human Verification');

                // Cleanup token from verifyMap
                if (token && client.verifyMap) {
                    client.verifyMap.delete(token);
                }

                await interaction.reply({
                    content: `🎉 **Verification Complete!** You have been granted the **${targetRole.name}** role and unlocked full access to **${interaction.guild.name}**. Welcome!`,
                    ephemeral: true
                });

                // Telemetry audit notification
                try {
                    const chamberCh = interaction.guild.channels.cache.find(c => 
                        c.name === 'verification-chamber' || c.name === 'audit-log' || c.name === 'mod-logs'
                    );
                    if (chamberCh && chamberCh.isTextBased()) {
                        const logEmbed = new EmbedBuilder()
                            .setColor('#2ecc71')
                            .setTitle('🟢 Member Human Verification Complete')
                            .setDescription(`**User Verified:** <@${interaction.user.id}> (\`${interaction.user.tag}\`) passed human verification via Instant Discord Gateway.`)
                            .setTimestamp();
                        chamberCh.send({ embeds: [logEmbed] }).catch(() => {});
                    }
                } catch (logErr) {}

            } catch (err) {
                console.error('Direct In-Discord Verification Error:', err);
                if (!interaction.replied && !interaction.deferred) {
                    return interaction.reply({
                        content: `❌ **Failed to assign role:** \`${err.message || 'Unknown error'}\`. Ensure the bot role is above the verification role in Server Settings.`,
                        ephemeral: true
                    }).catch(() => {});
                }
            }
        }
    });
};

module.exports.resolveTargetRole = resolveTargetRole;
