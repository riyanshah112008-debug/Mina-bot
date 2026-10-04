// ==========================================
// 📜 AUDIT LOG SUITE - MEMBER, VOICE & EVENT LISTENERS
// File Path: logs.js (Part 1 of 2)
// ==========================================
const { 
    EmbedBuilder, 
    Events, 
    SlashCommandBuilder, 
    PermissionFlagsBits,
    AttachmentBuilder, 
    AuditLogEvent
} = require('discord.js');
const mongoose = require('mongoose');

const logSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    logChannel: { type: String, default: null }
});

const LogSettings = mongoose.models.LogSettings || mongoose.model('LogSettings', logSettingsSchema);

const setLogsCommand = new SlashCommandBuilder()
    .setName('setlogs')
    .setDescription('Configure the server audit log channel in MongoDB')
    .addChannelOption(option => 
        option.setName('channel')
            .setDescription('The default channel where audit logs should be sent')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const safeIcon = (url) => (url ? String(url) : undefined);

function parseModeratorDisplay(moderator, reason, guild) {
    if (!moderator) return '`Audit Log / Discord UI`';
    
    if (!moderator.bot) {
        return `<@${moderator.id}> (\`${moderator.tag || moderator.username}\`)`;
    }

    let humanModDisplay = null;

    if (reason) {
        const idMatch = reason.match(/(?:mod(?:erator)?|by|responsible|staff|user)[:\s]*<@!?(\d{17,19})>|(\d{17,19})/i);
        if (idMatch) {
            const foundId = idMatch[1] || idMatch[2];
            if (foundId && foundId !== moderator.id) {
                humanModDisplay = `<@${foundId}>`;
            }
        }

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

function formatStarryLogEmbed({ title, emoji, color, target, moderator, reason, duration, expiresAt, extraFields = [], guild }) {
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

    if (duration) {
        embed.addFields({ name: '⏳ Duration', value: `\`${duration}\``, inline: true });
    }

    if (expiresAt) {
        const timestamp = Math.floor(new Date(expiresAt).getTime() / 1000);
        embed.addFields({ name: '⏰ Until', value: `<t:${timestamp}:F> (<t:${timestamp}:R>)`, inline: true });
    }

    if (reason) {
        const safeReason = String(reason).length > 1000 ? String(reason).slice(0, 995) + '...' : reason;
        embed.addFields({ name: '📝 Reason', value: `>>> ${safeReason}`, inline: false });
    }

    if (extraFields.length > 0) {
        for (const field of extraFields) {
            let val = String(field.value || 'N/A');
            if (val.length > 1020) val = val.slice(0, 1017) + '...';
            const name = String(field.name || 'Field').slice(0, 250);
            embed.addFields({ name, value: val, inline: !!field.inline });
        }
    }

    embed.setFooter({ 
        text: `User ID: ${target?.id || 'N/A'} • Starry Security Engine`, 
        iconURL: safeIcon(guildAvatar) 
    });
    embed.setTimestamp();

    return embed;
}

module.exports = (client) => {

    async function resolveLogChannel(guild, type = 'misc') {
        if (!guild) return null;

        if (typeof client.getLogChannel === 'function') {
            const smartChannel = await client.getLogChannel(guild, type);
            if (smartChannel) return smartChannel;
        }

        try {
            const config = await LogSettings.findOne({ guildId: guild.id });
            if (!config || !config.logChannel) return null;
            return guild.channels.cache.get(config.logChannel) || null;
        } catch (err) {
            return null;
        }
    }

    if (client.commands && typeof client.commands.set === 'function') {
        client.commands.set('setlogs', { data: setLogsCommand, execute: handleSetLogs });
    }

    async function handleSetLogs(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: [6] });
        } catch (e) { return; }

        const channel = interaction.options.getChannel('channel', true);

        await LogSettings.findOneAndUpdate(
            { guildId: interaction.guildId },
            { logChannel: channel.id },
            { upsert: true, new: true }
        );

        const embed = new EmbedBuilder()
            .setColor('#23A559')
            .setTitle('⚙️ Audit Logs Channel Updated')
            .setDescription(`Fallback audit logs will now be saved and sent to ${channel}.`)
            .setFooter({ text: 'Starry MongoDB Logger' });

        return interaction.editReply({ embeds: [embed] });
    }

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName === 'setlogs') await handleSetLogs(interaction);
    });

    client.on(Events.GuildMemberAdd, async (member) => {
        const logChannel = await resolveLogChannel(member.guild, 'access');
        if (!logChannel) return;

        const createdTimestamp = Math.floor(member.user.createdTimestamp / 1000);
        const embed = formatStarryLogEmbed({
            title: 'Member Joined',
            emoji: '📥',
            color: '#2ECC71',
            target: member.user,
            extraFields: [
                { name: '📅 Account Created', value: `<t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)`, inline: false },
                { name: '📊 Server Census', value: `Member **#${member.guild.memberCount}**`, inline: true }
            ],
            guild: member.guild
        });

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on(Events.GuildMemberRemove, async (member) => {
        const logChannel = await resolveLogChannel(member.guild, 'access');
        if (!logChannel) return;

        const embed = formatStarryLogEmbed({
            title: 'Member Left',
            emoji: '📤',
            color: '#ED4245',
            target: member.user,
            extraFields: [
                { name: '📊 Server Census', value: `Remaining Members: **${member.guild.memberCount}**`, inline: true }
            ],
            guild: member.guild
        });

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        const logChannel = await resolveLogChannel(newMember.guild, 'members');
        if (!logChannel) return;

        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;
        const addedRoles = newRoles.filter(r => !oldRoles.has(r.id));
        const removedRoles = oldRoles.filter(r => !newRoles.has(r.id));

        if (addedRoles.size > 0 || removedRoles.size > 0) {
            const roleChannel = await resolveLogChannel(newMember.guild, 'roles') || logChannel;

            if (addedRoles.size > 0) {
                const embed = formatStarryLogEmbed({
                    title: 'Member Granted Role(s)',
                    emoji: '🛡️',
                    color: '#2ECC71',
                    target: newMember.user,
                    extraFields: [{ name: '➕ Added Role(s)', value: addedRoles.map(r => r.toString()).join(', '), inline: false }],
                    guild: newMember.guild
                });
                return roleChannel.send({ embeds: [embed] }).catch(() => {});
            } else {
                const embed = formatStarryLogEmbed({
                    title: 'Member Removed Role(s)',
                    emoji: '🛑',
                    color: '#ED4245',
                    target: newMember.user,
                    extraFields: [{ name: '➖ Removed Role(s)', value: removedRoles.map(r => r.toString()).join(', '), inline: false }],
                    guild: newMember.guild
                });
                return roleChannel.send({ embeds: [embed] }).catch(() => {});
            }
        }

        if (oldMember.nickname !== newMember.nickname) {
            const embed = formatStarryLogEmbed({
                title: 'Member Nickname Changed',
                emoji: '🏷️',
                color: '#5865F2',
                target: newMember.user,
                extraFields: [
                    { name: '⬅️ Before', value: `\`${oldMember.nickname || oldMember.user.username}\``, inline: true },
                    { name: '➡️ After', value: `\`${newMember.nickname || newMember.user.username}\``, inline: true }
                ],
                guild: newMember.guild
            });

            return logChannel.send({ embeds: [embed] }).catch(() => {});
        }

        if (!oldMember.isCommunicationDisabled() && newMember.isCommunicationDisabled()) {
            const modChannel = await resolveLogChannel(newMember.guild, 'moderate') || logChannel;

            let executor = null;
            let auditReason = 'No reason provided';
            try {
                await new Promise(r => setTimeout(r, 1000));
                const fetchedLogs = await newMember.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberUpdate });
                const logEntry = fetchedLogs.entries.first();
                if (logEntry && logEntry.target.id === newMember.id && (Date.now() - logEntry.createdTimestamp) < 10000) {
                    executor = logEntry.executor;
                    auditReason = logEntry.reason || 'No reason provided';
                }
            } catch (e) {}

            const embed = formatStarryLogEmbed({
                title: 'Member Timed Out',
                emoji: '⏰',
                color: '#ED4245',
                target: newMember.user,
                moderator: executor,
                reason: auditReason,
                expiresAt: newMember.communicationDisabledUntilTimestamp,
                guild: newMember.guild
            });

            return modChannel.send({ embeds: [embed] }).catch(() => {});
        }
    });

    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        const guild = newState.guild || oldState.guild;
        const logChannel = await resolveLogChannel(guild, 'voice');
        if (!logChannel || !newState.member) return;

        const user = newState.member.user;

        if (!oldState.channelId && newState.channelId) {
            const embed = formatStarryLogEmbed({
                title: 'Joined Voice Channel',
                emoji: '🔊',
                color: '#2ECC71',
                target: user,
                extraFields: [{ name: '🎙️ Voice Channel', value: `<#${newState.channelId}>`, inline: true }],
                guild
            });

            return logChannel.send({ embeds: [embed] }).catch(() => {});
        }

        if (oldState.channelId && !newState.channelId) {
            const embed = formatStarryLogEmbed({
                title: 'Left Voice Channel',
                emoji: '🔇',
                color: '#ED4245',
                target: user,
                extraFields: [{ name: '🎙️ Voice Channel', value: `<#${oldState.channelId}>`, inline: true }],
                guild
            });

            return logChannel.send({ embeds: [embed] }).catch(() => {});
        }

        if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            const embed = formatStarryLogEmbed({
                title: 'Moved Voice Channel',
                emoji: '🔀',
                color: '#5865F2',
                target: user,
                extraFields: [
                    { name: '⬅️ From Channel', value: `<#${oldState.channelId}>`, inline: true },
                    { name: '➡️ To Channel', value: `<#${newState.channelId}>`, inline: true }
                ],
                guild
            });

            return logChannel.send({ embeds: [embed] }).catch(() => {});
        }

        if (oldState.serverMute !== newState.serverMute || oldState.serverDeaf !== newState.serverDeaf) {
            const action = newState.serverMute ? 'Muted' : newState.serverDeaf ? 'Deafened' : 'Unmuted/Undeafened';
            const embed = formatStarryLogEmbed({
                title: `Staff Voice State: ${action}`,
                emoji: '🎙️',
                color: '#E91E63',
                target: user,
                extraFields: [{ name: '🎙️ Voice Channel', value: `<#${newState.channelId}>`, inline: true }],
                guild
            });

            return logChannel.send({ embeds: [embed] }).catch(() => {});
        }
    });
                                            // ==========================================
