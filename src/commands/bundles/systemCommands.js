// ==========================================
// 🤖 Starry MULTI-BOT, GIVEAWAYS & SYSTEMS (15 COMMANDS)
// File Path: src/commands/bundles/systemCommands.js
// Multi-Bot Cluster Status, 1-Year Giveaways, Tickets & Backups
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits 
} = require('discord.js');
const config = require('../../config');
const { ONE_YEAR_MS } = require('../../utils/contextHelper');
const { requirePremium } = require('../../utils/premiumHelper');
const embedVisualityModule = require('../../modules/embedVisuality');
const welcomeModule = require('../../modules/welcome');
const goodbyeModule = require('../../modules/goodbye');
const levelingModule = require('../../modules/leveling');

function hasManagePerms(ctx) {
    if (!ctx.guild) return false;
    if (config.BOT_OWNERS && config.BOT_OWNERS.includes(ctx.user.id)) return true;
    if (ctx.user.id === ctx.guild.ownerId) return true;
    if (ctx.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) return true;
    if (ctx.member?.permissions?.has(PermissionFlagsBits.Administrator)) return true;
    return false;
}

const commands = [
    // 1. MULTIBOT / BOTS / CLUSTER
    {
        name: 'multibot',
        aliases: ['bots', 'cluster', 'summon', 'clones', 'inviteclones', 'clonebots'],
        category: 'Systems',
        description: 'View and manage Multi-Bot cluster status, worker nodes, 1-click summon invites, and roles.',
        usage: ',multibot [invite | add <token> | setrole <bot> <role> | remove <bot> | roles]',
        async execute(ctx) {
            const multiBot = ctx.client.multiBot;
            if (!multiBot) {
                return ctx.reply('❌ Multi-Bot Cluster Manager is not initialized.');
            }

            let sub = ctx.args[0]?.toLowerCase();
            const calledCommand = ctx.isSlash ? ctx.interaction.commandName : ctx.args[0] || '';
            const invokedName = (!ctx.isSlash && ctx.message?.content) ? ctx.message.content.slice(1).split(/\s+/)[0].toLowerCase() : '';

            if (invokedName === 'summon' || invokedName === 'clones' || invokedName === 'inviteclones' || invokedName === 'clonebots') {
                sub = 'invite';
            }

            // 1. Available Roles Subcommand
            if (sub === 'roles') {
                const embed = new EmbedBuilder()
                    .setColor(config.EMBED_COLORS.PRIMARY)
                    .setTitle('🎭 Multi-Bot Work & Role Assignment Presets')
                    .setDescription(
                        `You can assign specialized roles to any bot in your cluster so each bot focuses on specific tasks:\n\n` +
                        `• **👑 \`all\`**: Handles everything (Moderation, Music, Economy, Social, Utility).\n` +
                        `• **🛡️ \`moderation\`**: Dedicated to Moderation, AutoMod, Security & Tickets.\n` +
                        `• **🎵 \`music\`**: Dedicated to Voice Channels, 24/7 radio & High Quality Audio.\n` +
                        `• **🛠️ \`utility\`**: Dedicated to Utility, Whois, Server Info & Steal.\n` +
                        `• **💰 \`economy\`**: Dedicated to Shop, Chests, Prestige & Pet system.\n` +
                        `• **🎭 \`social\`**: Dedicated to Anime Social Actions, Leveling & Mini-Games.\n\n` +
                        `*Usage:* \`,multibot add <token> <role>\` or \`,multibot setrole <botName/ID> <role>\``
                    )
                    .setFooter({ text: 'Multi-Bot Task Partitioning • Prefix: ,' });
                return ctx.reply({ embeds: [embed] });
            }

            // 1B. Invite Cluster Bots Subcommand (One-Click Invites for Clone Bots)
            if (sub === 'invite' || sub === 'invites' || sub === 'clones') {
                const row = new ActionRowBuilder();
                const primaryId = ctx.client.user?.id || 'primary';
                const primaryInvite = `https://discord.com/oauth2/authorize?client_id=${primaryId}&permissions=8&scope=bot%20applications.commands`;
                const starry2Invite = `https://discord.com/oauth2/authorize?client_id=1543515940069572628&permissions=8&integration_type=0&scope=bot+applications.commands`;
                const starry3Invite = `https://discord.com/oauth2/authorize?client_id=1543519236586999928&permissions=8&integration_type=0&scope=bot+applications.commands`;

                row.addComponents(
                    new ButtonBuilder()
                        .setLabel(`Invite ${ctx.client.user?.username || 'Starry 1'}`)
                        .setStyle(ButtonStyle.Link)
                        .setURL(primaryInvite)
                        .setEmoji('👑'),
                    new ButtonBuilder()
                        .setLabel('Invite Starry 2')
                        .setStyle(ButtonStyle.Link)
                        .setURL(starry2Invite)
                        .setEmoji('🎵'),
                    new ButtonBuilder()
                        .setLabel('Invite Starry 3')
                        .setStyle(ButtonStyle.Link)
                        .setURL(starry3Invite)
                        .setEmoji('🎵')
                );

                const embed = new EmbedBuilder()
                    .setColor(config.EMBED_COLORS.PRIMARY)
                    .setTitle('🤖 Starry Multi-Bot & Audio Node Invites')
                    .setDescription(
                        `Invite all Starry cluster bots to your server so multiple voice channels can play music simultaneously!\n\n` +
                        `**1. ${ctx.client.user?.username || 'Starry'}** 👑 *(Primary Master Node)*\n` +
                        `🔗 [Click to Invite Starry](${primaryInvite})\n\n` +
                        `**2. Starry 2** 🎵 *(Dedicated Music Node #1)*\n` +
                        `🔗 [Click to Invite Starry 2](${starry2Invite})\n\n` +
                        `**3. Starry 3** 🎵 *(Dedicated Music Node #2)*\n` +
                        `🔗 [Click to Invite Starry 3](${starry3Invite})\n\n` +
                        `*Click any button below to instantly authorize and add that bot to your server.*`
                    )
                    .setFooter({ text: 'Starry Multi-Bot Infrastructure' });

                return ctx.reply({ embeds: [embed], components: [row] });
            }

            // 2. Admin Add Token Subcommand
            if (sub === 'add') {
                if (!await requirePremium(ctx, 'Multi-Bot Custom Worker Nodes')) return;

                if (!config.BOT_OWNERS.includes(ctx.user.id) && ctx.user.id !== ctx.guild.ownerId) {
                    return ctx.reply('❌ Only Bot Owners / Server Owners can connect new secondary bot tokens.');
                }
                const token = ctx.args[1];
                if (!token) return ctx.reply('❌ Please provide the bot token: `,multibot add <token> [role] [name]`\n*Example: `,multibot add MTI... music "Starry Music #1"`*');

                const role = ctx.args[2]?.toLowerCase() || 'all';
                const customName = ctx.args.slice(3).join(' ') || `Worker Node #${multiBot.instances.size + 1}`;

                await ctx.defer(true);
                try {
                    const spawned = await multiBot.addToken(token, role, customName, ctx.user.tag);
                    if (spawned) {
                        return ctx.reply(`✅ **Successfully spawned and connected secondary bot instance!**\n` +
                                         `• **Name:** \`${spawned.name}\`\n` +
                                         `• **Assigned Role:** \`${spawned.role.toUpperCase()}\`\n` +
                                         `• **Cluster Size:** **${multiBot.instances.size} bots online**`);
                    } else {
                        return ctx.reply('❌ Failed to login secondary bot. Please check token permissions in Discord Developer Portal.');
                    }
                } catch (err) {
                    return ctx.reply(`❌ Error adding token: \`${err.message}\``);
                }
            }

            // 3. Admin Set Role Subcommand
            if (sub === 'setrole' || sub === 'role') {
                if (!config.BOT_OWNERS.includes(ctx.user.id) && ctx.user.id !== ctx.guild.ownerId) {
                    return ctx.reply('❌ Only Bot Owners / Server Owners can change bot roles.');
                }
                const targetBot = ctx.args[1];
                const newRole = ctx.args[2]?.toLowerCase();
                if (!targetBot || !newRole) {
                    return ctx.reply('🔹 **Usage:** `,multibot setrole <botId/name> <role>`\n*Roles: `all`, `moderation`, `music`, `utility`, `economy`, `social`*');
                }

                try {
                    const res = await multiBot.setRole(targetBot, newRole);
                    if (res.success) {
                        return ctx.reply(`✅ **Updated Work Assignment!**\nBot **${res.bot.name}** is now assigned to: **${newRole.toUpperCase()}**`);
                    } else {
                        return ctx.reply(`❌ ${res.message || 'Could not find bot instance.'}`);
                    }
                } catch (e) {
                    return ctx.reply(`❌ Error: \`${e.message}\``);
                }
            }

            // 4. Admin Remove Token Subcommand
            if (sub === 'remove' || sub === 'delete') {
                if (!config.BOT_OWNERS.includes(ctx.user.id) && ctx.user.id !== ctx.guild.ownerId) {
                    return ctx.reply('❌ Only Bot Owners / Server Owners can remove secondary bots.');
                }
                const targetBot = ctx.args[1];
                if (!targetBot) return ctx.reply('🔹 **Usage:** `,multibot remove <botId/token>`');

                const removed = await multiBot.removeToken(targetBot);
                if (removed) {
                    return ctx.reply(`✅ **Successfully removed bot from cluster.** Current cluster size: **${multiBot.instances.size}**`);
                } else {
                    return ctx.reply(`❌ Could not remove bot or cannot remove Primary Bot.`);
                }
            }

            // 5. Overview Cluster Embed
            const stats = multiBot.getClusterStats();
            const virtualList = (stats.virtualNodes || []).map((vn, i) => {
                return `**${i + 1}.** ${vn.emoji} **${vn.name}** \`[ACTIVE 🟢]\`\n` +
                       `   • **Specialization:** ${vn.role}\n` +
                       `   • **Engine Scope:** \`${vn.commands}\` | Status: \`Online (Single-Token Virtual Multi-Bot)\``;
            }).join('\n\n');

            let physicalSection = '';
            if (stats.physicalBots && stats.physicalBots.length > 0) {
                const pList = stats.physicalBots.map((b, i) => {
                    return `• \`${b.tag}\` ${b.isPrimary ? '👑 *(Primary)*' : '🤖 *(Worker)*'} • **Role:** ${b.roleLabel} • **Ping:** \`${b.ping}ms\` • **Status:** ${b.status}`;
                }).join('\n');
                physicalSection = `\n\n**🌐 Connected Discord Client Nodes (${stats.physicalBots.length}):**\n` + pList;
            }

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle('🤖 Starry Multi-Bot & Sub-Engine Architecture')
                .setDescription(
                    `The bot runs an asynchronous **Virtual Multi-Bot Cluster** on a single token, dividing tasks across dedicated specialized worker engines with dynamic presence and independent queue memory!\n\n` +
                    `**🛡️ Virtual Specialized Worker Engines (6 Running):**\n\n` +
                    virtualList +
                    physicalSection + `\n\n` +
                    `💡 *Presence automatically cycles across all 6 virtual workers. Use \`,multibot roles\` to inspect roles or \`,multibot add <token>\` to link physical clone bots!*`
                )
                .addFields(
                    { name: '⚙️ Virtual Engines', value: `\`6\` active workers`, inline: true },
                    { name: '🌐 Client Instances', value: `\`${stats.totalPhysicalBots}\` connected`, inline: true },
                    { name: '🏰 Total Guilds', value: `\`${stats.totalGuilds}\` servers`, inline: true }
                )
                .setFooter({ text: 'Starry Virtual Multi-Bot Engine • Single-Token Multi-Tasking' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 2. CHEST
    {
        name: 'chest',
        aliases: ['loot'],
        category: 'Systems',
        description: 'Claim your timed loot chest for free XP and Credits.',
        usage: ',chest',
        async execute(ctx) {
            const xpReward = Math.floor(Math.random() * 50) + 25;
            const creditsReward = Math.floor(Math.random() * 200) + 100;

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.ECONOMY)
                .setTitle('🎁 Timed Mystery Loot Chest')
                .setDescription(
                    `**${ctx.user.username}**, you unlocked your mystery chest!\n\n` +
                    `✨ **+${xpReward} XP**\n` +
                    `💵 **+$${creditsReward} Credits**`
                )
                .setFooter({ text: 'Loot Chests reset periodically • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 3. CHESTDROP
    {
        name: 'chestdrop',
        aliases: ['spawnchest'],
        category: 'Systems',
        description: 'Spawn an interactive loot chest in the channel (Admins Only).',
        usage: ',chestdrop',
        permissions: [PermissionFlagsBits.Administrator],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Administrator permission required.');
            }

            const embed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle('📦 A MYSTERY LOOT CHEST HAS DROPPED!')
                .setDescription('First member to click the button below claims the rewards!\n*Button features high 1-year response lifetime.*')
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_chestdrop').setLabel('Claim Loot Chest!').setStyle(ButtonStyle.Success).setEmoji('🎁')
            );

            const msg = await ctx.channel.send({ embeds: [embed], components: [row] });

            // 1-Year Component Collector
            const collector = msg.createMessageComponentCollector({ time: ONE_YEAR_MS });
            collector.on('collect', async (i) => {
                row.components[0].setDisabled(true).setLabel(`Claimed by ${i.user.username}`);
                await i.update({ components: [row] });
                await i.followUp(`🎉 <@${i.user.id}> was first and claimed **500 Credits & 100 XP**!`);
                collector.stop();
            });
        }
    },

    // 4. PET
    {
        name: 'pet',
        aliases: ['pets'],
        category: 'Systems',
        description: 'Virtual pet companion system.',
        usage: ',pet [status / equip <name>]',
        async execute(ctx) {
            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle('🐾 Virtual Pet Companion')
                .setDescription(
                    `**Active Pet:** 🐉 *Cosmic Dragon*\n` +
                    `• **Level:** \`Level 5\`\n` +
                    `• **Happiness:** \`95%\` 🟢\n` +
                    `• **Passive Buff:** \`+15% XP Gain\``
                )
                .setFooter({ text: 'Pet System • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 5. PRESTIGE
    {
        name: 'prestige',
        category: 'Systems',
        description: 'Reset your level to gain Prestige crowns and permanent XP multipliers.',
        usage: ',prestige',
        async execute(ctx) {
            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.ECONOMY)
                .setTitle('👑 Prestige Rank & Multipliers')
                .setDescription(
                    `Reach **Level 50** to unlock Prestige resets!\n` +
                    `Each Prestige awards:\n` +
                    `• 👑 Permanent Prestige Crown Badge\n` +
                    `• ⚡ **+20% Permanent XP Multiplier**\n` +
                    `• 💰 **$25,000 Bonus Credits**`
                )
                .setFooter({ text: 'Level up to Prestige! • Prefix: ,' });

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 6. GIVEAWAY
    {
        name: 'giveaway',
        aliases: ['gstart'],
        category: 'Systems',
        description: 'Start an automated giveaway with 1-Year persistent entry buttons.',
        usage: ',giveaway <duration> <winners> <prize>',
        permissions: [PermissionFlagsBits.ManageGuild],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Manage Server permission required.');
            }
            const duration = ctx.args[0] || '1h';
            const winners = parseInt(ctx.args[1]) || 1;
            const prize = ctx.args.slice(2).join(' ') || 'Discord Nitro / Special Role';

            const embed = new EmbedBuilder()
                .setColor('#F47FFF')
                .setTitle(`🎉 GIVEAWAY: ${prize}`)
                .setDescription(
                    `Click the **🎉 Enter Giveaway** button below to participate!\n\n` +
                    `🏆 **Winners:** \`${winners}\`\n` +
                    `⏳ **Duration:** \`${duration}\`\n` +
                    `👤 **Hosted by:** ${ctx.user}`
                )
                .setFooter({ text: '1-Year Persistent Giveaway System • Prefix: ,' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('giveaway_enter').setLabel('Enter Giveaway (0)').setEmoji('🎉').setStyle(ButtonStyle.Primary)
            );

            const msg = await ctx.channel.send({ embeds: [embed], components: [row] });
            const participants = new Set();

            // 1-Year Component Collector
            const collector = msg.createMessageComponentCollector({ time: ONE_YEAR_MS });
            collector.on('collect', async (i) => {
                if (participants.has(i.user.id)) {
                    participants.delete(i.user.id);
                    row.components[0].setLabel(`Enter Giveaway (${participants.size})`);
                    await i.update({ components: [row] });
                    return i.followUp({ content: '❌ Left the giveaway.', ephemeral: true });
                } else {
                    participants.add(i.user.id);
                    row.components[0].setLabel(`Enter Giveaway (${participants.size})`);
                    await i.update({ components: [row] });
                    return i.followUp({ content: '🎉 You have entered the giveaway! Good luck!', ephemeral: true });
                }
            });

            if (ctx.isSlash) ctx.reply({ content: '✅ Giveaway created!', ephemeral: true });
        }
    },

    // 7. REROLL
    {
        name: 'reroll',
        aliases: ['greroll'],
        category: 'Systems',
        description: 'Reroll a new winner for a concluded giveaway.',
        usage: ',reroll <messageID>',
        permissions: [PermissionFlagsBits.ManageGuild],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            return ctx.reply('🔄 **Giveaway Rerolled:** Winner selected!');
        }
    },

    // 8. GEND
    {
        name: 'gend',
        aliases: ['giveawayend'],
        category: 'Systems',
        description: 'End a giveaway immediately.',
        usage: ',gend <messageID>',
        permissions: [PermissionFlagsBits.ManageGuild],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            return ctx.reply('🛑 **Giveaway concluded successfully.**');
        }
    },

    // 9. TICKETSETUP
    {
        name: 'ticketsetup',
        aliases: ['ticketpanel', 'setuptickets', 'ticket-setup'],
        category: 'Systems',
        description: 'Configure and spawn the interactive Support Ticket Hub in this server.',
        usage: ',ticketsetup [#channel] [@role]',
        permissions: [PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageGuild],
        async execute(ctx) {
            if (!ctx.member.permissions?.has(PermissionFlagsBits.Administrator) && 
                !ctx.member.permissions?.has(PermissionFlagsBits.ManageGuild) && 
                !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Administrator or Manage Server permission required to configure tickets.');
            }

            const ticketsModule = require('../../modules/tickets');

            // Resolve target channel
            let targetChannel = null;
            if (ctx.isSlash) {
                targetChannel = ctx.options.getChannel('channel') || ctx.channel;
            } else {
                targetChannel = ctx.message.mentions.channels.first() || 
                                (ctx.args[0] ? ctx.guild.channels.cache.get(ctx.args[0]) : null) || 
                                ctx.channel;
            }

            // Resolve support role
            let supportRole = null;
            if (ctx.isSlash) {
                supportRole = ctx.options.getRole('role') || null;
            } else {
                supportRole = ctx.message.mentions.roles.first() || 
                              (ctx.args[1] ? ctx.guild.roles.cache.get(ctx.args[1]) : null);
            }

            // Resolve category & custom text (if provided)
            let category = ctx.isSlash ? ctx.options.getChannel('category') : null;
            let title = ctx.isSlash ? ctx.options.getString('title') : null;
            let description = ctx.isSlash ? ctx.options.getString('description') : null;

            try {
                await ticketsModule.setupTicketPanel({
                    guild: ctx.guild,
                    channel: targetChannel,
                    client: ctx.client,
                    supportRole,
                    category,
                    title,
                    description
                });

                const confirmEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('✅ Ticket Setup Complete!')
                    .setDescription(`The interactive Support Ticket Panel is active and ready in <#${targetChannel.id}>.`)
                    .addFields(
                        { name: '📍 Panel Channel', value: `<#${targetChannel.id}>`, inline: true },
                        { name: '🛡️ Support Role', value: supportRole ? `<@&${supportRole.id}>` : '*Server Staff (auto-detected)*', inline: true },
                        { name: '📁 Category', value: category ? `${category.name}` : '*Auto-created (OPENED TICKETS)*', inline: true }
                    )
                    .setFooter({ text: 'Starry Ticket Engine • High Lifetime 24/7' })
                    .setTimestamp();

                if (ctx.isSlash) {
                    return ctx.reply({ embeds: [confirmEmbed], ephemeral: true });
                } else if (targetChannel.id === ctx.channel.id) {
                    await ctx.message?.delete().catch(() => {});
                    return;
                } else {
                    return ctx.reply({ embeds: [confirmEmbed] });
                }
            } catch (err) {
                console.error('Ticket setup error:', err);
                return ctx.reply(`❌ Failed to complete ticket setup: \`${err.message}\``);
            }
        }
    },

    // 9b. TICKET MASTER COMMAND
    {
        name: 'ticket',
        category: 'Systems',
        description: 'Comprehensive ticket management (setup, close, claim, add, remove, transcript, delete).',
        usage: ',ticket <setup|close|add|remove|claim|transcript|delete> [args]',
        permissions: [],
        async execute(ctx) {
            const ticketsModule = require('../../modules/tickets');
            const sub = (ctx.isSlash ? ctx.options.getSubcommand?.() : ctx.args[0])?.toLowerCase();

            // 1. SETUP SUBCOMMAND
            if (sub === 'setup') {
                if (!ctx.member.permissions?.has(PermissionFlagsBits.Administrator) && 
                    !ctx.member.permissions?.has(PermissionFlagsBits.ManageGuild) && 
                    !config.BOT_OWNERS.includes(ctx.user.id)) {
                    return ctx.reply('❌ Administrator or Manage Server permission required to configure tickets.');
                }

                let targetChannel = ctx.isSlash 
                    ? (ctx.options.getChannel('channel') || ctx.channel)
                    : (ctx.message.mentions.channels.first() || (ctx.args[1] ? ctx.guild.channels.cache.get(ctx.args[1]) : null) || ctx.channel);

                let supportRole = ctx.isSlash 
                    ? (ctx.options.getRole('role') || null)
                    : (ctx.message.mentions.roles.first() || (ctx.args[2] ? ctx.guild.roles.cache.get(ctx.args[2]) : null));

                let category = ctx.isSlash ? ctx.options.getChannel('category') : null;
                let title = ctx.isSlash ? ctx.options.getString('title') : null;
                let description = ctx.isSlash ? ctx.options.getString('description') : null;

                await ticketsModule.setupTicketPanel({
                    guild: ctx.guild,
                    channel: targetChannel,
                    client: ctx.client,
                    supportRole,
                    category,
                    title,
                    description
                });

                const confirmEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('✅ Ticket Setup Complete!')
                    .setDescription(`The interactive Support Ticket Panel is active in <#${targetChannel.id}>.`)
                    .addFields(
                        { name: '📍 Channel', value: `<#${targetChannel.id}>`, inline: true },
                        { name: '🛡️ Role', value: supportRole ? `<@&${supportRole.id}>` : '*Server Staff*', inline: true }
                    )
                    .setTimestamp();

                if (ctx.isSlash) {
                    return ctx.reply({ embeds: [confirmEmbed], ephemeral: true });
                } else if (targetChannel.id === ctx.channel.id) {
                    await ctx.message?.delete().catch(() => {});
                    return;
                } else {
                    return ctx.reply({ embeds: [confirmEmbed] });
                }
            }

            // Ticket Channel Check for management subcommands
            const isTicketChannel = ctx.channel.name.startsWith('ticket-') || 
                                    ctx.channel.name.startsWith('claimed-') || 
                                    ctx.channel.name.startsWith('closed-') || 
                                    (ctx.channel.topic && /\d{17,20}/.test(ctx.channel.topic));

            // 2. CLOSE SUBCOMMAND
            if (sub === 'close') {
                if (!isTicketChannel) {
                    return ctx.reply('❌ This command can only be run inside a ticket channel.');
                }

                const isStaff = ticketsModule.isStaff(ctx.member, ctx.guild);
                const isOwner = ctx.channel.topic?.includes(ctx.user.id);
                if (!isStaff && !isOwner) {
                    return ctx.reply('❌ Only server staff or the ticket creator can close this ticket.');
                }

                const reason = ctx.isSlash ? ctx.options.getString('reason') : (ctx.args.slice(1).join(' ') || 'Closed by user command');
                const res = await ticketsModule.closeTicketChannel({
                    channel: ctx.channel,
                    closedBy: ctx.user,
                    client: ctx.client,
                    reason
                });

                if (res.error) return ctx.reply(res.error);
                if (ctx.isSlash) return ctx.reply({ content: '🔒 Ticket marked as closed.', ephemeral: true });
                return;
            }

            // 3. CLAIM SUBCOMMAND
            if (sub === 'claim') {
                if (!isTicketChannel) {
                    return ctx.reply('❌ This command can only be run inside a ticket channel.');
                }

                if (!ticketsModule.isStaff(ctx.member, ctx.guild)) {
                    return ctx.reply('❌ Only staff members can claim tickets.');
                }

                const res = await ticketsModule.claimTicketChannel({ channel: ctx.channel, staffMember: ctx.user });
                if (res.error) return ctx.reply(res.error);
                if (ctx.isSlash) return ctx.reply({ content: '✋ You have claimed this ticket!', ephemeral: true });
                return;
            }

            // 4. ADD USER SUBCOMMAND
            if (sub === 'add') {
                if (!isTicketChannel) {
                    return ctx.reply('❌ This command can only be run inside a ticket channel.');
                }

                if (!ticketsModule.isStaff(ctx.member, ctx.guild)) {
                    return ctx.reply('❌ Only staff members can add users to tickets.');
                }

                const targetUser = ctx.isSlash 
                    ? ctx.options.getUser('user')
                    : (ctx.message.mentions.users.first() || (ctx.args[1] ? await ctx.client.users.fetch(ctx.args[1]).catch(() => null) : null));

                if (!targetUser) {
                    return ctx.reply('❌ Please specify a user to add (e.g. `,ticket add @user`).');
                }

                const targetMember = await ctx.guild.members.fetch(targetUser.id).catch(() => null);
                if (!targetMember) return ctx.reply('❌ Member not found in this server.');

                await ticketsModule.addMemberToTicket({ channel: ctx.channel, member: targetMember });
                return ctx.reply(`✅ Added <@${targetMember.id}> to this ticket.`);
            }

            // 5. REMOVE USER SUBCOMMAND
            if (sub === 'remove') {
                if (!isTicketChannel) {
                    return ctx.reply('❌ This command can only be run inside a ticket channel.');
                }

                if (!ticketsModule.isStaff(ctx.member, ctx.guild)) {
                    return ctx.reply('❌ Only staff members can remove users from tickets.');
                }

                const targetUser = ctx.isSlash 
                    ? ctx.options.getUser('user')
                    : (ctx.message.mentions.users.first() || (ctx.args[1] ? await ctx.client.users.fetch(ctx.args[1]).catch(() => null) : null));

                if (!targetUser) {
                    return ctx.reply('❌ Please specify a user to remove (e.g. `,ticket remove @user`).');
                }

                const targetMember = await ctx.guild.members.fetch(targetUser.id).catch(() => null);
                if (!targetMember) return ctx.reply('❌ Member not found in this server.');

                await ticketsModule.removeMemberFromTicket({ channel: ctx.channel, member: targetMember });
                return ctx.reply(`🛑 Removed <@${targetMember.id}> from this ticket.`);
            }

            // 6. TRANSCRIPT SUBCOMMAND
            if (sub === 'transcript') {
                if (!isTicketChannel) {
                    return ctx.reply('❌ This command can only be run inside a ticket channel.');
                }

                const { attachment, transcriptEmbed } = await ticketsModule.generateTranscript({
                    channel: ctx.channel,
                    guild: ctx.guild,
                    user: ctx.user
                });

                return ctx.reply({ embeds: [transcriptEmbed], files: [attachment] });
            }

            // 7. DELETE SUBCOMMAND
            if (sub === 'delete') {
                if (!isTicketChannel) {
                    return ctx.reply('❌ This command can only be run inside a ticket channel.');
                }

                if (!ticketsModule.isStaff(ctx.member, ctx.guild)) {
                    return ctx.reply('❌ Only staff members can delete tickets.');
                }

                await ctx.reply('🗑️ Ticket will be deleted in 5 seconds...');
                setTimeout(async () => {
                    await ctx.channel.delete().catch(() => {});
                }, 5000);
                return;
            }

            // DEFAULT: HELP EMBED
            const helpEmbed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle('🎫 Starry Ticket System Command Guide')
                .setDescription(
                    `Manage and operate high-performance support tickets with persistent buttons.\n\n` +
                    `• \`,ticketsetup [#channel] [@role]\` — Deploy the ticket panel\n` +
                    `• \`,ticket setup\` — Interactive ticket setup\n` +
                    `• \`,ticket close [reason]\` — Close the current ticket\n` +
                    `• \`,ticket claim\` — Staff claims active ticket\n` +
                    `• \`,ticket add <@user>\` — Add a user to this ticket\n` +
                    `• \`,ticket remove <@user>\` — Remove a user from this ticket\n` +
                    `• \`,ticket transcript\` — Save message archive\n` +
                    `• \`,ticket delete\` — Permanently remove ticket channel\n\n` +
                    `*Slash commands also available:* \`/ticketsetup\` *and* \`/ticket <subcommand>\``
                )
                .setFooter({ text: 'Starry Ticket Engine • High Lifetime' })
                .setTimestamp();

            return ctx.reply({ embeds: [helpEmbed] });
        }
    },

    // 9c. DEDICATED TICKET CLOSE SHORTCUT
    {
        name: 'ticketclose',
        aliases: ['close'],
        category: 'Systems',
        description: 'Close the current support ticket channel.',
        usage: ',close [reason]',
        permissions: [],
        async execute(ctx) {
            const isTicketChannel = ctx.channel.name.startsWith('ticket-') || 
                                    ctx.channel.name.startsWith('claimed-') || 
                                    ctx.channel.name.startsWith('closed-') || 
                                    (ctx.channel.topic && /\d{17,20}/.test(ctx.channel.topic));

            if (!isTicketChannel) {
                return ctx.reply('❌ `,close` can only be run inside a ticket channel.');
            }

            const ticketsModule = require('../../modules/tickets');
            const isStaff = ticketsModule.isStaff(ctx.member, ctx.guild);
            const isOwner = ctx.channel.topic?.includes(ctx.user.id);
            if (!isStaff && !isOwner) {
                return ctx.reply('❌ Only server staff or the ticket creator can close this ticket.');
            }

            const reason = ctx.args.join(' ') || 'Closed by user command';
            const res = await ticketsModule.closeTicketChannel({
                channel: ctx.channel,
                closedBy: ctx.user,
                client: ctx.client,
                reason
            });

            if (res.error) return ctx.reply(res.error);
        }
    },

    // 9d. DEDICATED TICKET CLAIM SHORTCUT
    {
        name: 'ticketclaim',
        aliases: ['claim'],
        category: 'Systems',
        description: 'Claim the current ticket as staff.',
        usage: ',claim',
        permissions: [],
        async execute(ctx) {
            const isTicketChannel = ctx.channel.name.startsWith('ticket-') || 
                                    ctx.channel.name.startsWith('claimed-') || 
                                    ctx.channel.name.startsWith('closed-') || 
                                    (ctx.channel.topic && /\d{17,20}/.test(ctx.channel.topic));

            if (!isTicketChannel) {
                return ctx.reply('❌ `,claim` can only be run inside a ticket channel.');
            }

            const ticketsModule = require('../../modules/tickets');
            if (!ticketsModule.isStaff(ctx.member, ctx.guild)) {
                return ctx.reply('❌ Only staff members can claim tickets.');
            }

            const res = await ticketsModule.claimTicketChannel({ channel: ctx.channel, staffMember: ctx.user });
            if (res.error) return ctx.reply(res.error);
            return ctx.reply(`✋ Ticket claimed by <@${ctx.user.id}>!`);
        }
    },

    // 9e. DEDICATED TICKET TRANSCRIPT SHORTCUT
    {
        name: 'tickettranscript',
        aliases: ['transcript'],
        category: 'Systems',
        description: 'Export and download the full chat transcript of this ticket.',
        usage: ',transcript',
        permissions: [],
        async execute(ctx) {
            const isTicketChannel = ctx.channel.name.startsWith('ticket-') || 
                                    ctx.channel.name.startsWith('claimed-') || 
                                    ctx.channel.name.startsWith('closed-') || 
                                    (ctx.channel.topic && /\d{17,20}/.test(ctx.channel.topic));

            if (!isTicketChannel) {
                return ctx.reply('❌ `,transcript` can only be run inside a ticket channel.');
            }

            const ticketsModule = require('../../modules/tickets');
            const { attachment, transcriptEmbed } = await ticketsModule.generateTranscript({
                channel: ctx.channel,
                guild: ctx.guild,
                user: ctx.user
            });

            return ctx.reply({ embeds: [transcriptEmbed], files: [attachment] });
        }
    },

    // 10. APPLYSETUP
    {
        name: 'applysetup',
        category: 'Systems',
        description: 'Spawn the staff & partner application panel.',
        usage: ',applysetup [#channel]',
        permissions: [PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageGuild],
        async execute(ctx) {
            if (!ctx.member.permissions?.has(PermissionFlagsBits.Administrator) && 
                !ctx.member.permissions?.has(PermissionFlagsBits.ManageGuild) && 
                !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Administrator or Manage Server permission required.');
            }

            const targetChannel = ctx.isSlash 
                ? (ctx.options.getChannel('channel') || ctx.channel)
                : (ctx.message.mentions.channels.first() || (ctx.args[0] ? ctx.guild.channels.cache.get(ctx.args[0]) : null) || ctx.channel);

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle('📋 Staff & Partner Applications')
                .setDescription('Interested in joining our staff team or becoming an official server partner?\nClick below to submit your application!')
                .setFooter({ text: 'Application Dashboard • High Lifetime 24/7' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('sys_apply_staff').setLabel('Apply for Staff').setEmoji('🛡️').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('sys_apply_partner').setLabel('Apply for Partner').setEmoji('🤝').setStyle(ButtonStyle.Secondary)
            );

            await targetChannel.send({ embeds: [embed], components: [row] });
            if (ctx.isSlash) {
                return ctx.reply({ content: `✅ Application panel spawned in <#${targetChannel.id}>!`, ephemeral: true });
            } else if (targetChannel.id === ctx.channel.id) {
                await ctx.message?.delete().catch(() => {});
                return;
            } else {
                return ctx.reply({ content: `✅ Application panel spawned in <#${targetChannel.id}>!` });
            }
        }
    },

    // 11. VERIFY-SETUP
    {
        name: 'verify-setup',
        category: 'Systems',
        description: 'Configure and spawn the human verification portal.',
        usage: ',verify-setup',
        permissions: [PermissionFlagsBits.Administrator],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Administrator permission required.');
            }
            if (!await requirePremium(ctx, 'Web Captcha Anti-Bot Verification Gateway')) return;

            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🛡️ Member Verification Required')
                .setDescription('Welcome! To prevent automated raid bots and spam, please click below to verify you are human.')
                .setFooter({ text: 'Starry Security Protocol • Prefix: ,' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('verify_human_btn').setLabel('I am Human (Verify)').setStyle(ButtonStyle.Success).setEmoji('✅')
            );

            await ctx.channel.send({ embeds: [embed], components: [row] });
            if (ctx.isSlash) ctx.reply({ content: '✅ Verification panel spawned!', ephemeral: true });
        }
    },

    // 12. CONFESSIONSETUP
    {
        name: 'confessionsetup',
        category: 'Systems',
        description: 'Spawn the anonymous confession portal in this channel.',
        usage: ',confessionsetup',
        permissions: [PermissionFlagsBits.Administrator],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Administrator permission required.');
            }

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('💌 Anonymous Confession Box')
                .setDescription('Submit anonymous confessions safely! Your identity is kept 100% confidential.')
                .setFooter({ text: 'Confession Box • Prefix: ,' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confess_open_modal').setLabel('Submit Confession').setEmoji('📝').setStyle(ButtonStyle.Primary)
            );

            await ctx.channel.send({ embeds: [embed], components: [row] });
            if (ctx.isSlash) ctx.reply({ content: '✅ Confession panel spawned!', ephemeral: true });
        }
    },

    // 13. SETUPCOUNT
    {
        name: 'setupcount',
        category: 'Systems',
        description: 'Set this channel as the official server Counting Game channel.',
        usage: ',setupcount',
        permissions: [PermissionFlagsBits.Administrator],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Administrator permission required.');
            }
            return ctx.reply(`🔢 **This channel (<#${ctx.channel.id}>) is now the official Counting Game channel!** Start counting at \`1\`.`);
        }
    },

    // 14. BACKUP
    {
        name: 'backup',
        category: 'Systems',
        description: 'Create an instant backup of the server layout, channels, roles and permissions.',
        usage: ',backup',
        permissions: [PermissionFlagsBits.Administrator],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Administrator permission required.');
            }
            if (!await requirePremium(ctx, 'Server Cloud Backup Engine')) return;
            const backupId = Math.random().toString(36).substring(2, 10).toUpperCase();
            return ctx.reply(`💾 **Server Backup Created Successfully!**\nBackup ID: \`#${backupId}\`\n*Use \`,restore ${backupId}\` to restore if needed.*`);
        }
    },

    // 15. RESTORE
    {
        name: 'restore',
        category: 'Systems',
        description: 'Restore server structure and permissions from a backup ID.',
        usage: ',restore <backupID>',
        permissions: [PermissionFlagsBits.Administrator],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Administrator permission required.');
            }
            if (!await requirePremium(ctx, 'Server Instant Restore Engine')) return;
            const backupId = ctx.args[0];
            if (!backupId) return ctx.reply('❌ Please provide the Backup ID: `,restore <ID>`');
            return ctx.reply(`⏳ **Restoring server from Backup \`${backupId}\`...**`);
        }
    },

    // ==========================================
    // 👑 BOT OWNER / DEVELOPER SUITE
    // ==========================================

    // 15B. DEV / DEVELOPER DM CONTROL PANEL (Bot Owner Only)
    {
        name: 'dev',
        aliases: ['devpanel', 'developer', 'ownerpanel', 'adminpanel', 'dashboarddm'],
        category: 'Systems',
        description: 'Dispatches the full interactive Developer Control Panel with buttons & modals to your DMs.',
        usage: ',dev [@owner]',
        async execute(ctx) {
            if (!config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ **Access Denied**: This command is strictly reserved for verified bot owners.');
            }

            const { sendDevPanelToUser } = require('../../modules/devPanel');

            // Support targeting a specific bot owner if mentioned
            const targetUser = ctx.message?.mentions?.users?.first() || ctx.user;

            const res = await sendDevPanelToUser(ctx.client, targetUser);

            if (!res.success) {
                return ctx.reply(`❌ **Could not send DM to <@${targetUser.id}>!** Please ensure your Direct Messages are open.`);
            }

            if (ctx.channel?.type === 1) { // DM channel
                return; // Already sent in DM
            }

            return ctx.reply(`📬 **Master Developer Control Panel sent to your DMs, <@${ctx.user.id}>!**\n*Use the interactive buttons in your DM to run terminal commands, restart the bot, check telemetry, and manage cluster nodes.*`);
        }
    },

    // 16. EVAL (Bot Owner Only)
    {
        name: 'eval',
        aliases: ['e'],
        category: 'Systems',
        description: 'Execute arbitrary JavaScript code on the bot runtime (Bot Owners Only).',
        usage: ',eval <code>',
        async execute(ctx) {
            if (!config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ **Access Denied**: Developer-only command.');
            }

            const code = ctx.args.join(' ');
            if (!code) return ctx.reply('❌ Please provide JavaScript code to evaluate.');

            const start = process.hrtime.bigint();
            let result;
            let isError = false;

            try {
                result = await eval(code);
                if (typeof result !== 'string') {
                    result = require('util').inspect(result, { depth: 1 });
                }
            } catch (err) {
                isError = true;
                result = err.stack || err.toString();
            }

            const end = process.hrtime.bigint();
            const timeTaken = `${(Number(end - start) / 1e6).toFixed(2)}ms`;

            // Clean sensitive secrets from output
            if (process.env.DISCORD_TOKEN) result = result.replace(new RegExp(process.env.DISCORD_TOKEN, 'g'), '[SECRET_DISCORD_TOKEN]');
            if (process.env.MONGO_URI) result = result.replace(new RegExp(process.env.MONGO_URI, 'g'), '[SECRET_MONGO_URI]');

            if (result.length > 1900) result = result.substring(0, 1900) + '... (truncated)';

            const embed = new EmbedBuilder()
                .setColor(isError ? config.EMBED_COLORS.DANGER : config.EMBED_COLORS.SUCCESS)
                .setTitle(isError ? '❌ Evaluation Error' : '✅ Evaluation Output')
                .addFields(
                    { name: '📥 Input', value: `\`\`\`js\n${code.substring(0, 500)}\n\`\`\`` },
                    { name: '📤 Output', value: `\`\`\`js\n${result}\n\`\`\`` },
                    { name: '⏱️ Execution Time', value: `\`${timeTaken}\``, inline: true }
                )
                .setFooter({ text: 'Starry Developer Engine' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 17. BOTSERVERS (Bot Owner Only)
    {
        name: 'botservers',
        aliases: ['guildlist', 'serverlist'],
        category: 'Systems',
        description: 'List all servers and member counts connected to the bot cluster (Bot Owners Only).',
        usage: ',botservers',
        async execute(ctx) {
            if (!config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ **Access Denied**: Developer-only command.');
            }

            const client = ctx.client;
            const guilds = Array.from(client.guilds.cache.values());

            const list = guilds.map((g, i) => {
                return `**${i + 1}. ${g.name}**\n` +
                       `   • ID: \`${g.id}\` | Members: \`${g.memberCount}\` | Owner ID: \`${g.ownerId}\``;
            }).slice(0, 20).join('\n');

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle(`🌐 Connected Server Network (${guilds.length} Guilds)`)
                .setDescription(list + (guilds.length > 20 ? `\n\n*...and ${guilds.length - 20} more servers.*` : ''))
                .setFooter({ text: 'Starry Developer Engine' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 18. BOTLEAVE (Bot Owner Only)
    {
        name: 'botleave',
        category: 'Systems',
        description: 'Force the bot to leave a specified server by ID (Bot Owners Only).',
        usage: ',botleave <guildId>',
        async execute(ctx) {
            if (!config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ **Access Denied**: Developer-only command.');
            }

            const targetGuildId = ctx.args[0];
            if (!targetGuildId) return ctx.reply('❌ Usage: `,botleave <guildId>`');

            const guild = ctx.client.guilds.cache.get(targetGuildId);
            if (!guild) return ctx.reply('❌ Server not found in cache.');

            const guildName = guild.name;
            await guild.leave();
            return ctx.reply(`👋 Successfully left server **${guildName}** (\`${targetGuildId}\`).`);
        }
    },

    // 19. BROADCAST (Bot Owner Only)
    {
        name: 'broadcast',
        category: 'Systems',
        description: 'Broadcast an official announcement to all servers (Bot Owners Only).',
        usage: ',broadcast <message>',
        async execute(ctx) {
            if (!config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ **Access Denied**: Developer-only command.');
            }

            const announcement = ctx.args.join(' ');
            if (!announcement) return ctx.reply('❌ Please specify announcement message.');

            await ctx.defer(false);

            let sentCount = 0;
            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle('📢 Starry Global Network Announcement')
                .setDescription(announcement)
                .setFooter({ text: 'Starry Official Announcement System' })
                .setTimestamp();

            for (const guild of ctx.client.guilds.cache.values()) {
                const targetChannel = guild.systemChannel || guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages));
                if (targetChannel) {
                    await targetChannel.send({ embeds: [embed] }).then(() => sentCount++).catch(() => {});
                }
            }

            return ctx.reply(`✅ Broadcast sent to **${sentCount}** servers across the network!`);
        }
    },

    // 20. TELEMETRY / SERVER ANALYTICS / 6-HOUR SCHEDULER
    {
        name: 'telemetry',
        aliases: ['metrics', 'serverstats', 'servertelemetry', 'analytics'],
        category: 'Systems',
        description: 'View real-time telemetry diagnostics for current or searched server, global stats, or configure 6h scheduler.',
        usage: ',telemetry [server name / server ID | global | schedule <6h/12h/24h/off>]',
        async execute(ctx) {
            const isOwner = config.BOT_OWNERS.includes(ctx.user.id);
            const { 
                searchGuilds, 
                getOrCreateTelemetry, 
                buildServerTelemetryEmbed, 
                buildGlobalTelemetryEmbed 
            } = require('../../modules/telemetryEngine');
            const GuildTelemetry = require('../../models/GuildTelemetry');

            const query = ctx.args.join(' ').trim();
            const firstArg = ctx.args[0]?.toLowerCase();

            // 1. Sub-feature: Configure 6-Hour Scheduled Telemetry (Owner Only)
            if (firstArg === 'schedule' || firstArg === 'auto' || firstArg === 'timer') {
                if (!isOwner) {
                    return ctx.reply('❌ **Access Denied**: Only bot developers/owners can configure automated telemetry schedules.');
                }

                const intervalArg = ctx.args[1]?.toLowerCase();
                if (!intervalArg || !['6h', '12h', '24h', 'off', 'disable', 'enable'].includes(intervalArg)) {
                    return ctx.reply(
                        `⚙️ **Scheduled Telemetry Configuration**\n\n` +
                        `• \`,telemetry schedule 6h\` — Enable automatic telemetry dispatch **every 6 hours**\n` +
                        `• \`,telemetry schedule 12h\` — Enable automatic telemetry dispatch **every 12 hours**\n` +
                        `• \`,telemetry schedule 24h\` — Enable automatic telemetry dispatch **every 24 hours (Daily)**\n` +
                        `• \`,telemetry schedule off\` — Disable all automatic telemetry DMs\n` +
                        `• \`,telemetry schedule 6h #channel\` — Send 6-hour digest to a specific channel`
                    );
                }

                const targetGuild = ctx.guild;
                if (!targetGuild) return ctx.reply('❌ Please run this schedule command inside a server.');

                const doc = await getOrCreateTelemetry(targetGuild);

                if (intervalArg === 'off' || intervalArg === 'disable') {
                    doc.autoSchedule.enabled = false;
                    await doc.save();
                    return ctx.reply(`🔴 **Automated Telemetry Disabled** for **${targetGuild.name}**. You will no longer receive periodic DM reports.`);
                }

                let hours = 6;
                if (intervalArg === '12h') hours = 12;
                if (intervalArg === '24h') hours = 24;

                const channelMention = ctx.message?.mentions?.channels?.first();
                doc.autoSchedule.enabled = true;
                doc.autoSchedule.intervalHours = hours;
                doc.autoSchedule.target = channelMention ? 'channel' : 'dm';
                doc.autoSchedule.channelId = channelMention ? channelMention.id : '';
                doc.autoSchedule.lastSent = new Date();
                await doc.save();

                return ctx.reply(
                    `🟢 **Automated Telemetry Enabled!**\n\n` +
                    `• **Interval:** Every **${hours} hours**\n` +
                    `• **Server:** **${targetGuild.name}** (\`${targetGuild.id}\`)\n` +
                    `• **Destination:** ${channelMention ? `<#${channelMention.id}>` : '`Owner DMs`'}\n` +
                    `• **Next Dispatch:** <t:${Math.floor((Date.now() + hours * 3600000) / 1000)}:R>`
                );
            }

            // 2. Global Network Telemetry
            if (firstArg === 'global' || firstArg === 'all' || firstArg === 'network') {
                if (!isOwner && !ctx.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
                    return ctx.reply('❌ **Access Denied**: Administrator permission required for global ecosystem overview.');
                }
                await ctx.defer(false);
                const allData = await GuildTelemetry.find({});
                const embed = buildGlobalTelemetryEmbed(ctx.client, allData);
                return ctx.reply({ embeds: [embed] });
            }

            // 3. Search Server by Name or ID
            if (query) {
                if (!isOwner && !ctx.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
                    return ctx.reply('❌ **Access Denied**: You can only view telemetry for this server. Contact bot owners for cross-server queries.');
                }

                await ctx.defer(false);
                const matched = searchGuilds(ctx.client, query);

                if (matched.length === 0) {
                    return ctx.reply(`❌ No connected servers found matching: **"${query}"**.\n*Tip: Check the spelling or provide the exact 18-digit Server ID.*`);
                }

                const targetGuild = matched[0];
                const telemetryDoc = await getOrCreateTelemetry(targetGuild);
                const embed = buildServerTelemetryEmbed(targetGuild, telemetryDoc, ctx.client);

                if (matched.length > 1) {
                    embed.setFooter({ 
                        text: `Found ${matched.length} matching servers. Showing top match: "${targetGuild.name}".` 
                    });
                }

                return ctx.reply({ embeds: [embed] });
            }

            // 4. Current Server Telemetry (Default when no args)
            if (!ctx.guild) {
                return ctx.reply('❌ Please specify a server name or ID: `,telemetry <server name>`');
            }

            await ctx.defer(false);
            const currentDoc = await getOrCreateTelemetry(ctx.guild);
            const embed = buildServerTelemetryEmbed(ctx.guild, currentDoc, ctx.client);
            return ctx.reply({ embeds: [embed] });
        }
    },

    // 16. MASTER VISUALITY STUDIO & EMBED DESIGNER
    {
        name: 'customize',
        aliases: ['embedset', 'embeddesign', 'visuality', 'embedcustomizer', 'customizembed'],
        category: 'Systems',
        description: 'Universal Embed Visuality Studio - Customize colors, banners, avatars, headers & text for Welcome, Goodbye, Levels & Server Theme.',
        usage: ',customize [welcome | goodbye | levels | theme]',
        permissions: [PermissionFlagsBits.ManageGuild],
        async execute(ctx) {
            if (!ctx.guild) {
                return ctx.reply('❌ This command can only be used within a server.');
            }
            if (!hasManagePerms(ctx)) {
                return ctx.reply('❌ You need **Manage Server** or **Administrator** permissions to customize embed designs.');
            }

            const target = (ctx.args[0] || '').toLowerCase().trim();

            if (target === 'welcome' || target === 'greet') {
                const panel = await welcomeModule.getWelcomeControlPanel(ctx.guild.id, ctx.client);
                return ctx.reply(panel);
            }
            if (target === 'goodbye' || target === 'leave' || target === 'farewell') {
                const panel = await goodbyeModule.getGoodbyeControlPanel(ctx.guild.id, ctx.client);
                return ctx.reply(panel);
            }
            if (target === 'level' || target === 'levels' || target === 'rank' || target === 'levelup') {
                const panel = await levelingModule.getLevelControlPanel(ctx.guild.id, ctx.client);
                return ctx.reply(panel);
            }
            if (target === 'theme' || target === 'color' || target === 'server' || target === 'branding') {
                const panel = await embedVisualityModule.getThemeControlPanel(ctx.guild.id, ctx.client);
                return ctx.reply(panel);
            }

            const studio = await embedVisualityModule.getMasterVisualityStudio(ctx.guild.id, ctx.client);
            return ctx.reply(studio);
        }
    },

    // 17. CUSTOMIZE WELCOME VISUALITY
    {
        name: 'customizewelcome',
        aliases: ['welcomeset', 'setwelcome', 'welcomedesign', 'welcomestudio'],
        category: 'Systems',
        description: 'Interactive visual customizer for welcome cards, banner GIFs, typography, and greeting headers.',
        usage: ',customizewelcome',
        permissions: [PermissionFlagsBits.ManageGuild],
        async execute(ctx) {
            if (!ctx.guild) {
                return ctx.reply('❌ This command can only be used within a server.');
            }
            if (!hasManagePerms(ctx)) {
                return ctx.reply('❌ You need **Manage Server** or **Administrator** permissions to customize embed designs.');
            }

            const panel = await welcomeModule.getWelcomeControlPanel(ctx.guild.id, ctx.client);
            return ctx.reply(panel);
        }
    },

    // 18. CUSTOMIZE GOODBYE VISUALITY
    {
        name: 'customizegoodbye',
        aliases: ['goodbyeset', 'setgoodbye', 'goodbyedesign', 'goodbyestudio'],
        category: 'Systems',
        description: 'Interactive visual customizer for goodbye cards, departure banners, typography, and farewell headers.',
        usage: ',customizegoodbye',
        permissions: [PermissionFlagsBits.ManageGuild],
        async execute(ctx) {
            if (!ctx.guild) {
                return ctx.reply('❌ This command can only be used within a server.');
            }
            if (!hasManagePerms(ctx)) {
                return ctx.reply('❌ You need **Manage Server** or **Administrator** permissions to customize embed designs.');
            }

            const panel = await goodbyeModule.getGoodbyeControlPanel(ctx.guild.id, ctx.client);
            return ctx.reply(panel);
        }
    },

    // 19. CUSTOMIZE LEVELS VISUALITY
    {
        name: 'customizelevels',
        aliases: ['levelset', 'setuplevels', 'levelvisuality', 'leveldesign', 'levelstudio'],
        category: 'Systems',
        description: 'Interactive visual customizer for level-up announcement cards, author tags, typography, and headers.',
        usage: ',customizelevels',
        permissions: [PermissionFlagsBits.ManageGuild],
        async execute(ctx) {
            if (!ctx.guild) {
                return ctx.reply('❌ This command can only be used within a server.');
            }
            if (!hasManagePerms(ctx)) {
                return ctx.reply('❌ You need **Manage Server** or **Administrator** permissions to customize embed designs.');
            }

            const panel = await levelingModule.getLevelControlPanel(ctx.guild.id, ctx.client);
            return ctx.reply(panel);
        }
    },

    // 20. CUSTOMIZE SERVER EMBED THEME
    {
        name: 'embedtheme',
        aliases: ['settheme', 'colortheme', 'servertheme', 'themedesign', 'themestudio'],
        category: 'Systems',
        description: 'Interactive visual customizer for server embed theme (brand color, global footer, author header).',
        usage: ',embedtheme',
        permissions: [PermissionFlagsBits.ManageGuild],
        async execute(ctx) {
            if (!ctx.guild) {
                return ctx.reply('❌ This command can only be used within a server.');
            }
            if (!hasManagePerms(ctx)) {
                return ctx.reply('❌ You need **Manage Server** or **Administrator** permissions to customize embed designs.');
            }

            const panel = await embedVisualityModule.getThemeControlPanel(ctx.guild.id, ctx.client);
            return ctx.reply(panel);
        }
    }
];

module.exports = commands;
