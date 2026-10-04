// ==========================================
// 🛡️ STARRY MODERATION SUITE - COMMAND DATA & EMBED BUILDER
// File Path: mod.js (Part 1 of 2)
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

const BOT_OWNERS = ['1465049039153135639', '1257676837249617971'];

const safeIcon = (url) => (url ? String(url) : undefined);

// Extracts human moderator if action was performed via automated bot
function parseModeratorDisplay(moderator, reason, guild) {
    if (!moderator) return '`Audit Log / Discord UI`';
    
    if (!moderator.bot) {
        return `<@${moderator.id}> (\`${moderator.tag || moderator.username}\`)`;
    }

    // Bot execution detected
    let humanModDisplay = null;

    if (reason) {
        // Match user ID in reason (e.g. "Mod ID: 123456789" or "<@123456789>")
        const idMatch = reason.match(/(?:mod(?:erator)?|by|responsible|staff|user)[:\s]*<@!?(\d{17,19})>|(\d{17,19})/i);
        if (idMatch) {
            const foundId = idMatch[1] || idMatch[2];
            if (foundId && foundId !== moderator.id) {
                humanModDisplay = `<@${foundId}>`;
            }
        }

        // Match username/tag in reason (e.g. "Responsible Mod: hotties" or "By hotties#0")
        if (!humanModDisplay) {
            const tagMatch = reason.match(/(?:responsible\s*mod(?:erator)?|mod(?:erator)?|by|issued\s*by)[:\s]*([a-zA-Z0-9_.]+)(?:#\d{4})?/i);
            if (tagMatch && tagMatch[1]) {
                const username = tagMatch[1].toLowerCase();
                const foundMember = guild?.members?.cache?.find(m => m.user.username.toLowerCase() === username || m.user.tag.toLowerCase() === username);
                if (foundMember) {
                    humanModDisplay = `<@${foundMember.id}> (\`${foundMember.user.tag}\`)`;
                } else {
                    humanModDisplay = `\`${tagMatch[1]}\``;
                }
            }
        }
    }

    if (humanModDisplay) {
        return `${humanModDisplay} (using <@${moderator.id}>)`;
    }

    return `<@${moderator.id}> (\`${moderator.tag || moderator.username}\`) [Bot]`;
}

function buildStarryLogEmbed({ title, emoji, color, target, moderator, reason, duration, expiresAt, caseId, extraFields = [], guild }) {
    const targetAvatar = target?.displayAvatarURL ? target.displayAvatarURL() : guild?.iconURL();
    const guildAvatar = guild?.iconURL();

    const embed = new EmbedBuilder()
        .setColor(color || '#ED4245')
        .setAuthor({ 
            name: `${emoji ? emoji + ' ' : ''}${title}`, 
            iconURL: safeIcon(targetAvatar)
        });

    if (target) {
        const targetTag = target.tag || (target.user ? target.user.tag : target.username || 'Unknown User');
        const targetId = target.id || 'N/A';
        embed.addFields({ name: '👤 Target User', value: `<@${targetId}> (\`${targetTag}\`)\n**User ID:** \`${targetId}\``, inline: false });
    }

    const modValue = parseModeratorDisplay(moderator, reason, guild);
    embed.addFields({ name: '🛡️ Moderator', value: modValue, inline: false });

    if (caseId) {
        embed.addFields({ name: '🏷️ Case ID', value: `\`#${caseId}\``, inline: true });
    }

    if (duration) {
        embed.addFields({ name: '⏳ Duration', value: `\`${duration}\``, inline: true });
    }

    if (expiresAt) {
        const timestamp = Math.floor(new Date(expiresAt).getTime() / 1000);
        embed.addFields({ name: '⏰ Until', value: `<t:${timestamp}:F> (<t:${timestamp}:R>)`, inline: true });
    }

    if (reason) {
        embed.addFields({ name: '📝 Reason', value: `>>> ${reason}`, inline: false });
    }

    if (extraFields.length > 0) {
        for (const field of extraFields) {
            embed.addFields(field);
        }
    }

    embed.setFooter({ 
        text: `User ID: ${target?.id || 'N/A'} • Starry Security Engine`, 
        iconURL: safeIcon(guildAvatar) 
    });
    embed.setTimestamp();

    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mod')
        .setDescription('Supreme all-in-one moderation command suite')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

        .addSubcommand(sub => sub
            .setName('ban')
            .setDescription('Ban a user from the server')
            .addUserOption(opt => opt.setName('target').setDescription('The user to ban').setRequired(true))
            .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ban'))
            .addIntegerOption(opt => opt.setName('delete_days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7))
        )

        .addSubcommand(sub => sub
            .setName('unban')
            .setDescription('Unban a user by ID')
            .addStringOption(opt => opt.setName('userid').setDescription('The ID of the user to unban').setRequired(true))
            .addStringOption(opt => opt.setName('reason').setDescription('Reason for the unban'))
        )

        .addSubcommand(sub => sub
            .setName('kick')
            .setDescription('Kick a member from the server')
            .addUserOption(opt => opt.setName('target').setDescription('The member to kick').setRequired(true))
            .addStringOption(opt => opt.setName('reason').setDescription('Reason for the kick'))
        )

        .addSubcommand(sub => sub
            .setName('timeout')
            .setDescription('Timeout/Mute a member')
            .addUserOption(opt => opt.setName('target').setDescription('The member to timeout').setRequired(true))
            .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(40320))
            .addStringOption(opt => opt.setName('reason').setDescription('Reason for the timeout'))
        )

        .addSubcommand(sub => sub
            .setName('untimeout')
            .setDescription('Remove timeout from a member')
            .addUserOption(opt => opt.setName('target').setDescription('The member to untimeout').setRequired(true))
            .addStringOption(opt => opt.setName('reason').setDescription('Reason for untimeout'))
        )

        .addSubcommand(sub => sub
            .setName('purge')
            .setDescription('Delete/Clear bulk messages from a channel')
            .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
            .addUserOption(opt => opt.setName('target').setDescription('Filter messages by target user'))
        )

        .addSubcommand(sub => sub
            .setName('warn')
            .setDescription('Warn a user')
            .addUserOption(opt => opt.setName('target').setDescription('The user to warn').setRequired(true))
            .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning').setRequired(true))
        )

        .addSubcommand(sub => sub
            .setName('warnings')
            .setDescription('View warnings for a user')
            .addUserOption(opt => opt.setName('target').setDescription('The user to inspect').setRequired(true))
        )

        .addSubcommand(sub => sub
            .setName('clearwarns')
            .setDescription('Clear all warnings for a user')
            .addUserOption(opt => opt.setName('target').setDescription('The user to clear warnings for').setRequired(true))
        )

        .addSubcommand(sub => sub
            .setName('panel')
            .setDescription('Open an interactive Moderation Control Panel for a user')
            .addUserOption(opt => opt.setName('target').setDescription('The member to moderate').setRequired(true))
        )

        .addSubcommand(sub => sub
            .setName('lockdown')
            .setDescription('Lock a text channel')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel to lock').addChannelTypes(ChannelType.GuildText))
            .addStringOption(opt => opt.setName('reason').setDescription('Reason for lockdown'))
        )

        .addSubcommand(sub => sub
            .setName('unlock')
            .setDescription('Unlock a text channel')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel to unlock').addChannelTypes(ChannelType.GuildText))
        )

        .addSubcommand(sub => sub
            .setName('nick')
            .setDescription('Change a user\'s nickname')
            .addUserOption(opt => opt.setName('target').setDescription('The member to nick').setRequired(true))
            .addStringOption(opt => opt.setName('nickname').setDescription('New nickname (leave blank to reset)'))
        ),
    // ==========================================
// 🛡️ MODERATION SUITE - EXECUTION DISPATCHER
// File Path: mod.js (Part 2 of 2)
// ==========================================
    async execute(interaction) {
        const { guild, member, options, user, client } = interaction;
        const subcommand = options.getSubcommand();
        const isOwner = BOT_OWNERS.includes(user.id);

        const checkUserPerm = (requiredPerm) => {
            if (isOwner) return true;
            return member.permissions.has(requiredPerm);
        };

        const canModerate = (targetMember) => {
            if (isOwner) return true;
            if (!targetMember) return true;
            if (targetMember.id === user.id) return false;
            if (targetMember.roles.highest.position >= member.roles.highest.position) return false;
            return true;
        };

        const getLogCh = async (type) => {
            if (typeof client.getLogChannel === 'function') {
                return await client.getLogChannel(guild, type);
            }
            return null;
        };

        await interaction.deferReply({ ephemeral: true });
        const caseId = Math.floor(Math.random() * 90000) + 10000;

        try {
            switch (subcommand) {
                case 'ban': {
                    if (!checkUserPerm(PermissionFlagsBits.BanMembers)) return interaction.editReply({ content: '❌ Permission denied.' });
                    const targetUser = options.getUser('target');
                    const reason = options.getString('reason') || 'No reason provided';
                    const deleteDays = options.getInteger('delete_days') || 0;
                    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

                    if (targetMember && !canModerate(targetMember)) return interaction.editReply({ content: '❌ Cannot ban due to role hierarchy.' });
                    if (targetMember && !targetMember.bannable && !isOwner) return interaction.editReply({ content: '❌ Bot lacks permission.' });

                    await guild.members.ban(targetUser.id, { reason: `${reason} | By: ${user.tag}`, deleteMessageSeconds: deleteDays * 86400 });

                    const logEmbed = buildStarryLogEmbed({
                        title: 'Member Banned',
                        emoji: '🔨',
                        color: '#ED4245',
                        target: targetUser,
                        moderator: user,
                        reason: reason,
                        caseId: caseId,
                        guild
                    });

                    const logChannel = await getLogCh('moderate');
                    if (logChannel) await logChannel.send({ embeds: [logEmbed] }).catch(() => {});

                    return interaction.editReply({ embeds: [logEmbed] });
                }

                case 'unban': {
                    if (!checkUserPerm(PermissionFlagsBits.BanMembers)) return interaction.editReply({ content: '❌ Permission denied.' });
                    const userId = options.getString('userid');
                    const reason = options.getString('reason') || 'No reason provided';

                    try {
                        await guild.members.unban(userId, `${reason} | By: ${user.tag}`);
                    } catch (err) {
                        return interaction.editReply({ content: `❌ Failed to unban ID \`${userId}\`.` });
                    }

                    const targetUser = await client.users.fetch(userId).catch(() => ({ id: userId, tag: `User (${userId})` }));
                    const logEmbed = buildStarryLogEmbed({
                        title: 'Member Unbanned',
                        emoji: '🟢',
                        color: '#2ECC71',
                        target: targetUser,
                        moderator: user,
                        reason: reason,
                        caseId: caseId,
                        guild
                    });

                    const logChannel = await getLogCh('moderate');
                    if (logChannel) await logChannel.send({ embeds: [logEmbed] }).catch(() => {});

                    return interaction.editReply({ embeds: [logEmbed] });
                }

                case 'kick': {
                    if (!checkUserPerm(PermissionFlagsBits.KickMembers)) return interaction.editReply({ content: '❌ Permission denied.' });
                    const targetUser = options.getUser('target');
                    const reason = options.getString('reason') || 'No reason provided';
                    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

                    if (!targetMember) return interaction.editReply({ content: '❌ User not in server.' });
                    if (!canModerate(targetMember)) return interaction.editReply({ content: '❌ Hierarchy protection triggered.' });

                    await targetMember.kick(`${reason} | By: ${user.tag}`);

                    const logEmbed = buildStarryLogEmbed({
                        title: 'Member Kicked',
                        emoji: '🚪',
                        color: '#DA373C',
                        target: targetUser,
                        moderator: user,
                        reason: reason,
                        caseId: caseId,
                        guild
                    });

                    const logChannel = await getLogCh('moderate');
                    if (logChannel) await logChannel.send({ embeds: [logEmbed] }).catch(() => {});

                    return interaction.editReply({ embeds: [logEmbed] });
                }

                case 'timeout': {
                    if (!checkUserPerm(PermissionFlagsBits.ModerateMembers)) return interaction.editReply({ content: '❌ Permission denied.' });
                    const targetUser = options.getUser('target');
                    const durationMins = options.getInteger('duration');
                    const reason = options.getString('reason') || 'No reason provided';
                    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

                    if (!targetMember) return interaction.editReply({ content: '❌ User not in server.' });
                    if (!canModerate(targetMember)) return interaction.editReply({ content: '❌ Hierarchy protection triggered.' });

                    const durationMs = durationMins * 60 * 1000;
                    const expiresAt = new Date(Date.now() + durationMs);

                    await targetMember.timeout(durationMs, `${reason} | By: ${user.tag}`);

                    const logEmbed = buildStarryLogEmbed({
                        title: 'Member Timed Out',
                        emoji: '⏰',
                        color: '#ED4245',
                        target: targetUser,
                        moderator: user,
                        reason: reason,
                        duration: `${durationMins}m`,
                        expiresAt: expiresAt,
                        caseId: caseId,
                        guild
                    });

                    const logChannel = await getLogCh('moderate');
                    if (logChannel) await logChannel.send({ embeds: [logEmbed] }).catch(() => {});

                    return interaction.editReply({ embeds: [logEmbed] });
                }

                case 'untimeout': {
                    if (!checkUserPerm(PermissionFlagsBits.ModerateMembers)) return interaction.editReply({ content: '❌ Permission denied.' });
                    const targetUser = options.getUser('target');
                    const reason = options.getString('reason') || 'No reason provided';
                    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

                    if (!targetMember) return interaction.editReply({ content: '❌ User not in server.' });

                    await targetMember.timeout(null, `${reason} | By: ${user.tag}`);

                    const logEmbed = buildStarryLogEmbed({
                        title: 'Member Timeout Removed',
                        emoji: '🔓',
                        color: '#2ECC71',
                        target: targetUser,
                        moderator: user,
                        reason: reason,
                        caseId: caseId,
                        guild
                    });

                    const logChannel = await getLogCh('moderate');
                    if (logChannel) await logChannel.send({ embeds: [logEmbed] }).catch(() => {});

                    return interaction.editReply({ embeds: [logEmbed] });
                }

                case 'purge': {
                    if (!checkUserPerm(PermissionFlagsBits.ManageMessages)) return interaction.editReply({ content: '❌ Permission denied.' });
                    const amount = options.getInteger('amount');
                    const targetFilter = options.getUser('target');
                    const channel = interaction.channel;

                    const fetched = await channel.messages.fetch({ limit: amount });
                    const toDelete = targetFilter ? fetched.filter(m => m.author.id === targetFilter.id) : fetched;
                    const deleted = await channel.bulkDelete(toDelete, true);

                    const logEmbed = buildStarryLogEmbed({
                        title: 'Channel Messages Purged',
                        emoji: '🧹',
                        color: '#FEE75C',
                        target: targetFilter || null,
                        moderator: user,
                        reason: `Purged ${deleted.size} messages in ${channel}`,
                        extraFields: [{ name: '📺 Channel', value: `<#${channel.id}>`, inline: true }],
                        caseId: caseId,
                        guild
                    });

                    const logChannel = (await getLogCh('messages')) || (await getLogCh('moderate'));
                    if (logChannel) await logChannel.send({ embeds: [logEmbed] }).catch(() => {});

                    return interaction.editReply({ embeds: [logEmbed] });
                }

                case 'warn': {
                    if (!checkUserPerm(PermissionFlagsBits.ModerateMembers)) return interaction.editReply({ content: '❌ Permission denied.' });
                    const targetUser = options.getUser('target');
                    const reason = options.getString('reason');

                    await targetUser.send(`⚠️ You were warned in **${guild.name}** for: ${reason}`).catch(() => null);

                    const logEmbed = buildStarryLogEmbed({
                        title: 'Member Warned',
                        emoji: '⚠️',
                        color: '#FEE75C',
                        target: targetUser,
                        moderator: user,
                        reason: reason,
                        caseId: caseId,
                        guild
                    });

                    const logChannel = await getLogCh('moderate');
                    if (logChannel) await logChannel.send({ embeds: [logEmbed] }).catch(() => {});

                    return interaction.editReply({ embeds: [logEmbed] });
                }

                case 'warnings': {
                    const targetUser = options.getUser('target');
                    const embed = new EmbedBuilder()
                        .setTitle(`📋 Warnings for ${targetUser.tag}`)
                        .setColor('#70a1ff')
                        .setDescription(`Displaying active warnings logged for <@${targetUser.id}>.`)
                        .setTimestamp();

                    return interaction.editReply({ embeds: [embed] });
                }

                case 'clearwarns': {
                    if (!checkUserPerm(PermissionFlagsBits.ModerateMembers)) return interaction.editReply({ content: '❌ Permission denied.' });
                    const targetUser = options.getUser('target');

                    const logEmbed = buildStarryLogEmbed({
                        title: 'Warnings Cleared',
                        emoji: '🧹',
                        color: '#2ECC71',
                        target: targetUser,
                        moderator: user,
                        reason: 'All active warnings cleared.',
                        caseId: caseId,
                        guild
                    });

                    const logChannel = await getLogCh('moderate');
                    if (logChannel) await logChannel.send({ embeds: [logEmbed] }).catch(() => {});

                    return interaction.editReply({ embeds: [logEmbed] });
                }

                case 'panel': {
                    if (!checkUserPerm(PermissionFlagsBits.ModerateMembers)) return interaction.editReply({ content: '❌ Permission denied.' });
                    const targetUser = options.getUser('target');
                    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

                    const embed = new EmbedBuilder()
                        .setTitle(`🛡️ Moderation Control Panel`)
                        .setColor('#5f27cd')
                        .setThumbnail(safeIcon(targetUser.displayAvatarURL()))
                        .addFields(
                            { name: 'Target User', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                            { name: 'Joined Server', value: targetMember ? `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>` : 'Not in server', inline: true },
                            { name: 'Roles', value: targetMember ? `${targetMember.roles.cache.size - 1}` : 'N/A', inline: true }
                        )
                        .setFooter({ text: `Requested by ${user.tag}`, iconURL: safeIcon(user.displayAvatarURL()) });

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`mp_warn_${targetUser.id}`).setLabel('Warn').setStyle(ButtonStyle.Warning),
                        new ButtonBuilder().setCustomId(`mp_timeout_${targetUser.id}`).setLabel('Timeout').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`mp_kick_${targetUser.id}`).setLabel('Kick').setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId(`mp_ban_${targetUser.id}`).setLabel('Ban').setStyle(ButtonStyle.Danger)
                    );

                    return interaction.editReply({ embeds: [embed], components: [row] });
                }

                case 'lockdown': {
                    if (!checkUserPerm(PermissionFlagsBits.ManageChannels)) return interaction.editReply({ content: '❌ Permission denied.' });
                    const targetChannel = options.getChannel('channel') || interaction.channel;
                    const reason = options.getString('reason') || 'No reason provided';

                    await targetChannel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }, { reason: `Lockdown: ${reason}` });

                    const logEmbed = buildStarryLogEmbed({
                        title: 'Channel Locked',
                        emoji: '🔒',
                        color: '#ED4245',
                        target: null,
                        moderator: user,
                        reason: reason,
                        extraFields: [{ name: '📺 Channel', value: `<#${targetChannel.id}>`, inline: true }],
                        caseId: caseId,
                        guild
                    });

                    const logChannel = await getLogCh('channels') || await getLogCh('moderate');
                    if (logChannel) await logChannel.send({ embeds: [logEmbed] }).catch(() => {});

                    return interaction.editReply({ embeds: [logEmbed] });
                }

                case 'unlock': {
                    if (!checkUserPerm(PermissionFlagsBits.ManageChannels)) return interaction.editReply({ content: '❌ Permission denied.' });
                    const targetChannel = options.getChannel('channel') || interaction.channel;

                    await targetChannel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });

                    const logEmbed = buildStarryLogEmbed({
                        title: 'Channel Unlocked',
                        emoji: '🔓',
                        color: '#2ECC71',
                        target: null,
                        moderator: user,
                        reason: 'Channel unlocked.',
                        extraFields: [{ name: '📺 Channel', value: `<#${targetChannel.id}>`, inline: true }],
                        caseId: caseId,
                        guild
                    });

                    const logChannel = await getLogCh('channels') || await getLogCh('moderate');
                    if (logChannel) await logChannel.send({ embeds: [logEmbed] }).catch(() => {});

                    return interaction.editReply({ embeds: [logEmbed] });
                }

                case 'nick': {
                    if (!checkUserPerm(PermissionFlagsBits.ManageNicknames)) return interaction.editReply({ content: '❌ Permission denied.' });
                    const targetUser = options.getUser('target');
                    const newNick = options.getString('nickname') || null;
                    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

                    if (!targetMember) return interaction.editReply({ content: '❌ User not in server.' });
                    if (!canModerate(targetMember)) return interaction.editReply({ content: '❌ Hierarchy protection triggered.' });

                    await targetMember.setNickname(newNick);

                    const logEmbed = buildStarryLogEmbed({
                        title: 'Nickname Updated',
                        emoji: '🏷️',
                        color: '#5865F2',
                        target: targetUser,
                        moderator: user,
                        reason: `Changed nickname to ${newNick ? `\`${newNick}\`` : '*Reset*'}`,
                        caseId: caseId,
                        guild
                    });

                    const logChannel = await getLogCh('members') || await getLogCh('moderate');
                    if (logChannel) await logChannel.send({ embeds: [logEmbed] }).catch(() => {});

                    return interaction.editReply({ embeds: [logEmbed] });
                }

                default:
                    return interaction.editReply({ content: '❌ Unknown subcommand.' });
            }
        } catch (error) {
            console.error(`Error in /mod ${subcommand}:`, error);
            return interaction.editReply({ content: `❌ An error occurred: \`${error.message}\`` });
        }
    }
};
            
