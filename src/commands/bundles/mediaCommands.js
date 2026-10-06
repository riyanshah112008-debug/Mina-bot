// ==========================================
// 📸 PIC & GIF PERMISSIONS COMMAND BUNDLE
// File Path: src/commands/bundles/mediaCommands.js
// Provides commands and interactive panels for Pic & GIF Perms
// ==========================================

const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    MessageFlags 
} = require('discord.js');
const { engine: mediaPermsEngine } = require('../../modules/mediaPermsEngine');
const config = require('../../config');
const { ONE_YEAR_MS, EPHEMERAL_FLAG } = require('../../utils/contextHelper');

/**
 * Generate the interactive dashboard embed and action row for Pic & GIF Perms
 * @param {import('discord.js').Guild} guild 
 * @param {Object} settings 
 */
async function buildMediaPermsDashboard(guild, settings) {
    const role = settings.roleId ? guild.roles.cache.get(settings.roleId) : null;
    const roleDisplay = role ? `<@&${role.id}> (\`${role.name}\`)` : '*None configured (will auto-create on demand)*';

    const vanityDisplay = settings.inviteUrl && settings.inviteUrl.trim().length > 0 
        ? `\`${settings.inviteUrl}\`` 
        : (guild.vanityURLCode ? `\`discord.gg/${guild.vanityURLCode}\` *(Server Vanity)*` : '*Auto-Detecting Server Invites*');

    const onlineReqDisplay = settings.allowIdleDnd 
        ? '🟢 Any Active Status (`online`, `idle`, `dnd`)' 
        : '🟢 Strict Online Only (`online`)';

    // Count statistics
    let totalWithRole = 0;
    let boostersWithRole = 0;
    let supportersWithRole = 0;

    if (role) {
        const membersWithRole = guild.members.cache.filter(m => !m.user.bot && m.roles.cache.has(role.id));
        totalWithRole = membersWithRole.size;

        for (const m of membersWithRole.values()) {
            const isBooster = Boolean(m.premiumSince) || Boolean(
                m.roles?.cache && (
                    typeof m.roles.cache.some === 'function' 
                        ? m.roles.cache.some(r => r.name?.toLowerCase().includes('server booster')) 
                        : Array.from(m.roles.cache.values()).some(r => r.name?.toLowerCase().includes('server booster'))
                )
            );
            if (isBooster) boostersWithRole++;
            else supportersWithRole++;
        }
    }

    const embed = new EmbedBuilder()
        .setColor(settings.enabled ? '#A29BFE' : '#95A5A6')
        .setAuthor({ name: `${guild.name} • Media & Image Perks`, iconURL: guild.iconURL({ dynamic: true }) })
        .setTitle('📸 Pic & GIF Permissions Engine')
        .setDescription(
            `Reward members who support **${guild.name}** with **Pic and GIF Permissions** (\`AttachFiles\` & \`EmbedLinks\`)!\n\n` +
            `• **Invite in Status:** Members who put the server invite link in their status and are **online** automatically get pic perms.\n` +
            `• **Server Boosters:** Active server boosters automatically receive pic perms unconditionally.`
        )
        .addFields(
            { 
                name: '⚙️ System Status', 
                value: settings.enabled ? '`🟢 ACTIVE & MONITORING`' : '`🔴 DISABLED`', 
                inline: true 
            },
            { 
                name: '🎭 Reward Role', 
                value: roleDisplay, 
                inline: true 
            },
            { 
                name: '🔗 Invite Required in Status', 
                value: vanityDisplay, 
                inline: false 
            },
            { 
                name: '📶 Online Requirement', 
                value: onlineReqDisplay, 
                inline: true 
            },
            { 
                name: '🚀 Booster Auto-Perk', 
                value: settings.boosterPerk ? '`✅ Enabled` *(Boosters get perms)*' : '`❌ Disabled`', 
                inline: true 
            },
            {
                name: '📊 Active Perk Holders',
                value: `• **Total Members Holding Role:** \`${totalWithRole}\`\n• **Server Boosters:** \`${boostersWithRole}\`\n• **Status Supporters:** \`${supportersWithRole}\``,
                inline: false
            }
        )
        .setFooter({ text: 'Mina & Starry Media Engine • Instant Gateway Sync' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('picperms_btn_sync')
            .setLabel('Sync Members')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('picperms_btn_toggle')
            .setLabel(settings.enabled ? 'Disable System' : 'Enable System')
            .setEmoji(settings.enabled ? '⏸️' : '▶️')
            .setStyle(settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('picperms_btn_booster')
            .setLabel('Toggle Booster Perk')
            .setEmoji('🚀')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('picperms_btn_online')
            .setLabel(settings.allowIdleDnd ? 'Require Strict Online' : 'Allow Idle/DND')
            .setEmoji('🟢')
            .setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row] };
}

module.exports = [
    {
        name: 'picperms',
        aliases: ['mediaperms', 'gifperms', 'invitestatus', 'vanityrole', 'media'],
        category: 'Utility',
        description: 'Configure and monitor automatic Pic and GIF permissions for status supporters and server boosters.',
        usage: ',picperms [role|invite|toggle|boostertoggle|onlinetoggle|sync|check|setup] [value]',
        data: new SlashCommandBuilder()
            .setName('picperms')
            .setDescription('Manage automatic Pic & GIF perms for status supporters & boosters.')
            .addSubcommand(sub => 
                sub.setName('panel')
                    .setDescription('Display the interactive Pic & GIF perms control panel.')
            )
            .addSubcommand(sub => 
                sub.setName('role')
                    .setDescription('Set the role granted to members who qualify.')
                    .addRoleOption(opt => opt.setName('target_role').setDescription('Role to grant for media perms').setRequired(true))
            )
            .addSubcommand(sub => 
                sub.setName('invite')
                    .setDescription('Set the custom invite text or vanity URL required in member status.')
                    .addStringOption(opt => opt.setName('invite_link').setDescription('Invite link or vanity (e.g. discord.gg/starry)').setRequired(true))
            )
            .addSubcommand(sub => 
                sub.setName('toggle')
                    .setDescription('Enable or disable the Pic & GIF perms system.')
            )
            .addSubcommand(sub => 
                sub.setName('boostertoggle')
                    .setDescription('Toggle whether server boosters automatically get the role.')
            )
            .addSubcommand(sub => 
                sub.setName('onlinetoggle')
                    .setDescription('Toggle strict online vs allowing idle/dnd status.')
            )
            .addSubcommand(sub => 
                sub.setName('sync')
                    .setDescription('Force scan and synchronize perms for all members now.')
            )
            .addSubcommand(sub => 
                sub.setName('check')
                    .setDescription('Check eligibility details for yourself or another user.')
                    .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(false))
            )
            .addSubcommand(sub => 
                sub.setName('setup')
                    .setDescription('Automatically create the Pic & GIF Perms role if it does not exist.')
            ),

        async execute(ctx) {
            if (!ctx.guild) {
                return ctx.reply('❌ This command can only be used inside a Discord server.');
            }

            const isSlash = ctx.isInteraction;
            const sub = isSlash ? ctx.options.getSubcommand() : (ctx.args[0]?.toLowerCase() || 'panel');
            const targetVal = isSlash ? null : ctx.args.slice(1).join(' ').trim();

            const isOwner = config.isBotOwner(ctx.user.id);
            const hasManagePerms = ctx.member?.permissions?.has(PermissionFlagsBits.ManageGuild) || 
                                   ctx.member?.permissions?.has(PermissionFlagsBits.Administrator) || 
                                   isOwner;

            // Non-admin command: "check"
            if (sub === 'check') {
                let targetUser = ctx.user;
                if (isSlash) {
                    targetUser = ctx.options.getUser('user') || ctx.user;
                } else if (ctx.message?.mentions?.users?.first()) {
                    targetUser = ctx.message.mentions.users.first();
                } else if (targetVal) {
                    targetUser = ctx.guild.members.cache.get(targetVal)?.user || ctx.user;
                }

                const targetMember = ctx.guild.members.cache.get(targetUser.id) || 
                    await ctx.guild.members.fetch(targetUser.id).catch(() => null);

                if (!targetMember) return ctx.reply('❌ Could not find that member in this server.');

                const check = await mediaPermsEngine.checkMemberEligibility(targetMember, targetMember.presence);
                const settings = await mediaPermsEngine.getGuildSettings(ctx.guild.id);
                const role = settings.roleId ? ctx.guild.roles.cache.get(settings.roleId) : null;
                const hasRole = role ? targetMember.roles.cache.has(role.id) : false;

                const checkEmbed = new EmbedBuilder()
                    .setColor(check.eligible ? '#2ECC71' : '#E74C3C')
                    .setAuthor({ name: targetMember.displayName, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
                    .setTitle('🔍 Pic & GIF Perms Eligibility Check')
                    .setDescription(
                        check.eligible 
                            ? `✅ **Eligible for Pic & GIF Perms!**` 
                            : `❌ **Not currently eligible for Pic & GIF Perms.**`
                    )
                    .addFields(
                        { 
                            name: '🚀 Booster Status', 
                            value: check.isBooster ? '`✅ Active Server Booster`' : '`❌ Not Boosting`', 
                            inline: true 
                        },
                        { 
                            name: '📶 Presence Status', 
                            value: `\`${check.status.toUpperCase()}\` ${check.isOnline ? '*(Qualifies as Online)*' : '*(Must be Online)*'}`, 
                            inline: true 
                        },
                        { 
                            name: '🔗 Invite in Status', 
                            value: check.hasInvite ? '`✅ Verified Server Invite`' : '`❌ No Server Invite Detected`', 
                            inline: true 
                        },
                        { 
                            name: '💬 Current Custom Status Text', 
                            value: check.statusText ? `>>> ${check.statusText}` : '*No custom status set*', 
                            inline: false 
                        },
                        { 
                            name: '🎭 Reward Role Equipped', 
                            value: hasRole ? `✅ Yes (${role.name})` : (role ? `❌ No (${role.name})` : '*No role configured*'), 
                            inline: false 
                        }
                    )
                    .setFooter({ text: 'To qualify: Put server invite link in your Discord custom status and stay online, or boost!' })
                    .setTimestamp();

                return ctx.reply({ embeds: [checkEmbed] });
            }

            // All remaining subcommands require ManageGuild / Admin permissions
            if (!hasManagePerms) {
                return ctx.reply('❌ You need the **Manage Server** or **Administrator** permission to configure Pic & GIF perms.');
            }

            const settings = await mediaPermsEngine.getGuildSettings(ctx.guild.id);

            // Subcommand: ROLE
            if (sub === 'role') {
                let roleToSet = null;
                if (isSlash) {
                    roleToSet = ctx.options.getRole('target_role');
                } else if (ctx.message?.mentions?.roles?.first()) {
                    roleToSet = ctx.message.mentions.roles.first();
                } else if (targetVal) {
                    roleToSet = ctx.guild.roles.cache.get(targetVal) || 
                                ctx.guild.roles.cache.find(r => r.name.toLowerCase() === targetVal.toLowerCase());
                }

                if (!roleToSet) {
                    return ctx.reply('❌ Please specify a valid role: `,picperms role @Role`');
                }

                await mediaPermsEngine.updateGuildSettings(ctx.guild.id, { roleId: roleToSet.id });
                return ctx.reply(`✅ Successfully set the Pic & GIF Perms reward role to **<@&${roleToSet.id}>**!`);
            }

            // Subcommand: INVITE
            if (sub === 'invite') {
                const inviteText = isSlash ? ctx.options.getString('invite_link') : targetVal;
                if (!inviteText) {
                    return ctx.reply('❌ Please specify an invite code or URL: `,picperms invite discord.gg/yourvanity`');
                }

                await mediaPermsEngine.updateGuildSettings(ctx.guild.id, { inviteUrl: inviteText });
                return ctx.reply(`✅ Updated required status invite link to: \`${inviteText}\`! Members with this link in status who are online will receive the role.`);
            }

            // Subcommand: TOGGLE
            if (sub === 'toggle') {
                const newState = !settings.enabled;
                await mediaPermsEngine.updateGuildSettings(ctx.guild.id, { enabled: newState });
                return ctx.reply(`✅ Pic & GIF Perms reward system is now **${newState ? 'ENABLED' : 'DISABLED'}**.`);
            }

            // Subcommand: BOOSTER TOGGLE
            if (sub === 'boostertoggle') {
                const newState = !settings.boosterPerk;
                await mediaPermsEngine.updateGuildSettings(ctx.guild.id, { boosterPerk: newState });
                return ctx.reply(`✅ Server Booster automatic perk is now **${newState ? 'ENABLED' : 'DISABLED'}**.`);
            }

            // Subcommand: ONLINE TOGGLE
            if (sub === 'onlinetoggle') {
                const newState = !settings.allowIdleDnd;
                await mediaPermsEngine.updateGuildSettings(ctx.guild.id, { allowIdleDnd: newState });
                return ctx.reply(`✅ Online status requirement updated: **${newState ? 'Allowing Idle & DND' : 'Strict Online Only'}**.`);
            }

            // Subcommand: SYNC
            if (sub === 'sync') {
                const tempMsg = await ctx.reply('🔄 Scanning and reconciling all members in the server...');
                const result = await mediaPermsEngine.syncGuild(ctx.guild);
                const replyText = `✅ **Reconciliation Complete!**\n• Members scanned: \`${result.total}\`\n• Roles granted: \`${result.granted}\`\n• Roles revoked: \`${result.revoked}\``;
                return isSlash ? ctx.editReply(replyText) : tempMsg.edit(replyText);
            }

            // Subcommand: SETUP (Auto-create role)
            if (sub === 'setup') {
                const role = await mediaPermsEngine.resolveOrCreatePermsRole(ctx.guild, settings);
                if (role) {
                    return ctx.reply(`✅ Pic & GIF Perms role is ready: **<@&${role.id}>**! It has \`AttachFiles\` and \`EmbedLinks\` granted.`);
                } else {
                    return ctx.reply('❌ Could not create role. Ensure Mina has the **Manage Roles** permission and is placed higher in the role hierarchy.');
                }
            }

            // Default: PANEL
            const dashboard = await buildMediaPermsDashboard(ctx.guild, settings);
            const msg = await ctx.reply(dashboard);

            // Attach interactive collector for buttons
            const collectorMessage = isSlash ? await ctx.fetchReply() : msg;
            if (!collectorMessage) return;

            const collector = collectorMessage.createMessageComponentCollector({
                time: ONE_YEAR_MS
            });

            collector.on('collect', async (interaction) => {
                try {
                    const isUserAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild) ||
                                        interaction.member?.permissions?.has(PermissionFlagsBits.Administrator) ||
                                        config.isBotOwner(interaction.user.id);

                    if (!isUserAdmin) {
                        return interaction.reply({ content: '❌ You need **Manage Server** permissions to use these buttons.', flags: [EPHEMERAL_FLAG] });
                    }

                    const current = await mediaPermsEngine.getGuildSettings(ctx.guild.id);

                    if (interaction.customId === 'picperms_btn_sync') {
                        await interaction.deferUpdate();
                        await mediaPermsEngine.syncGuild(ctx.guild);
                        const updated = await buildMediaPermsDashboard(ctx.guild, current);
                        await interaction.editReply(updated);
                    } else if (interaction.customId === 'picperms_btn_toggle') {
                        await interaction.deferUpdate();
                        const updatedSettings = await mediaPermsEngine.updateGuildSettings(ctx.guild.id, { enabled: !current.enabled });
                        const updated = await buildMediaPermsDashboard(ctx.guild, updatedSettings);
                        await interaction.editReply(updated);
                    } else if (interaction.customId === 'picperms_btn_booster') {
                        await interaction.deferUpdate();
                        const updatedSettings = await mediaPermsEngine.updateGuildSettings(ctx.guild.id, { boosterPerk: !current.boosterPerk });
                        const updated = await buildMediaPermsDashboard(ctx.guild, updatedSettings);
                        await interaction.editReply(updated);
                    } else if (interaction.customId === 'picperms_btn_online') {
                        await interaction.deferUpdate();
                        const updatedSettings = await mediaPermsEngine.updateGuildSettings(ctx.guild.id, { allowIdleDnd: !current.allowIdleDnd });
                        const updated = await buildMediaPermsDashboard(ctx.guild, updatedSettings);
                        await interaction.editReply(updated);
                    }
                } catch (err) {
                    console.error('[MediaPerms] Collector button error:', err);
                }
            });
        }
    }
];
