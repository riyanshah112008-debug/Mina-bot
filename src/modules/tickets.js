const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionsBitField, 
    AttachmentBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    MessageFlags
} = require('discord.js');
const mongoose = require('mongoose');

const EPHEMERAL_FLAG = MessageFlags ? MessageFlags.Ephemeral : 64;
const isDbConnected = () => Boolean(mongoose.connection && mongoose.connection.readyState === 1);

// Helper: Strict Staff Check (Admin, Manage Channels, Manage Guild, configured Support Role, or Staff roles)
function isStaff(member, guild = null) {
    if (!member) return false;
    if (member.permissions?.has(PermissionsBitField.Flags.Administrator) ||
        member.permissions?.has(PermissionsBitField.Flags.ManageChannels) ||
        member.permissions?.has(PermissionsBitField.Flags.ManageGuild)) {
        return true;
    }

    try {
        const config = require('../config');
        if (config.BOT_OWNERS && Array.isArray(config.BOT_OWNERS) && config.BOT_OWNERS.includes(member.id)) {
            return true;
        }
    } catch (e) {}

    const g = guild || member.guild;
    if (g) {
        try {
            const ServerSettings = require('../models/ServerSettings');
            const cachedSupportRole = ServerSettings.schema ? g._cachedSupportRoleId : null;
            if (cachedSupportRole && member.roles.cache.has(cachedSupportRole)) {
                return true;
            }
        } catch (e) {}
    }

    const roles = member.roles?.cache;
    if (roles) {
        if (typeof roles.some === 'function') {
            return roles.some(r => ['staff', 'moderator', 'admin', 'support', 'helper', 'mod'].includes(r.name?.toLowerCase()));
        }
        for (const r of roles.values ? roles.values() : roles) {
            if (['staff', 'moderator', 'admin', 'support', 'helper', 'mod'].includes(r?.name?.toLowerCase())) {
                return true;
            }
        }
    }

    return false;
}

// Helper: Ensures categories exist with proper visibility and permissions
async function getOrCreateTicketCategory(guild, name, client) {
    try {
        const channels = await guild.channels.fetch().catch(() => guild.channels.cache);
        const channelList = channels ? (typeof channels.find === 'function' ? channels : Array.from(channels.values ? channels.values() : [])) : [];
        let cat = channelList.find ? channelList.find(c => c && c.type === ChannelType.GuildCategory && c.name?.toUpperCase() === name.toUpperCase()) : null;

        const rolesList = guild.roles?.cache ? (typeof guild.roles.cache.find === 'function' ? guild.roles.cache : Array.from(guild.roles.cache.values ? guild.roles.cache.values() : [])) : [];
        let staffRole = rolesList.find ? rolesList.find(r => ['staff', 'moderator', 'admin', 'support'].includes(r.name?.toLowerCase())) : null;
        const botId = client?.user?.id || guild.client?.user?.id;

        const categoryPermissions = [
            { 
                id: guild.roles.everyone.id, 
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            ...(botId ? [{ 
                id: botId, 
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.SendMessages] 
            }] : []),
            ...(staffRole ? [{ 
                id: staffRole.id, 
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] 
            }] : [])
        ];

        if (!cat) {
            cat = await guild.channels.create({
                name: name.toUpperCase(),
                type: ChannelType.GuildCategory,
                permissionOverwrites: categoryPermissions
            });
        }
        return cat;
    } catch (err) {
        console.error(`❌ Category Creation Error (${name}):`, err);
        return null;
    }
}