// 📜 AUDIT LOG SUITE - MESSAGES, PURGE, WARN DETECTOR & SYSTEM EVENTS
// File Path: logs.js (Part 2 of 2)
// ==========================================
    // ==========================================
    // ⚠️ AUTOMATED WARNING INTERCEPTOR
    // Detects when an automated warning message is dispatched in any channel
    // and automatically logs it to #logs-moderate with the human moderator extracted!
    // ==========================================
    client.on(Events.MessageCreate, async (message) => {
        if (!message.guild || !message.author.bot) return;

        const isWarningMsg = (message.content && message.content.toLowerCase().includes('has been warned')) ||
                             (message.embeds.length > 0 && message.embeds[0].description?.toLowerCase().includes('has been warned'));

        if (!isWarningMsg) return;

        const modChannel = await resolveLogChannel(message.guild, 'moderate');
        if (!modChannel || message.channel.id === modChannel.id) return;

        let targetUser = message.mentions.users.first();
        let reason = 'No reason provided';
        let humanModerator = null;

        if (message.reference) {
            const refMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
            if (refMsg) {
                humanModerator = refMsg.author;
            }
        }

        if (!humanModerator) {
            const recentMsgs = await message.channel.messages.fetch({ limit: 10 }).catch(() => null);
            if (recentMsgs) {
                const triggerMsg = recentMsgs.find(m => !m.author.bot && m.content.toLowerCase().includes('warn'));
                if (triggerMsg) humanModerator = triggerMsg.author;
            }
        }

        if (!targetUser) {
            const textToSearch = message.content || message.embeds[0]?.description || '';
            const idMatch = textToSearch.match(/\d{17,19}/);
            if (idMatch) {
                targetUser = await client.users.fetch(idMatch[0]).catch(() => null);
            }
        }

        if (message.embeds.length > 0) {
            const fields = message.embeds[0].fields || [];
            const reasonField = fields.find(f => f.name.toLowerCase().includes('reason'));
            if (reasonField) reason = reasonField.value;
        }

        const caseId = Math.floor(Math.random() * 90000) + 10000;
        const embed = formatStarryLogEmbed({
            title: 'Member Warned',
            emoji: '⚠️',
            color: '#FEE75C',
            target: targetUser || { id: 'Unknown', tag: 'Warned Member' },
            moderator: humanModerator || message.author,
            reason: reason,
            extraFields: [{ name: '🏷️ Case ID', value: `\`#${caseId}\``, inline: true }],
            guild: message.guild
        });

        await modChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on(Events.MessageDelete, async (message) => {
        if (!message.guild) return;

        const logChannel = await resolveLogChannel(message.guild, 'messages');
        if (!logChannel) return;
        if (message.channel.id === logChannel.id) return;

        const embed = formatStarryLogEmbed({
            title: 'Message Deleted',
            emoji: '🗑️',
            color: '#ED4245',
            target: message.author || { id: 'Unknown', tag: 'Unknown' },
            extraFields: [
                { name: '📺 Channel', value: `<#${message.channel.id}> (\`${message.channel.name}\`)`, inline: true },
                { name: '🆔 Message ID', value: `\`${message.id}\``, inline: true },
                { name: '📝 Content', value: message.content ? `>>> ${message.content.slice(0, 1000)}` : '*[No text content or attachment]*', inline: false }
            ],
            guild: message.guild
        });

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
        if (newMessage.partial) {
            try { await newMessage.fetch(); } catch (e) { return; }
        }

        if (!newMessage.guild || newMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;

        const logChannel = await resolveLogChannel(newMessage.guild, 'messages');
        if (!logChannel) return;

        const embed = formatStarryLogEmbed({
            title: 'Message Edited',
            emoji: '✏️',
            color: '#FEE75C',
            target: newMessage.author,
            extraFields: [
                { name: '📺 Channel', value: `<#${newMessage.channel.id}>`, inline: true },
                { name: '🔗 Jump Link', value: `[Click Here](${newMessage.url})`, inline: true },
                { name: '⬅️ Before', value: `>>> ${oldMessage.content?.slice(0, 900) || '*None*'}`, inline: false },
                { name: '➡️ After', value: `>>> ${newMessage.content?.slice(0, 900) || '*None*'}`, inline: false }
            ],
            guild: newMessage.guild
        });

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on(Events.MessageDeleteBulk, async (messages, channel) => {
        if (!channel || !channel.guild) return;

        const logChannel = await resolveLogChannel(channel.guild, 'messages');
        if (!logChannel) return;
        if (channel.id === logChannel.id) return;

        const sortedMessages = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        let executorTag = 'Unknown Staff / Bot Command';
        let executorUser = null;
        try {
            await new Promise(r => setTimeout(r, 1000));
            const fetchedLogs = await channel.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.MessageBulkDelete
            }).catch(() => null);

            const bulkLog = fetchedLogs?.entries.first();
            if (bulkLog && (Date.now() - bulkLog.createdTimestamp) < 15000) {
                executorTag = `${bulkLog.executor.tag} (${bulkLog.executor.id})`;
                executorUser = bulkLog.executor;
            }
        } catch (e) {}

        let transcriptText = `====================================================================================================\n`;
        transcriptText += `                           STARRY SUPREME AUDIT LOG - PURGE TRANSCRIPT                             \n`;
        transcriptText += `====================================================================================================\n`;
        transcriptText += `Server         : ${channel.guild.name} (ID: ${channel.guild.id})\n`;
        transcriptText += `Channel        : #${channel.name} (ID: ${channel.id})\n`;
        transcriptText += `Purged Count   : ${sortedMessages.length} Messages\n`;
        transcriptText += `Triggered By   : ${executorTag}\n`;
        transcriptText += `Generated At   : ${new Date().toUTCString()}\n`;
        transcriptText += `====================================================================================================\n\n`;

        sortedMessages.forEach((msg, index) => {
            const timeStr = new Date(msg.createdTimestamp).toUTCString();
            const authorTag = msg.author ? `${msg.author.tag} (ID: ${msg.author.id}) ${msg.author.bot ? '[BOT]' : '[USER]'}` : 'Unknown Author';
            const contentStr = msg.content ? msg.content : '[No Text Content / Attachment or Embed Only]';

            transcriptText += `----------------------------------------------------------------------------------------------------\n`;
            transcriptText += `[${String(index + 1).padStart(2, '0')}] MSG ID: ${msg.id} | TIME: ${timeStr}\n`;
            transcriptText += `AUTHOR : ${authorTag}\n`;
            transcriptText += `CONTENT:\n${contentStr}\n`;
            transcriptText += `----------------------------------------------------------------------------------------------------\n\n`;
        });

        const transcriptBuffer = Buffer.from(transcriptText, 'utf-8');
        const transcriptFile = new AttachmentBuilder(transcriptBuffer, { 
            name: `${channel.guild.name.replace(/[^a-zA-Z0-9]/g, '_')}_PurgeLog_${channel.name}_${Date.now()}.txt` 
        });

        const purgeEmbed = formatStarryLogEmbed({
            title: 'Bulk Messages Purged',
            emoji: '🧹',
            color: '#FEE75C',
            target: null,
            moderator: executorUser,
            extraFields: [
                { name: '📺 Channel', value: `<#${channel.id}>`, inline: true },
                { name: '📊 Amount Deleted', value: `\`${sortedMessages.length}\` messages`, inline: true }
            ],
            guild: channel.guild
        });

        await logChannel.send({ 
            embeds: [purgeEmbed], 
            files: [transcriptFile] 
        }).catch(console.error);
    });

    client.on(Events.InviteCreate, async (invite) => {
        const logChannel = await resolveLogChannel(invite.guild, 'access');
        if (!logChannel) return;

        const embed = formatStarryLogEmbed({
            title: 'Invite Code Created',
            emoji: '🔗',
            color: '#5865F2',
            target: invite.inviter,
            extraFields: [
                { name: '🔑 Code', value: `\`${invite.code}\``, inline: true },
                { name: '📺 Channel', value: `${invite.channel}`, inline: true }
            ],
            guild: invite.guild
        });

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on(Events.InviteDelete, async (invite) => {
        const logChannel = await resolveLogChannel(invite.guild, 'access');
        if (!logChannel) return;

        const embed = formatStarryLogEmbed({
            title: 'Invite Revoked / Expired',
            emoji: '🗑️',
            color: '#ED4245',
            target: null,
            extraFields: [{ name: '🔑 Code', value: `\`${invite.code}\``, inline: true }],
            guild: invite.guild
        });

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on(Events.ChannelCreate, async (channel) => {
        if (!channel.guild) return;
        const logChannel = await resolveLogChannel(channel.guild, 'channels');
        if (!logChannel) return;

        const embed = formatStarryLogEmbed({
            title: 'Channel Created',
            emoji: '📺',
            color: '#23A559',
            target: null,
            extraFields: [
                { name: '📛 Name', value: `<#${channel.id}> (\`${channel.name}\`)`, inline: true },
                { name: '🆔 Channel ID', value: `\`${channel.id}\``, inline: true }
            ],
            guild: channel.guild
        });

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on(Events.ChannelDelete, async (channel) => {
        if (!channel.guild) return;
        const logChannel = await resolveLogChannel(channel.guild, 'channels');
        if (!logChannel) return;

        const embed = formatStarryLogEmbed({
            title: 'Channel Deleted',
            emoji: '🗑️',
            color: '#DA373C',
            target: null,
            extraFields: [
                { name: '📛 Name', value: `\`${channel.name}\``, inline: true },
                { name: '🆔 Channel ID', value: `\`${channel.id}\``, inline: true }
            ],
            guild: channel.guild
        });

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on(Events.GuildBanAdd, async (ban) => {
        const logChannel = await resolveLogChannel(ban.guild, 'moderate');
        if (!logChannel) return;

        let executor = null;
        try {
            await new Promise(r => setTimeout(r, 1000));
            const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
            const logEntry = fetchedLogs.entries.first();
            if (logEntry && logEntry.target.id === ban.user.id && (Date.now() - logEntry.createdTimestamp) < 10000) {
                executor = logEntry.executor;
            }
        } catch (e) {}

        const embed = formatStarryLogEmbed({
            title: 'Member Banned',
            emoji: '🔨',
            color: '#ED4245',
            target: ban.user,
            moderator: executor,
            reason: ban.reason || 'No reason provided.',
            guild: ban.guild
        });

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on(Events.GuildBanRemove, async (ban) => {
        const logChannel = await resolveLogChannel(ban.guild, 'moderate');
        if (!logChannel) return;

        let executor = null;
        try {
            await new Promise(r => setTimeout(r, 1000));
            const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanRemove });
            const logEntry = fetchedLogs.entries.first();
            if (logEntry && logEntry.target.id === ban.user.id && (Date.now() - logEntry.createdTimestamp) < 10000) {
                executor = logEntry.executor;
            }
        } catch (e) {}

        const embed = formatStarryLogEmbed({
            title: 'Member Unbanned',
            emoji: '🔓',
            color: '#57F287',
            target: ban.user,
            moderator: executor,
            reason: 'Unbanned via Server Audit Log',
            guild: ban.guild
        });

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    });

};

module.exports.LogSettings = LogSettings;
module.exports.setLogsData = setLogsCommand;
                                       
