// ==========================================
// 🚀 STARRY BOOSTER SYNERGY COMMAND SUITE
// File Path: src/commands/bundles/boosterCommands.js
// Custom Vanity Booster Roles & Viral Shared Friend Delegation
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits,
    Colors
} = require('discord.js');
const config = require('../../config');
const BoosterRole = require('../../models/BoosterRole');
const ServerSettings = require('../../models/ServerSettings');
const { engine: boosterEngine } = require('../../modules/boosterRoleEngine');

// Helper to validate and parse 3 or 6 digit hex color
function parseHexColor(colorStr) {
    if (!colorStr) return null;
    let clean = colorStr.trim().replace(/^#/, '');
    if (clean.length === 3) {
        clean = clean.split('').map(c => c + c).join('');
    }
    if (/^[0-9A-Fa-f]{6}$/.test(clean)) {
        return '#' + clean.toUpperCase();
    }
    return null;
}

// Helper to resolve target member from context
async function resolveTargetMember(ctx, argIndex = 0) {
    if (ctx.isSlash) {
        const u = ctx.interaction.options.getUser('friend') || ctx.interaction.options.getUser('user') || ctx.interaction.options.getUser('target');
        if (u) {
            const m = await ctx.guild.members.fetch(u.id).catch(() => null);
            return { user: u, member: m };
        }
    }
    const raw = ctx.args[argIndex];
    if (raw) {
        const id = raw.replace(/[^0-9]/g, '');
        if (id) {
            const m = await ctx.guild.members.fetch(id).catch(() => null);
            if (m) return { user: m.user, member: m };
        }
    }
    return { user: null, member: null };
}

const commands = [
    // ==========================================
    // 1. PRIMARY BOOSTER ROLE COMMAND
    // ==========================================
    {
        name: 'boosterrole',
        aliases: ['br', 'customrole', 'myrole'],
        category: 'Economy',
        description: 'Create, customize, and share your exclusive custom booster role with friends!',
        usage: ',boosterrole <create|color|name|icon|share|unshare|info|list|delete> [args]',
        permissions: [],
        async execute(ctx) {
            if (!ctx.guild) return ctx.reply('❌ This command can only be used in a server.');

            const sub = (ctx.args[0] || 'info').toLowerCase();
            const member = ctx.member;

            // ==========================================
            // SUBCOMMAND: CREATE
            // ==========================================
            if (sub === 'create') {
                if (!boosterEngine.isBooster(member)) {
                    return ctx.reply('🚀 **Server Booster Exclusive:** You must be an active server booster to create a custom role!\n*Boost this server to unlock your own vanity role and share it with friends!*');
                }

                const roleName = ctx.args.slice(1).join(' ').trim();
                if (!roleName) {
                    return ctx.reply('❌ Please specify a name for your custom booster role.\n*Example:* `,boosterrole create Starlight #FF73FA`');
                }

                // Check if last argument is a hex color
                const potentialColor = ctx.args[ctx.args.length - 1];
                const parsedColor = parseHexColor(potentialColor);
                let finalName = roleName;
                let finalColor = '#FF73FA';

                if (parsedColor && ctx.args.length > 2) {
                    finalColor = parsedColor;
                    finalName = ctx.args.slice(1, -1).join(' ').trim();
                }

                try {
                    const result = await boosterEngine.createBoosterRole(ctx.guild, member, {
                        name: finalName,
                        color: finalColor
                    });

                    const embed = new EmbedBuilder()
                        .setColor(result.role.hexColor)
                        .setTitle('✨ Custom Booster Role Created!')
                        .setDescription(`Your vanity role **<@&${result.role.id}>** has been created and equipped!\n\n🎨 **Role Color:** \`${result.role.hexColor}\`\n👥 **Shared Friend Slots:** \`0 / ${result.doc.maxShares}\`\n\n💡 *Tip: Share your role with a friend using \`,boosterrole share @friend\`!*`)
                        .setFooter({ text: 'Starry Booster Synergy Engine' })
                        .setTimestamp();

                    return ctx.reply({ embeds: [embed] });
                } catch (err) {
                    return ctx.reply(`❌ **Could not create booster role:** ${err.message}`);
                }
            }

            // ==========================================
            // SUBCOMMAND: COLOR / COLOUR
            // ==========================================
            if (sub === 'color' || sub === 'colour') {
                const isBlendKeyword = (ctx.args[1] || '').toLowerCase() === 'blend';
                const firstColorInput = isBlendKeyword ? ctx.args[2] : ctx.args[1];
                const secondColorInput = isBlendKeyword ? ctx.args[3] : ctx.args[2];

                const colorBlendEngine = require('../../utils/colorBlendEngine');
                const parsed1 = colorBlendEngine.parseHex(firstColorInput);
                const parsed2 = secondColorInput ? colorBlendEngine.parseHex(secondColorInput) : null;

                if (!parsed1) {
                    return ctx.reply('❌ Please provide a valid 6-digit hex color code.\n*Example:* `,boosterrole color #00F2FE` or `,boosterrole color #FF0055 #00E5FF` (Dual Hex Blend)');
                }

                const blendedColor = parsed2 ? colorBlendEngine.blendColors(parsed1, parsed2, 0.5) : parsed1;

                try {
                    const result = await boosterEngine.updateBoosterRole(ctx.guild, member, { 
                        color: blendedColor,
                        secondaryColor: parsed2
                    });
                    const embed = new EmbedBuilder()
                        .setColor(result.role.hexColor)
                        .setTitle('🎨 Booster Role Color Updated!')
                        .setDescription(
                            parsed2 
                                ? `Updated **<@&${result.role.id}>** to a custom dual-blend!\n\n` +
                                  `🎯 **Color 1:** \`${parsed1}\`\n` +
                                  `🎯 **Color 2:** \`${parsed2}\`\n` +
                                  `💎 **Rendered Hex:** \`${blendedColor}\`\n\n` +
                                  `🌈 **Swatch:**\n${colorBlendEngine.generateVisualBar(parsed1, parsed2, blendedColor)}`
                                : `Updated **<@&${result.role.id}>** to color **\`${parsed1}\`**!`
                        )
                        .setFooter({ text: 'Starry Booster Synergy Engine' });
                    return ctx.reply({ embeds: [embed] });
                } catch (err) {
                    return ctx.reply(`❌ **Could not update color:** ${err.message}`);
                }
            }

            // ==========================================
            // SUBCOMMAND: NAME / RENAME
            // ==========================================
            if (sub === 'name' || sub === 'rename') {
                const newName = ctx.args.slice(1).join(' ').trim();
                if (!newName) {
                    return ctx.reply('❌ Please provide a new name for your custom role.\n*Example:* `,boosterrole name Galactic VIP`');
                }

                try {
                    const result = await boosterEngine.updateBoosterRole(ctx.guild, member, { name: newName });
                    const embed = new EmbedBuilder()
                        .setColor(result.role.hexColor)
                        .setTitle('✏️ Booster Role Renamed!')
                        .setDescription(`Updated your role name to: **${result.doc.name}** (<@&${result.role.id}>)`)
                        .setFooter({ text: 'Starry Booster Synergy Engine' });
                    return ctx.reply({ embeds: [embed] });
                } catch (err) {
                    return ctx.reply(`❌ **Could not rename role:** ${err.message}`);
                }
            }

            // ==========================================
            // SUBCOMMAND: ICON
            // ==========================================
            if (sub === 'icon') {
                const iconUrl = ctx.args[1];
                if (!iconUrl || !iconUrl.startsWith('http')) {
                    return ctx.reply('❌ Please provide a direct image URL (PNG/JPEG) for your role icon.\n*Example:* `,boosterrole icon https://i.imgur.com/example.png`');
                }

                try {
                    const result = await boosterEngine.updateBoosterRole(ctx.guild, member, { icon: iconUrl });
                    const embed = new EmbedBuilder()
                        .setColor(result.role.hexColor)
                        .setTitle('🖼️ Booster Role Icon Updated!')
                        .setDescription(`Role icon for **<@&${result.role.id}>** has been updated.`)
                        .setThumbnail(iconUrl)
                        .setFooter({ text: 'Starry Booster Synergy Engine' });
                    return ctx.reply({ embeds: [embed] });
                } catch (err) {
                    return ctx.reply(`❌ **Could not set role icon:** ${err.message}`);
                }
            }

            // ==========================================
            // SUBCOMMAND: SHARE (Viral Friend Delegation)
            // ==========================================
            if (sub === 'share' || sub === 'addfriend' || sub === 'give') {
                const { member: friendMember } = await resolveTargetMember(ctx, 1);
                if (!friendMember) {
                    return ctx.reply('❌ Please mention the friend you want to share your custom role with.\n*Example:* `,boosterrole share @friend`');
                }

                try {
                    const result = await boosterEngine.shareBoosterRole(ctx.guild, member, friendMember);

                    const embed = new EmbedBuilder()
                        .setColor(result.role.hexColor)
                        .setTitle('💜 Booster Role Shared!')
                        .setDescription(`You successfully granted **<@&${result.role.id}>** to <@${friendMember.id}>!\n\n👥 **Shared Friends:** \`${result.doc.sharedWith.length} / ${result.doc.maxShares}\` slots used.`)
                        .setFooter({ text: 'Starry Booster Synergy • Friends can boost to create their own role!' })
                        .setTimestamp();

                    // Viral attribution message in channel
                    const viralNote = `✨ <@${friendMember.id}> was granted the exclusive **${result.doc.name}** role by <@${member.id}>! Boost this server to create your own shared vanity role!`;
                    return ctx.reply({ content: viralNote, embeds: [embed] });
                } catch (err) {
                    return ctx.reply(`❌ **Could not share role:** ${err.message}`);
                }
            }

            // ==========================================
            // SUBCOMMAND: UNSHARE (Revoke From Friend)
            // ==========================================
            if (sub === 'unshare' || sub === 'removefriend') {
                const { member: friendMember } = await resolveTargetMember(ctx, 1);
                if (!friendMember) {
                    return ctx.reply('❌ Please mention the friend you want to remove your role from.\n*Example:* `,boosterrole unshare @friend`');
                }

                try {
                    const result = await boosterEngine.unshareBoosterRole(ctx.guild, member, friendMember);
                    const embed = new EmbedBuilder()
                        .setColor(Colors.DarkGrey)
                        .setTitle('➖ Booster Role Revoked')
                        .setDescription(`Revoked your custom role from <@${friendMember.id}>.\n\n👥 **Available Slots:** \`${result.doc.maxShares - result.doc.sharedWith.length} / ${result.doc.maxShares}\` remaining.`)
                        .setFooter({ text: 'Starry Booster Synergy Engine' });
                    return ctx.reply({ embeds: [embed] });
                } catch (err) {
                    return ctx.reply(`❌ **Could not unshare role:** ${err.message}`);
                }
            }

            // ==========================================
            // SUBCOMMAND: DELETE
            // ==========================================
            if (sub === 'delete' || sub === 'remove') {
                try {
                    await boosterEngine.deleteBoosterRole(ctx.guild, member);
                    return ctx.reply('🗑️ **Your custom booster role has been completely removed.** You can create a new one anytime with `,boosterrole create`.');
                } catch (err) {
                    return ctx.reply(`❌ **Could not delete role:** ${err.message}`);
                }
            }

            // ==========================================
            // SUBCOMMAND: LIST (Server Booster Gallery)
            // ==========================================
            if (sub === 'list' || sub === 'all') {
                const roles = await BoosterRole.find({ guildId: ctx.guild.id, active: true }).limit(25).lean();
                if (roles.length === 0) {
                    return ctx.reply('ℹ️ There are currently no custom booster roles in this server. Active boosters can create one with `,boosterrole create`!');
                }

                const roleLines = roles.map((r, i) => {
                    return `**${i + 1}.** <@&${r.roleId}> — Owner: <@${r.userId}> | Shared with: \`${r.sharedWith?.length || 0} friends\``;
                }).join('\n');

                const embed = new EmbedBuilder()
                    .setColor('#FF73FA')
                    .setTitle(`🚀 ${ctx.guild.name} • Booster Role Hall of Fame`)
                    .setDescription(`Here are the custom vanity roles created by server boosters:\n\n${roleLines}`)
                    .setFooter({ text: `Total Booster Roles: ${roles.length} • Powered by Starry` })
                    .setTimestamp();

                return ctx.reply({ embeds: [embed] });
            }

            // ==========================================
            // DEFAULT SUBCOMMAND: INFO
            // ==========================================
            const targetUser = (await resolveTargetMember(ctx, 1)).user || ctx.user;
            const doc = await BoosterRole.findOne({ guildId: ctx.guild.id, userId: targetUser.id });

            if (!doc) {
                if (targetUser.id === ctx.user.id) {
                    return ctx.reply('ℹ️ You do not currently have a custom booster role.\n👉 If you are a server booster, create one right now using:\n```,boosterrole create <Role Name> [Hex Color]```');
                }
                return ctx.reply(`ℹ️ <@${targetUser.id}> does not have a custom booster role in this server.`);
            }

            const role = ctx.guild.roles.cache.get(doc.roleId);
            const sharedMentions = doc.sharedWith.length > 0 
                ? doc.sharedWith.map(id => `<@${id}>`).join(', ') 
                : '*No friends shared yet*';

            const embed = new EmbedBuilder()
                .setColor(role ? role.hexColor : doc.color)
                .setTitle(`🚀 Booster Role Profile • ${doc.name}`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👑 Role Owner', value: `<@${doc.userId}> (\`${doc.userId}\`)`, inline: true },
                    { name: '🏷️ Role', value: role ? `<@&${role.id}>` : '*Role Missing from Server*', inline: true },
                    { name: '🎨 Hex Color', value: `\`${doc.color}\``, inline: true },
                    { name: '👥 Shared Friends', value: `\`${doc.sharedWith.length} / ${doc.maxShares}\` slots used\n${sharedMentions}`, inline: false }
                )
                .setFooter({ text: 'Starry Booster Synergy Engine • Prefix: ,' })
                .setTimestamp();

            if (doc.unboostDetectedAt && doc.graceExpiresAt) {
                embed.addFields({
                    name: '⚠️ Grace Period Active',
                    value: `Boost ended. Role will expire <t:${Math.floor(doc.graceExpiresAt.getTime() / 1000)}:R> unless re-boosted.`,
                    inline: false
                });
            }

            return ctx.reply({ embeds: [embed] });
        }
    },

    // ==========================================
    // 2. BOOST PERKS & LOYALTY PORTAL
    // ==========================================
    {
        name: 'boostperks',
        aliases: ['boostrewards', 'booststatus', 'boosttiers'],
        category: 'Economy',
        description: 'View server boost status, booster synergy perks, and available booster role slots.',
        usage: ',boostperks',
        permissions: [],
        async execute(ctx) {
            const guild = ctx.guild;
            const boostCount = guild.premiumSubscriptionCount || 0;
            const boostTier = guild.premiumTier;
            const isBooster = boosterEngine.isBooster(ctx.member);
            const userRole = await BoosterRole.findOne({ guildId: guild.id, userId: ctx.user.id });

            const settings = await boosterEngine.getSettings(guild.id);
            const { isServerOrUserPremium } = require('../../utils/premiumHelper');
            const isGuildPremium = await isServerOrUserPremium(guild.id, ctx.user.id, ctx.client);
            const tier = settings.premium?.tier || 'free';
            let maxShares = settings.boosterRoleSystem?.defaultMaxShares || 1;
            if (isGuildPremium) {
                if (tier === 'lifetime') maxShares = 15;
                else if (tier === 'pro_cluster') maxShares = 10;
                else maxShares = settings.boosterRoleSystem?.premiumMaxShares || 5;
            }

            const embed = new EmbedBuilder()
                .setColor('#FF73FA')
                .setTitle(`🚀 Server Boost & Booster Synergy Perks • ${guild.name}`)
                .setThumbnail(guild.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
                .setDescription(`Server Boost Level: **Tier ${boostTier}** (\`${boostCount}\` total server boosts)\nYour Booster Status: ${isBooster ? '🌟 **Active Server Booster!**' : '⚪ *Not currently boosting*'}`)
                .addFields(
                    {
                        name: '✨ Active Booster Perks',
                        value: [
                            '• **Custom Vanity Role**: Pick your own name, hex color, and icon',
                            `• **Shared Role Delegation**: Share your custom role with **${maxShares} friends**`,
                            '• **2x Economy Multiplier**: Earn double credits and loot chest rewards',
                            '• **3-Day Unboost Grace Shield**: Keep your role safe during billing hiccups'
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '📊 Your Custom Role',
                        value: userRole 
                            ? `Active: <@&${userRole.roleId}>\nFriends Sharing: \`${userRole.sharedWith.length} / ${Math.max(userRole.maxShares, maxShares)}\`` 
                            : (isBooster ? 'You have not created your role yet! Run `,boosterrole create <name>`.' : 'Boost this server to unlock your custom role instantly!'),
                        inline: false
                    }
                )
                .setFooter({ text: 'Powered by Starry • Boost to unlock VIP perks' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Create Booster Role')
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId('br_create_prompt')
                    .setDisabled(!isBooster || Boolean(userRole)),
                new ButtonBuilder()
                    .setLabel('Upgrade to Starry Premium')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://starry.gg/premium')
            );

            return ctx.reply({ embeds: [embed], components: [row] });
        }
    },

    // ==========================================
    // 3. ADMIN BOOSTER CONFIGURATION
    // ==========================================
    {
        name: 'boosteradmin',
        aliases: ['bradmin', 'boosterconfig'],
        category: 'Moderation',
        description: 'Configure the server Booster Role system (Anchor role, log channel, friend limits).',
        usage: ',boosteradmin <anchor|logs|shares|toggle> [value]',
        permissions: [PermissionFlagsBits.ManageGuild],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ You need **Manage Server** permission to configure booster settings.');
            }

            const sub = (ctx.args[0] || 'view').toLowerCase();
            let settings = await ServerSettings.findOne({ guildId: ctx.guild.id });
            if (!settings) settings = new ServerSettings({ guildId: ctx.guild.id });
            if (!settings.boosterRoleSystem) {
                settings.boosterRoleSystem = {
                    enabled: true,
                    anchorRoleId: '',
                    logChannelId: '',
                    defaultMaxShares: 1,
                    premiumMaxShares: 5,
                    allowIcons: true,
                    gracePeriodDays: 3
                };
            }

            if (sub === 'anchor') {
                const roleMention = ctx.args[1];
                const roleId = roleMention ? roleMention.replace(/[^0-9]/g, '') : null;
                const role = roleId ? ctx.guild.roles.cache.get(roleId) : null;
                if (!role) {
                    return ctx.reply('❌ Please mention a valid anchor role or provide its ID: `,boosteradmin anchor @--- Booster Roles ---`');
                }
                settings.boosterRoleSystem.anchorRoleId = role.id;
                await settings.save();
                return ctx.reply(`✅ **Anchor Role set to <@&${role.id}>.** All new custom booster roles will be positioned strictly below this role.`);
            }

            if (sub === 'logs' || sub === 'logchannel') {
                const channelMention = ctx.args[1];
                const channelId = channelMention ? channelMention.replace(/[^0-9]/g, '') : null;
                const channel = channelId ? ctx.guild.channels.cache.get(channelId) : null;
                if (!channel || !channel.isTextBased()) {
                    return ctx.reply('❌ Please mention a valid text channel for booster role logs: `,boosteradmin logs #booster-logs`');
                }
                settings.boosterRoleSystem.logChannelId = channel.id;
                await settings.save();
                return ctx.reply(`✅ **Booster Role Log Channel set to <#${channel.id}>.**`);
            }

            if (sub === 'shares' || sub === 'limit') {
                const num = parseInt(ctx.args[1]);
                if (isNaN(num) || num < 1 || num > 10) {
                    return ctx.reply('❌ Please specify a valid share limit between 1 and 10: `,boosteradmin shares 2`');
                }
                settings.boosterRoleSystem.defaultMaxShares = num;
                await settings.save();
                return ctx.reply(`✅ **Default shared friend slots set to \`${num}\` friends per booster.**`);
            }

            if (sub === 'toggle') {
                const curr = settings.boosterRoleSystem.enabled !== false;
                settings.boosterRoleSystem.enabled = !curr;
                await settings.save();
                return ctx.reply(`✅ **Custom Booster Role System is now ${!curr ? 'ENABLED' : 'DISABLED'}.**`);
            }

            // View Configuration
            const cfg = settings.boosterRoleSystem;
            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle(`⚙️ Booster Role Settings • ${ctx.guild.name}`)
                .addFields(
                    { name: 'System Status', value: cfg.enabled ? '🟢 Enabled' : '🔴 Disabled', inline: true },
                    { name: 'Anchor Role', value: cfg.anchorRoleId ? `<@&${cfg.anchorRoleId}>` : '*(Automatic, below bot role)*', inline: true },
                    { name: 'Log Channel', value: cfg.logChannelId ? `<#${cfg.logChannelId}>` : '*(Disabled)*', inline: true },
                    { name: 'Free Tier Shared Slots', value: `\`${cfg.defaultMaxShares || 1}\` friends`, inline: true },
                    { name: 'Premium Tier Slots', value: `\`${cfg.premiumMaxShares || 5}\` friends`, inline: true },
                    { name: 'Grace Period', value: `\`${cfg.gracePeriodDays || 3}\` days`, inline: true }
                )
                .setFooter({ text: 'Configure with: ,boosteradmin <anchor|logs|shares|toggle>' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    }
];

module.exports = commands;