// Helper: Programmatically setup ticket panel in target channel
async function setupTicketPanel({ guild, channel, client, supportRole = null, category = null, title = null, description = null }) {
    let settings = null;
    if (isDbConnected()) {
        try {
            const ServerSettings = require('../models/ServerSettings');
            settings = await ServerSettings.findOne({ guildId: guild.id });
            if (!settings) {
                settings = new ServerSettings({ guildId: guild.id });
            }
            if (!settings.tickets) settings.tickets = {};
            settings.tickets.enabled = true;
            settings.tickets.panelChannelId = channel.id;
            if (supportRole) {
                settings.tickets.supportRoleId = supportRole.id;
                guild._cachedSupportRoleId = supportRole.id;
            }
            if (category) settings.tickets.categoryId = category.id;
            await settings.save();
        } catch (err) {
            console.warn('⚠️ Could not save ticket settings to DB:', err.message);
        }
    } else if (supportRole) {
        guild._cachedSupportRoleId = supportRole.id;
    }

    const embed = new EmbedBuilder()
        .setColor('#00F2FE')
        .setTitle(title || '🎫 Support & Assistance Hub')
        .setDescription(
            description ||
            `Welcome to our server support portal!\n\n` +
            `• Click **Create Ticket** below to open a private ticket with our staff.\n` +
            `• Staff will be notified immediately to assist you.\n\n` +
            `*Tickets are private and accessible only by you and our support team.*`
        )
        .addFields(
            { name: '🛡️ Support Team', value: supportRole ? `<@&${supportRole.id}>` : '`Server Staff & Admins`', inline: true },
            { name: '⚡ Response Time', value: '`Quick / 24/7 Monitored`', inline: true }
        )
        .setFooter({ text: 'Starry Ticket Engine • High Lifetime 24/7' })
        .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sys_create_ticket').setLabel('Create Ticket').setStyle(ButtonStyle.Primary).setEmoji('📩'),
        new ButtonBuilder().setCustomId('sys_apply_staff').setLabel('Apply for Staff').setStyle(ButtonStyle.Success).setEmoji('📝')
    );

    const panelMsg = await channel.send({ embeds: [embed], components: [buttons] });
    return { success: true, message: panelMsg, settings };
}

// Helper: Programmatically create a ticket channel for a user
async function createTicketChannel({ guild, user, client, reason = 'General Support' }) {
    let settings = null;
    if (isDbConnected()) {
        try {
            const ServerSettings = require('../models/ServerSettings');
            settings = await ServerSettings.findOne({ guildId: guild.id }).lean();
            if (settings?.tickets?.supportRoleId) {
                guild._cachedSupportRoleId = settings.tickets.supportRoleId;
            }
        } catch (e) {}
    }

    let supportRole = null;
    if (settings?.tickets?.supportRoleId || guild._cachedSupportRoleId) {
        const sRoleId = settings?.tickets?.supportRoleId || guild._cachedSupportRoleId;
        supportRole = guild.roles.cache.get(sRoleId) || await guild.roles.fetch(sRoleId).catch(() => null);
    }
    if (!supportRole) {
        supportRole = guild.roles.cache.find(r => ['staff', 'moderator', 'admin', 'support'].includes(r.name.toLowerCase()));
    }

    let openedCategory = null;
    if (settings?.tickets?.categoryId) {
        openedCategory = guild.channels.cache.get(settings.tickets.categoryId) || await guild.channels.fetch(settings.tickets.categoryId).catch(() => null);
    }
    if (!openedCategory) {
        openedCategory = await getOrCreateTicketCategory(guild, 'OPENED TICKETS', client);
    }

    const ticketNum = Math.floor(1000 + Math.random() * 9000);
    const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'user';
    const botId = client?.user?.id || guild.client?.user?.id;

    const ticketChannel = await guild.channels.create({
        name: `ticket-${cleanUsername}-${ticketNum}`,
        type: ChannelType.GuildText,
        topic: `${user.id} | Opened: ${new Date().toISOString()}`,
        parent: openedCategory ? openedCategory.id : undefined,
        permissionOverwrites: [
            { 
                id: guild.roles.everyone.id, 
                deny: [PermissionsBitField.Flags.ViewChannel] 
            },
            { 
                id: user.id, 
                allow: [
                    PermissionsBitField.Flags.ViewChannel, 
                    PermissionsBitField.Flags.SendMessages, 
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.AttachFiles,
                    PermissionsBitField.Flags.EmbedLinks
                ] 
            },
            ...(botId ? [{ 
                id: botId, 
                allow: [
                    PermissionsBitField.Flags.ViewChannel, 
                    PermissionsBitField.Flags.SendMessages, 
                    PermissionsBitField.Flags.ManageChannels,
                    PermissionsBitField.Flags.ReadMessageHistory
                ] 
            }] : []),
            ...(supportRole ? [{ 
                id: supportRole.id, 
                allow: [
                    PermissionsBitField.Flags.ViewChannel, 
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ] 
            }] : [])
        ]
    });

    if (openedCategory) {
        await ticketChannel.setParent(openedCategory.id, { lockPermissions: false }).catch(() => {});
    }

    const ticketEmbed = new EmbedBuilder()
        .setColor('#00F2FE')
        .setTitle(`🎫 Support Ticket #${ticketNum} | ${user.username}`)
        .setDescription(`Hello <@${user.id}>! Staff has been notified and will assist you shortly.\n\nPlease describe your issue or inquiry in detail below.`)
        .addFields(
            { name: '📌 Status', value: '`UNCLAIMED 🟡`', inline: true },
            { name: '👤 Creator', value: `<@${user.id}>`, inline: true },
            { name: '📝 Reason', value: `\`${reason}\``, inline: true }
        )
        .setFooter({ text: 'Starry Ticket Engine • High Lifetime' })
        .setTimestamp();

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sys_claim_ticket').setLabel('Claim Ticket').setStyle(ButtonStyle.Success).setEmoji('✋'),
        new ButtonBuilder().setCustomId('sys_close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    );

    const pingContent = `<@${user.id}> ${supportRole ? `<@&${supportRole.id}>` : ''}`;
    await ticketChannel.send({ content: pingContent, embeds: [ticketEmbed], components: [actionRow] });

    return ticketChannel;
}

// Helper: Programmatically close a ticket channel
async function closeTicketChannel({ channel, closedBy, client, reason = 'No reason provided' }) {
    const guild = channel.guild;

    // Prevent duplicate closes
    if (channel.parent?.name.toUpperCase() === 'CLOSED TICKETS' || channel.name.startsWith('closed-')) {
        return { error: '❌ This ticket is already closed!' };
    }

    const cleanName = channel.name.replace('ticket-', '').replace('claimed-', '');
    await channel.setName(`closed-${cleanName}`).catch(() => {});

    const closedCategory = await getOrCreateTicketCategory(guild, 'CLOSED TICKETS', client);
    if (closedCategory) {
        await channel.setParent(closedCategory.id, { lockPermissions: false }).catch(() => {});
    }

    // Revoke send messages from ticket owner
    const rawTopic = channel.topic || '';
    const ownerIdMatch = rawTopic.match(/\d{17,20}/);
    if (ownerIdMatch) {
        await channel.permissionOverwrites.edit(ownerIdMatch[0], { SendMessages: false }).catch(() => {});
    }

    const closedEmbed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('🔒 Ticket Closed')
        .setDescription(
            `Ticket closed by <@${closedBy.id}>.\n` +
            (reason && reason !== 'No reason provided' ? `**Reason:** ${reason}\n` : '') +
            `Moved to **CLOSED TICKETS**. Use the options below to save a transcript or delete this channel.`
        )
        .setTimestamp();

    const managementRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sys_transcript_ticket').setLabel('Save Transcript').setStyle(ButtonStyle.Primary).setEmoji('📝'),
        new ButtonBuilder().setCustomId('sys_delete_ticket').setLabel('Delete Ticket').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
    );

    await channel.send({ embeds: [closedEmbed], components: [managementRow] });
    return { success: true, channel };
}

