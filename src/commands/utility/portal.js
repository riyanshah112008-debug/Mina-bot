// ==========================================
// 🌌 STARRY ASTRAL PORTAL COMMAND SUITE
// File Path: src/commands/utility/portal.js
// Real-Time Encrypted Cross-Server Holographic Wormholes
// ==========================================
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    ChannelType 
} = require('discord.js');
const { 
    createPortal, 
    linkPortal, 
    unlinkPortal, 
    getPortal, 
    PUBLIC_HUB_CODE 
} = require('../../modules/astralPortal');

module.exports = {
    name: 'portal',
    description: '🌌 Real-time encrypted cross-server holographic portals connecting Discord servers',
    category: 'Utility',
    usage: ',portal [open|link|unlink|status|hub]',
    aliases: ['wormhole', 'interserver'],
    autoDefer: true,

    data: new SlashCommandBuilder()
        .setName('portal')
        .setDescription('🌌 Real-time encrypted cross-server holographic portals connecting Discord servers')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setContexts([0])
        .setIntegrationTypes([0])
        .addSubcommand(sub => 
            sub.setName('open')
               .setDescription('Open a new holographic portal wormhole in this channel')
               .addStringOption(opt => 
                   opt.setName('name')
                      .setDescription('Custom name for this wormhole portal')
                      .setRequired(false)
               )
        )
        .addSubcommand(sub => 
            sub.setName('link')
               .setDescription('Link this channel to an existing wormhole using its code')
               .addStringOption(opt => 
                   opt.setName('code')
                      .setDescription('The 8-character Wormhole Code (e.g. STAR-7A9B)')
                      .setRequired(true)
               )
        )
        .addSubcommand(sub => 
            sub.setName('unlink')
               .setDescription('Disconnect and close the portal in this channel')
        )
        .addSubcommand(sub => 
            sub.setName('status')
               .setDescription('View active portal status, connected servers, and transmission stats')
        )
        .addSubcommand(sub => 
            sub.setName('hub')
               .setDescription('Connect this channel to the Global Starry Astral Network Lounge')
        ),

    async execute(ctx) {
        const member = ctx.member;
        const guild = ctx.guild;
        const channel = ctx.channel;

        if (!member.permissions.has(PermissionFlagsBits.ManageGuild) && 
            !member.permissions.has(PermissionFlagsBits.Administrator)) {
            return ctx.reply('❌ You require **Manage Server** or **Administrator** permission to configure Astral Portals!');
        }

        let sub = 'status';
        if (ctx.isSlash) {
            sub = ctx.interaction.options.getSubcommand(false) || 'status';
        } else {
            sub = (ctx.args[0] || 'status').toLowerCase();
        }

        // ==========================================
        // SUBCOMMAND: OPEN
        // ==========================================
        if (sub === 'open' || sub === 'create') {
            const name = ctx.isSlash 
                ? ctx.interaction.options.getString('name') 
                : ctx.args.slice(1).join(' ');

            const res = await createPortal(guild, channel, ctx.user, name, 'direct');
            if (!res.success) {
                return ctx.reply(`❌ ${res.error}`);
            }

            const embed = new EmbedBuilder()
                .setColor('#7B68EE')
                .setTitle('🌌 Astral Wormhole Opened!')
                .setDescription(
                    `A new encrypted cross-server portal has been initiated in **<#${channel.id}>**!\n\n` +
                    `### 🔑 Wormhole Code: \`${res.portalCode}\`\n\n` +
                    `**How to link another server:**\n` +
                    `1. Invite Starry Bot to your partner/sister server.\n` +
                    `2. Run \`/portal link code: ${res.portalCode}\` (or \`,portal link ${res.portalCode}\`) in their channel.\n` +
                    `3. Transmissions, chats, files, and emojis will mirror in real-time between both servers!`
                )
                .setFooter({ text: 'Starry Astral Inter-Server Network • End-to-End Synced' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }

        // ==========================================
        // SUBCOMMAND: LINK
        // ==========================================
        if (sub === 'link' || sub === 'join' || sub === 'connect') {
            const code = ctx.isSlash 
                ? ctx.interaction.options.getString('code') 
                : ctx.args[1];

            if (!code) {
                return ctx.reply('❌ Please provide the Wormhole Code!\n*Usage: `/portal link code: STAR-XXXX` or `,portal link STAR-XXXX`*');
            }

            const res = await linkPortal(guild, channel, code, ctx.client);
            if (!res.success) {
                return ctx.reply(res.error);
            }

            const embed = new EmbedBuilder()
                .setColor('#00FFA3')
                .setTitle('🌌 Portal Synchronized Successfully!')
                .setDescription(
                    `✨ **<#${channel.id}>** is now linked to Wormhole **\`${code.toUpperCase()}\`**!\n\n` +
                    `Connected servers (**${res.portal.channels.length}**):\n` +
                    res.portal.channels.map(c => `• **${c.guildName}** (<#${c.channelId}>)`).join('\n') +
                    `\n\n*Any messages sent in this channel will now transmit to all connected servers in real-time!*`
                )
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }

        // ==========================================
        // SUBCOMMAND: UNLINK
        // ==========================================
        if (sub === 'unlink' || sub === 'close' || sub === 'disconnect') {
            const res = await unlinkPortal(guild.id, channel.id, ctx.client);
            if (!res.success) {
                return ctx.reply(`❌ ${res.error}`);
            }

            const embed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('🌌 Astral Portal Closed')
                .setDescription(`This channel has been safely disconnected from the cross-server wormhole network.`)
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }

        // ==========================================
        // SUBCOMMAND: HUB
        // ==========================================
        if (sub === 'hub' || sub === 'public') {
            // Link to Public Hub
            const res = await linkPortal(guild, channel, PUBLIC_HUB_CODE, ctx.client);
            if (!res.success) {
                // If hub doesn't exist yet, create it as hub type
                const createRes = await createPortal(guild, channel, ctx.user, 'Global Astral Hub', 'hub');
                if (createRes.success) {
                    const AstralPortal = require('../../models/AstralPortal');
                    await AstralPortal.updateOne({ portalCode: createRes.portalCode }, { portalCode: PUBLIC_HUB_CODE, type: 'hub' });
                    return ctx.reply(`🌌 **Global Astral Hub Initialized!** Other servers can now join via \`/portal hub\`!`);
                }
                return ctx.reply(res.error);
            }

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('🌌 Connected to Global Astral Lounge!')
                .setDescription(
                    `✨ <#${channel.id}> is now broadcasting to the **Global Starry Astral Hub**!\n` +
                    `Meet, chat, and socialize with members across multiple Discord communities in real-time!`
                )
                .setFooter({ text: 'Global Hub Code: STARRY-HUB-01 • Starry Astral Network' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }

        // ==========================================
        // SUBCOMMAND: STATUS
        // ==========================================
        const portal = getPortal(channel.id);
        if (!portal) {
            const idleEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🌌 Starry Astral Portals')
                .setDescription(
                    `This channel is not currently connected to any cross-server wormholes.\n\n` +
                    `**Commands:**\n` +
                    `• \`/portal open\` — Create a new private wormhole for you and partner servers\n` +
                    `• \`/portal link <code>\` — Connect this channel to an existing wormhole\n` +
                    `• \`/portal hub\` — Connect to the Global Multi-Server Lounge\n` +
                    `• \`/portal unlink\` — Disconnect and close the portal`
                )
                .setFooter({ text: 'Starry Cross-Server Technology' });

            return ctx.reply({ embeds: [idleEmbed] });
        }

        const statusEmbed = new EmbedBuilder()
            .setColor('#00FFA3')
            .setTitle(`🌌 Active Wormhole: ${portal.name || 'Astral Portal'}`)
            .addFields(
                { name: '🔑 Portal Code', value: `\`${portal.portalCode}\``, inline: true },
                { name: '🌐 Portal Type', value: `\`${(portal.type || 'direct').toUpperCase()}\``, inline: true },
                { name: '📊 Total Messages Mirror', value: `**${portal.totalMessages || 0}** messages`, inline: true },
                { 
                    name: `🔗 Connected Nodes (${portal.channels.length})`, 
                    value: portal.channels.map(c => `• **${c.guildName}** (<#${c.channelId}>)`).join('\n') 
                }
            )
            .setFooter({ text: 'Real-Time Inter-Server Sync • Powered by Starry' })
            .setTimestamp();

        return ctx.reply({ embeds: [statusEmbed] });
    }
};
