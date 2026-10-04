// ==========================================
// 🎭 STARRY SUPREME AUTOROLE & STICKY ROLES MODULE
// File Path: modules/autorole.js
// ==========================================

const { PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { AutoroleConfig, StickyRole } = require('../models/AutoroleSchema');

const EPHEMERAL_FLAG = MessageFlags.Ephemeral || 6;

module.exports = (client) => {
    // ==========================================
    // 1. AUTOMATIC BACKGROUND BACKUP (ON LEAVE)
    // ==========================================
    client.on('guildMemberRemove', async (member) => {
        if (!member.guild || member.user.bot) return;

        try {
            const config = await AutoroleConfig.findOne({ guildId: member.guild.id }).lean();
            if (config && config.stickyRolesEnabled === false) return;

            const roleIds = member.roles.cache
                .filter(role => role.id !== member.guild.id && !role.managed)
                .map(role => role.id);

            if (roleIds.length === 0) return;

            await StickyRole.findOneAndUpdate(
                { guildId: member.guild.id, userId: member.user.id },
                { roles: roleIds },
                { upsert: true }
            );
        } catch (error) {
            console.error(`❌ Sticky Role Auto-Save Error (${member.guild.id}):`, error.message);
        }
    });

    // ==========================================
    // 2. AUTOMATIC RESTORE & ASSIGN (ON JOIN)
    // ==========================================
    client.on('guildMemberAdd', async (member) => {
        if (!member.guild || member.user.bot) return;

        try {
            const botMember = member.guild.members.me || await member.guild.members.fetch(client.user.id).catch(() => null);
            if (!botMember || !botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;

            const config = await AutoroleConfig.findOne({ guildId: member.guild.id }).lean();
            let rolesToApply = [];
            const botHighestRolePosition = botMember.roles.highest.position;

            // Restore Sticky Roles
            if (!config || config.stickyRolesEnabled !== false) {
                const previousData = await StickyRole.findOne({ guildId: member.guild.id, userId: member.user.id }).lean();

                if (previousData && previousData.roles && previousData.roles.length > 0) {
                    const validStickyRoles = previousData.roles.filter(roleId => {
                        const role = member.guild.roles.cache.get(roleId);
                        return role && role.position < botHighestRolePosition && !role.managed;
                    });
                    rolesToApply.push(...validStickyRoles);
                }
            }

            // Assign Default Autoroles
            if (config && config.roleIds && config.roleIds.length > 0) {
                for (const rId of config.roleIds) {
                    const autoRole = member.guild.roles.cache.get(rId);
                    if (autoRole && autoRole.position < botHighestRolePosition && !rolesToApply.includes(rId)) {
                        rolesToApply.push(rId);
                    }
                }
            }

            // Execute Role Application
            if (rolesToApply.length > 0) {
                await member.roles.add(rolesToApply, "Starry Automod: Restored previous roles & assigned default roles").catch(() => {});
            }

        } catch (error) {
            console.error(`❌ Role Assign Error (${member.guild.id}):`, error.message);
        }
    });

    // ==========================================
    // 3. ADMIN SETUP COMMAND & DASHBOARD
    // ==========================================
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.guild || !interaction.isChatInputCommand() || interaction.commandName !== 'autorole') return;

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ You need **Administrator** permissions to manage Autoroles.', flags: [EPHEMERAL_FLAG] });
        }

        const botMember = interaction.guild.members.me;
        if (!botMember || !botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: '❌ I need **Manage Roles** permission to configure and assign roles.', flags: [EPHEMERAL_FLAG] });
        }

        let config = await AutoroleConfig.findOne({ guildId: interaction.guild.id });
        if (!config) config = new AutoroleConfig({ guildId: interaction.guild.id, roleIds: [], stickyRolesEnabled: true });

        const stickyOption = interaction.options.getBoolean('sticky_roles');
        const clearOption = interaction.options.getBoolean('clear_all');

        // Handle Clear Option
        if (clearOption === true) {
            config.roleIds = [];
            await config.save();
            return interaction.reply({ content: '🧹 Successfully cleared all configured autoroles!', flags: [EPHEMERAL_FLAG] });
        }

        let rolesAdded = 0;
        const invalidRoles = [];
        const botHighestRolePosition = botMember.roles.highest.position;

        // Process role options (role1 to role24)
        for (let i = 1; i <= 24; i++) {
            const role = interaction.options.getRole(`role${i}`);

            if (role) {
                if (role.position >= botHighestRolePosition || role.id === interaction.guild.id) {
                    invalidRoles.push(role.name);
                } else if (!config.roleIds.includes(role.id)) {
                    if (config.roleIds.length >= 25) {
                        break; 
                    }
                    config.roleIds.push(role.id);
                    rolesAdded++;
                }
            }
        }

        if (stickyOption !== null) {
            config.stickyRolesEnabled = stickyOption;
        }

        await config.save();

        // Build Response Dashboard
        const configuredRolesList = config.roleIds
            .map(id => interaction.guild.roles.cache.get(id))
            .filter(Boolean)
            .map(r => `<@&${r.id}>`)
            .join(', ');

        const dashboardEmbed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setAuthor({ name: `${interaction.guild.name} | Autorole System`, iconURL: interaction.guild.iconURL({ dynamic: true }) })
            .setTitle('🎭 Autorole Configuration Status')
            .addFields(
                { name: '📌 Sticky Roles', value: config.stickyRolesEnabled ? '`ENABLED 🟢`' : '`DISABLED 🔴`', inline: true },
                { name: '📊 Configured Roles', value: `\`${config.roleIds.length}/25 Roles\``, inline: true },
                { name: '📜 Active Autoroles', value: configuredRolesList || '*No default autoroles configured.*', inline: false }
            )
            .setFooter({ text: 'Members joining will automatically receive these roles.', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        let responseText = "";
        if (rolesAdded > 0) responseText += `✅ Added **${rolesAdded}** new role(s) to autorole!\n`;
        if (invalidRoles.length > 0) responseText += `⚠️ Skipped higher/invalid roles: ${invalidRoles.join(', ')}\n`;
        if (stickyOption !== null) responseText += `✅ Sticky roles set to **${stickyOption ? 'Enabled' : 'Disabled'}**.\n`;

        return interaction.reply({ 
            content: responseText.trim() || undefined, 
            embeds: [dashboardEmbed], 
            flags: [EPHEMERAL_FLAG] 
        });
    });
};