// Helper: Programmatically claim a ticket channel
async function claimTicketChannel({ channel, staffMember }) {
    if (channel.name.startsWith('claimed-')) {
        return { error: '❌ This ticket is already claimed!' };
    }

    const cleanName = channel.name.replace('ticket-', '').replace('claimed-', '');
    await channel.setName(`claimed-${cleanName}`).catch(() => {});

    await channel.permissionOverwrites.edit(staffMember.id, {
        ViewChannel: true,
        SendMessages: true,
        ManageChannels: true
    }).catch(() => {});

    const claimedEmbed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('✋ Ticket Claimed')
        .setDescription(`This ticket is now being handled by <@${staffMember.id}>.`)
        .setTimestamp();

    const updatedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sys_claim_ticket').setLabel(`Claimed by ${staffMember.username}`).setStyle(ButtonStyle.Secondary).setDisabled(true).setEmoji('✅'),
        new ButtonBuilder().setCustomId('sys_close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    );

    await channel.send({ embeds: [claimedEmbed], components: [updatedRow] }).catch(() => {});
    return { success: true };
}

// Helper: Add member to ticket
async function addMemberToTicket({ channel, member }) {
    await channel.permissionOverwrites.edit(member.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true
    });

    const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setDescription(`✅ <@${member.id}> has been added to this ticket.`);
    await channel.send({ embeds: [embed] }).catch(() => {});
    return { success: true };
}

// Helper: Remove member from ticket
async function removeMemberFromTicket({ channel, member }) {
    await channel.permissionOverwrites.delete(member.id).catch(() => {});

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setDescription(`🛑 <@${member.id}> has been removed from this ticket.`);
    await channel.send({ embeds: [embed] }).catch(() => {});
    return { success: true };
}

