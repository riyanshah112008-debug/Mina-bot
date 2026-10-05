const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = (client) => {
    const config = require('../config');
    const PREFIX = config.DEFAULT_PREFIX || ','; 

    // ==========================================
    // SECURITY HELPER: HIERARCHY CHECKER
    // ==========================================
    function checkHierarchy(executor, botMember, role, guild) {
        // 1. Check if the bot is high enough
        if (botMember.roles.highest.position <= role.position) {
            return '❌ I cannot manage a role that is higher than or equal to my highest role! Please drag my role higher in Server Settings.';
        }
        // 2. Check if the user is high enough (Server Owner and Bot Owner bypass this)
        if (executor.id !== guild.ownerId && executor.id !== process.env.OWNER_ID) {
            if (executor.roles.highest.position <= role.position) {
                return '❌ Security Block: You cannot manage a role that is higher than or equal to your own highest role.';
            }
        }
        return null; // Passed all security checks
    }

    // ==========================================
    // 1. SLASH COMMANDS (/role)
    // ==========================================
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand() || interaction.commandName !== 'role') return;

        const hasPerms = interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles);
        const botHasPerms = interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles);

        if (!hasPerms) return interaction.reply({ content: "❌ You need the `Manage Roles` permission to use this command.", ephemeral: true });
        if (!botHasPerms) return interaction.reply({ content: "❌ I need the `Manage Roles` permission to do this!", ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const embed = new EmbedBuilder().setColor('#2b2d31').setTimestamp();

        try {
            // --- CREATE ROLE ---
            if (subcommand === 'create') {
                const roleName = interaction.options.getString('name');
                const hexColor = interaction.options.getString('color') || '#99aab5'; // Default grey

                // Validate hex color
                if (hexColor !== '#99aab5' && !/^#[0-9A-F]{6}$/i.test(hexColor)) {
                    return interaction.reply({ content: "❌ Invalid color format. Please use a valid hex code (e.g., `#FF0000`).", ephemeral: true });
                }

                const newRole = await interaction.guild.roles.create({
                    name: roleName,
                    color: hexColor,
                    reason: `Created via slash command by ${interaction.user.tag}`
                });

                embed.setColor(hexColor).setDescription(`✅ Successfully created the role <@&${newRole.id}>!`);
                return interaction.reply({ embeds: [embed] });
            }

            // --- DELETE ROLE ---
            if (subcommand === 'delete') {
                const role = interaction.options.getRole('role');
                const roleName = role.name;

                const securityBlock = checkHierarchy(interaction.member, interaction.guild.members.me, role, interaction.guild);
                if (securityBlock) return interaction.reply({ content: securityBlock, ephemeral: true });

                await role.delete(`Deleted by ${interaction.user.tag}`);
                embed.setColor('#ED4245').setDescription(`🗑️ Successfully deleted the role **${roleName}**.`);
                return interaction.reply({ embeds: [embed] });
            }

            // --- GIVE ROLE ---
            if (subcommand === 'give') {
                const target = interaction.options.getMember('user');
                const role = interaction.options.getRole('role');

                if (!target) return interaction.reply({ content: "❌ Could not find that user in the server.", ephemeral: true });

                const securityBlock = checkHierarchy(interaction.member, interaction.guild.members.me, role, interaction.guild);
                if (securityBlock) return interaction.reply({ content: securityBlock, ephemeral: true });

                if (target.roles.cache.has(role.id)) {
                    return interaction.reply({ content: `⚠️ <@${target.id}> already has the <@&${role.id}> role.`, ephemeral: true });
                }

                await target.roles.add(role);
                embed.setColor('#57F287').setDescription(`✅ Successfully gave <@&${role.id}> to <@${target.id}>.`);
                return interaction.reply({ embeds: [embed] });
            }

            // --- REMOVE ROLE ---
            if (subcommand === 'remove') {
                const target = interaction.options.getMember('user');
                const role = interaction.options.getRole('role');

                if (!target) return interaction.reply({ content: "❌ Could not find that user in the server.", ephemeral: true });

                const securityBlock = checkHierarchy(interaction.member, interaction.guild.members.me, role, interaction.guild);
                if (securityBlock) return interaction.reply({ content: securityBlock, ephemeral: true });

                if (!target.roles.cache.has(role.id)) {
                    return interaction.reply({ content: `⚠️ <@${target.id}> does not have the <@&${role.id}> role.`, ephemeral: true });
                }

                await target.roles.remove(role);
                embed.setColor('#ED4245').setDescription(`✅ Successfully removed <@&${role.id}> from <@${target.id}>.`);
                return interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Role Manager Error:', error);
            return interaction.reply({ content: "❌ An unexpected error occurred. Please try again.", ephemeral: true });
        }
    });

    // ==========================================
    // 2. PREFIX COMMANDS (.createrole, .giverole, etc.)
    // ==========================================
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild) return;
        const { getGuildPrefix } = require('./commandHandler');
        const activePrefix = await getGuildPrefix(message.guild.id);
        if (!activePrefix || !message.content.startsWith(activePrefix)) return;

        const prefixLen = activePrefix.length;
        const args = message.content.slice(prefixLen).trim().split(/ +/);
        const command = args.shift()?.toLowerCase();

        const roleCommands = ['createrole', 'deleterole', 'giverole', 'removerole'];
        if (!roleCommands.includes(command)) return;
        if (!config.isBotOwner(message.author.id, client)) return;

        const hasPerms = message.member.permissions.has(PermissionsBitField.Flags.ManageRoles);
        const botHasPerms = message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles);

        if (!hasPerms) return message.reply("❌ You need the `Manage Roles` permission to use this command.");
        if (!botHasPerms) return message.reply("❌ I need the `Manage Roles` permission to do this! Check my role settings.");

        const embed = new EmbedBuilder().setColor('#2b2d31');

        try {
            // --- CREATE ROLE ---
            if (command === 'createrole') {
                if (args.length < 1) return message.reply("🔹 **Usage:** `.createrole <Role Name> [HexColor]`\n*Example: `.createrole VIP #ffD700`*");
                
                let color = '#99aab5'; 
                let roleName = args.join(' ');
                
                const lastArg = args[args.length - 1];
                if (/^#[0-9A-F]{6}$/i.test(lastArg)) {
                    color = lastArg;
                    roleName = args.slice(0, -1).join(' ');
                }

                const newRole = await message.guild.roles.create({ name: roleName, color: color, reason: `Created by ${message.author.tag}` });
                embed.setColor(color).setDescription(`✅ Successfully created the role <@&${newRole.id}>!`);
                return message.reply({ embeds: [embed] });
            }

            // --- DELETE ROLE ---
            if (command === 'deleterole') {
                if (args.length < 1) return message.reply("🔹 **Usage:** `.deleterole <@Role or ID>`");
                
                const roleId = args[0].replace(/[<@&>]/g, '');
                const role = message.guild.roles.cache.get(roleId);
                if (!role) return message.reply("❌ Could not find that role. Mention it or use the ID.");
                
                const securityBlock = checkHierarchy(message.member, message.guild.members.me, role, message.guild);
                if (securityBlock) return message.reply(securityBlock);

                const roleName = role.name;
                await role.delete(`Deleted by ${message.author.tag}`);
                embed.setColor('#ED4245').setDescription(`🗑️ Successfully deleted the role **${roleName}**.`);
                return message.reply({ embeds: [embed] });
            }

            // --- GIVE ROLE ---
            if (command === 'giverole') {
                if (args.length < 2) return message.reply("🔹 **Usage:** `.giverole <@User> <@Role>`");

                const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null);
                if (!targetMember) return message.reply("❌ Could not find that user.");

                const roleId = args[1].replace(/[<@&>]/g, '');
                const role = message.guild.roles.cache.get(roleId);
                if (!role) return message.reply("❌ Could not find that role.");

                const securityBlock = checkHierarchy(message.member, message.guild.members.me, role, message.guild);
                if (securityBlock) return message.reply(securityBlock);

                if (targetMember.roles.cache.has(role.id)) return message.reply(`⚠️ <@${targetMember.id}> already has the <@&${role.id}> role.`);

                await targetMember.roles.add(role);
                embed.setColor('#57F287').setDescription(`✅ Successfully gave <@&${role.id}> to <@${targetMember.id}>.`);
                return message.reply({ embeds: [embed] });
            }

            // --- REMOVE ROLE ---
            if (command === 'removerole') {
                if (args.length < 2) return message.reply("🔹 **Usage:** `.removerole <@User> <@Role>`");

                const targetMember = message.mentions.members.first() || await message.guild.members.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null);
                if (!targetMember) return message.reply("❌ Could not find that user.");

                const roleId = args[1].replace(/[<@&>]/g, '');
                const role = message.guild.roles.cache.get(roleId);
                if (!role) return message.reply("❌ Could not find that role.");

                const securityBlock = checkHierarchy(message.member, message.guild.members.me, role, message.guild);
                if (securityBlock) return message.reply(securityBlock);

                if (!targetMember.roles.cache.has(role.id)) return message.reply(`⚠️ <@${targetMember.id}> does not have the <@&${role.id}> role.`);

                await targetMember.roles.remove(role);
                embed.setColor('#ED4245').setDescription(`✅ Successfully removed <@&${role.id}> from <@${targetMember.id}>.`);
                return message.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Role Manager Error:', error);
            message.reply("❌ An error occurred. Ensure my role is dragged higher in the server settings than the roles you are trying to manage.");
        }
    });
};
            