// Helper: Generate transcript of ticket channel
async function generateTranscript({ channel, guild, user }) {
    const messages = await channel.messages.fetch({ limit: 100 });

    let transcriptContent = `==================================================\n`;
    transcriptContent += `TICKET TRANSCRIPT: #${channel.name}\n`;
    transcriptContent += `SERVER: ${guild.name} (${guild.id})\n`;
    transcriptContent += `GENERATED BY: ${user.tag} (${user.id})\n`;
    transcriptContent += `DATE: ${new Date().toLocaleString()}\n`;
    transcriptContent += `TOTAL MESSAGES CAPTURED: ${messages.size}\n`;
    transcriptContent += `==================================================\n\n`;

    const sortedMessages = Array.from(messages.values()).reverse();

    for (const msg of sortedMessages) {
        const time = new Date(msg.createdTimestamp).toLocaleString();
        const author = `${msg.author.tag} (${msg.author.id})`;
        let content = msg.content || '[No Text Content]';

        if (msg.attachments.size > 0) {
            const attachments = msg.attachments.map(a => a.url).join(', ');
            content += ` [Attachments: ${attachments}]`;
        }

        if (msg.embeds.length > 0) {
            content += ` [Embedded Content: ${msg.embeds.map(e => e.title || e.description || 'Embed').join(' | ')}]`;
        }

        transcriptContent += `[${time}] ${author}:\n${content}\n--------------------------------------------------\n`;
    }

    const attachment = new AttachmentBuilder(Buffer.from(transcriptContent, 'utf-8'), { name: `transcript-${channel.name}.txt` });

    const transcriptEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📝 Ticket Transcript Generated')
        .setDescription(`Transcript successfully archived for **#${channel.name}**.`)
        .addFields(
            { name: '📄 File', value: `\`transcript-${channel.name}.txt\``, inline: true },
            { name: '💬 Messages Saved', value: `\`${messages.size}\``, inline: true }
        )
        .setTimestamp();

    // Check if guild has a designated transcripts channel configured in ServerSettings
    if (isDbConnected()) {
        try {
            const ServerSettings = require('../models/ServerSettings');
            const settings = await ServerSettings.findOne({ guildId: guild.id }).lean();
            if (settings?.tickets?.transcriptsChannel) {
                const logChannel = guild.channels.cache.get(settings.tickets.transcriptsChannel) || await guild.channels.fetch(settings.tickets.transcriptsChannel).catch(() => null);
                if (logChannel) {
                    await logChannel.send({ embeds: [transcriptEmbed], files: [attachment] }).catch(() => {});
                }
            }
        } catch (e) {}
    }

    return { attachment, transcriptEmbed };
}

function initTickets(client) {
    client.on('interactionCreate', async (interaction) => {
        // ==========================================
        // 1. SLASH COMMANDS FALLBACK (/ticketsetup & /applysetup)
        // If already acknowledged by commandHandler, return to avoid collision
        // ==========================================
        if (interaction.isChatInputCommand()) {
            if (interaction.deferred || interaction.replied) return;

            if (interaction.commandName === 'ticketsetup') {
                if (!isStaff(interaction.member, interaction.guild)) {
                    return interaction.reply({ content: '❌ You lack permissions to set up the ticket panel.', flags: [EPHEMERAL_FLAG] });
                }

                await interaction.deferReply({ flags: [EPHEMERAL_FLAG] }).catch(() => {});

                const targetChannel = interaction.options?.getChannel?.('channel') || interaction.channel;
                const supportRole = interaction.options?.getRole?.('role') || null;
                const category = interaction.options?.getChannel?.('category') || null;
                const title = interaction.options?.getString?.('title') || null;
                const description = interaction.options?.getString?.('description') || null;

                const result = await setupTicketPanel({
                    guild: interaction.guild,
                    channel: targetChannel,
                    client,
                    supportRole,
                    category,
                    title,
                    description
                });

                return interaction.editReply({
                    content: `✅ Support ticket panel deployed in <#${targetChannel.id}>!`
                });
            }

            if (interaction.commandName === 'applysetup') {
                if (!isStaff(interaction.member, interaction.guild)) {
                    return interaction.reply({ content: '❌ You lack permissions to set up the application panel.', flags: [EPHEMERAL_FLAG] });
                }

                const targetChannel = interaction.options?.getChannel?.('channel') || interaction.channel;

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('📋 Server Staff & Partner Applications')
                    .setDescription('We are looking for dedicated staff members and server partners!\n\nClick an option below to submit your interactive application.')
                    .setFooter({ text: 'Starry Application Engine' })
                    .setTimestamp();

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('sys_apply_staff').setLabel('🛡️ Apply for Staff').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('sys_apply_partner').setLabel('🤝 Request Partnership').setStyle(ButtonStyle.Success)
                );

                await targetChannel.send({ embeds: [embed], components: [buttons] });
                return interaction.reply({ content: `✅ Application Dashboard created in <#${targetChannel.id}>!`, flags: [EPHEMERAL_FLAG] });
            }
        }

        // ==========================================
        // 2. BUTTON INTERACTIONS
        // ==========================================
        if (interaction.isButton()) {
            const customId = interaction.customId;

            // 📩 CREATE TICKET
            if (['sys_create_ticket', 'create_ticket', 'ticket_create', 'ticket_create_btn'].includes(customId)) {
                try {
                    if (!interaction.deferred && !interaction.replied) {
                        await interaction.deferReply({ flags: [EPHEMERAL_FLAG] });
                    }

                    const ticketChannel = await createTicketChannel({
                        guild: interaction.guild,
                        user: interaction.user,
                        client,
                        reason: 'Support Request'
                    });

                    return interaction.editReply({ content: `✅ Ticket created: <#${ticketChannel.id}>` });
                } catch (err) {
                    console.error('Error creating ticket:', err);
                    if (interaction.deferred || interaction.replied) {
                        return interaction.editReply({ content: '❌ Failed to create ticket due to missing bot permissions (Manage Channels).' }).catch(() => {});
                    }
                }
            }

            // ✋ CLAIM TICKET (STAFF ONLY)
            if (['sys_claim_ticket', 'claim_ticket', 'ticket_claim', 'ticket_claim_btn'].includes(customId)) {
                if (!isStaff(interaction.member, interaction.guild)) {
                    return interaction.reply({ content: '❌ Only staff members can claim tickets.', flags: [EPHEMERAL_FLAG] });
                }

                await interaction.deferUpdate().catch(() => {});
                const res = await claimTicketChannel({ channel: interaction.channel, staffMember: interaction.user });
                if (res.error) {
                    return interaction.followUp({ content: res.error, flags: [EPHEMERAL_FLAG] }).catch(() => {});
                }
                return;
            }

            // 🔒 CLOSE TICKET (STAFF OR TICKET OWNER)
            if (['sys_close_ticket', 'close_ticket', 'ticket_close', 'ticket_close_btn'].includes(customId)) {
                const rawTopic = interaction.channel.topic || '';
                const isOwner = rawTopic.includes(interaction.user.id);
                const isStaffMember = isStaff(interaction.member, interaction.guild);

                if (!isStaffMember && !isOwner) {
                    return interaction.reply({ content: '❌ Only staff members or the ticket owner can close this ticket.', flags: [EPHEMERAL_FLAG] });
                }

                if (interaction.channel.parent?.name.toUpperCase() === 'CLOSED TICKETS' || interaction.channel.name.startsWith('closed-')) {
                    return interaction.reply({ content: '❌ This ticket is already closed!', flags: [EPHEMERAL_FLAG] });
                }

                await interaction.deferUpdate().catch(() => {});
                await closeTicketChannel({
                    channel: interaction.channel,
                    closedBy: interaction.user,
                    client,
                    reason: 'Closed via interactive button'
                });
                return;
            }

            // 📝 SAVE TRANSCRIPT (STAFF OR TICKET OWNER)
            if (['sys_transcript_ticket', 'transcript_ticket', 'ticket_transcript', 'ticket_transcript_btn'].includes(customId)) {
                await interaction.deferReply();

                try {
                    const { attachment, transcriptEmbed } = await generateTranscript({
                        channel: interaction.channel,
                        guild: interaction.guild,
                        user: interaction.user
                    });

                    await interaction.editReply({ embeds: [transcriptEmbed], files: [attachment] });
                } catch (err) {
                    console.error('Transcript Error:', err);
                    await interaction.editReply({ content: '❌ Failed to generate transcript.' });
                }
                return;
            }

            // 🗑️ DELETE TICKET (STAFF ONLY)
            if (['sys_delete_ticket', 'delete_ticket', 'ticket_delete', 'ticket_delete_btn'].includes(customId)) {
                if (!isStaff(interaction.member, interaction.guild)) {
                    return interaction.reply({ content: '❌ Only staff members can delete tickets.', flags: [EPHEMERAL_FLAG] });
                }

                await interaction.reply({ content: '🗑️ Ticket channel will be permanently deleted in 5 seconds...' });
                setTimeout(async () => {
                    await interaction.channel.delete().catch(() => {});
                }, 5000);
                return;
            }

            // 📝 APPLICATIONS MODALS
            if (['sys_apply_staff', 'apply_staff', 'sys_apply_partner', 'apply_partner'].includes(customId)) {
                const isStaffApp = customId.includes('staff');
                const modal = new ModalBuilder()
                    .setCustomId(isStaffApp ? 'modal_staff' : 'modal_partner')
                    .setTitle(isStaffApp ? '🛡️ Staff Application' : '🤝 Partnership Application');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q1').setLabel('Age & Timezone').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q2').setLabel('Previous Experience').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q3').setLabel('Why should we pick you?').setStyle(TextInputStyle.Paragraph).setRequired(true))
                );

                return interaction.showModal(modal).catch(() => {});
            }

            // ✅ / ❌ ACCEPT OR REJECT APPLICATION
            if (['app_accept', 'app_reject'].includes(customId)) {
                if (!isStaff(interaction.member, interaction.guild)) {
                    return interaction.reply({ content: '❌ Staff permissions required.', flags: [EPHEMERAL_FLAG] });
                }

                const isAccepted = customId === 'app_accept';
                const applicantId = interaction.channel.topic;
                const targetUser = await client.users.fetch(applicantId).catch(() => null);

                if (targetUser) {
                    const dmEmbed = new EmbedBuilder()
                        .setColor(isAccepted ? '#2ecc71' : '#ED4245')
                        .setTitle(`Application ${isAccepted ? 'Accepted ✅' : 'Rejected ❌'}`)
                        .setDescription(`Your application for **${interaction.guild.name}** has been **${isAccepted ? 'ACCEPTED' : 'REJECTED'}**.`)
                        .setTimestamp();

                    await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});
                }

                await interaction.channel.delete().catch(() => {});
                return;
            }
        }

        // ==========================================
        // 3. MODAL SUBMISSIONS
        // ==========================================
        if (interaction.isModalSubmit()) {
            const validModals = ['modal_staff', 'modal_partner', 'sys_staff_modal'];
            if (!validModals.includes(interaction.customId)) return;

            const isStaffApp = interaction.customId.includes('staff');
            const user = interaction.user;

            let logChannel = interaction.guild.channels.cache.find(c => c.name.includes('app-logs') || c.name.includes('staff-logs'));
            
            const appChannel = await interaction.guild.channels.create({
                name: `app-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                type: ChannelType.GuildText,
                topic: user.id,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels] }
                ]
            });

            const q1 = interaction.fields.getTextInputValue('q1') || interaction.fields.getTextInputValue('app_age') || 'N/A';
            const q2 = interaction.fields.getTextInputValue('q2') || interaction.fields.getTextInputValue('app_exp') || 'N/A';
            const q3 = interaction.fields.getTextInputValue('q3') || interaction.fields.getTextInputValue('app_reason') || 'N/A';

            const embed = new EmbedBuilder()
                .setColor(isStaffApp ? '#2ecc71' : '#FFD700')
                .setTitle(`📝 New ${isStaffApp ? 'Staff' : 'Partner'} Application | ${user.username}`)
                .addFields(
                    { name: '👤 Applicant', value: `<@${user.id}> (\`${user.id}\`)`, inline: true },
                    { name: '📌 Age / Timezone', value: q1 },
                    { name: '📜 Experience', value: q2 },
                    { name: '💡 Reason', value: q3 }
                )
                .setTimestamp();

            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('app_accept').setLabel('Accept').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId('app_reject').setLabel('Reject').setStyle(ButtonStyle.Danger).setEmoji('❌')
            );

            await appChannel.send({ embeds: [embed], components: [actionRow] });
            if (logChannel) await logChannel.send({ embeds: [embed] }).catch(() => {});

            return interaction.reply({ content: `✅ Your application has been submitted! Staff will review it shortly in <#${appChannel.id}>.`, flags: [EPHEMERAL_FLAG] });
        }
    });
}

module.exports = Object.assign(initTickets, {
    isStaff,
    getOrCreateTicketCategory,
    setupTicketPanel,
    createTicketChannel,
    closeTicketChannel,
    claimTicketChannel,
    addMemberToTicket,
    removeMemberFromTicket,
    generateTranscript
});
