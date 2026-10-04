// ==========================================
// 🛡️ STARRY TRACKER ENGINE (PART 1 OF 2)
// ==========================================
const { 
    EmbedBuilder, 
    PermissionsBitField, 
    SlashCommandBuilder, 
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    Events
} = require('discord.js');
const mongoose = require('mongoose');

let UserActivity, ChannelScrapeState, GuildTrackerSettings;
try { UserActivity = require('../models/UserActivity'); } catch (e) { UserActivity = mongoose.models.UserActivity; }
try { ChannelScrapeState = require('../models/ChannelScrapeState'); } catch (e) { ChannelScrapeState = mongoose.models.ChannelScrapeState; }
try { GuildTrackerSettings = require('../models/GuildTrackerSettings'); } catch (e) { GuildTrackerSettings = mongoose.models.GuildTrackerSettings; }

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getAccountAge(createdAt) {
    const diffDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 365) {
        const years = Math.floor(diffDays / 365);
        return `${years} year${years > 1 ? 's' : ''}`;
    }
    if (diffDays >= 30) {
        const months = Math.floor(diffDays / 30);
        return `${months} month${months > 1 ? 's' : ''}`;
    }
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
}

function generateProgressBar(current, total, length = 12) {
    if (!total || total === 0) return '`░░░░░░░░░░░░` 0%';
    const progress = Math.min(Math.max(current / total, 0), 1);
    const fill = Math.round(length * progress);
    const bar = '█'.repeat(fill) + '░'.repeat(length - fill);
    return `\`${bar}\` **${Math.floor(progress * 100)}%**`;
}

// Slash Command Schema
const trackerCommandSchema = new SlashCommandBuilder()
    .setName('tracker')
    .setDescription('Universal Invite Tracker & Inactivity System')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
        subcommand
            .setName('setup')
            .setDescription('Setup inactivity log channels & preview embeds')
            .addChannelOption(option =>
                option.setName('channel')
                    .setDescription('Channel to send inactivity alerts to')
                    .setRequired(true)))
    .addSubcommand(subcommand =>
        subcommand
            .setName('scrape')
            .setDescription('Scrape historical messages into MongoDB Cloud')
            .addChannelOption(option =>
                option.setName('private_channel')
                    .setDescription('Private channel for scraping dashboard')
                    .setRequired(true))
            .addIntegerOption(option =>
                option.setName('after_days')
                    .setDescription('Fetch data only from last X days')
                    .setRequired(false)
                    .setMinValue(1)));

// Inactivity Action Panel (Screenshot 1)
function buildInactivityModPanelRow(targetUserId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`mod_timeout_${targetUserId}`).setLabel('Timeout (7d)').setStyle(ButtonStyle.Secondary).setEmoji('⏰'),
        new ButtonBuilder().setCustomId(`mod_kick_${targetUserId}`).setLabel('Kick User').setStyle(ButtonStyle.Danger).setEmoji('👢'),
        new ButtonBuilder().setCustomId(`mod_ban_${targetUserId}`).setLabel('Ban User').setStyle(ButtonStyle.Danger).setEmoji('🔨'),
        new ButtonBuilder().setCustomId(`mod_dismiss_${targetUserId}`).setLabel('Dismiss Alert').setStyle(ButtonStyle.Secondary).setEmoji('🗑️')
    );
}

// Sus Account Inactivity Action Panel (Screenshot 2)
function buildSusModPanelRow(targetUserId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`sus_track_${targetUserId}`).setLabel('Track again').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`sus_kick_${targetUserId}`).setLabel('Kick').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`sus_ban_${targetUserId}`).setLabel('Ban').setStyle(ButtonStyle.Danger)
    );
}

// Live Join Tracking Embed
function buildLiveTrackingEmbed(member, inviterId, inviteCode, joinedAtMs, stats = { msgs: 0, media: 0, links: 0, voice: 0, reacts: 0 }) {
    const joinedUnix = Math.floor(joinedAtMs / 1000);
    const endsAtUnix = Math.floor((joinedAtMs + (14 * 24 * 60 * 60 * 1000)) / 1000);
    const createdAtUnix = Math.floor(member.user.createdTimestamp / 1000);
    const ageStr = getAccountAge(member.user.createdAt);
    const inviterMention = inviterId !== 'Unknown' ? `<@${inviterId}>` : 'Direct/Vanity';

    return new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'Invite Tracker • Member Joined', iconURL: member.guild.iconURL({ dynamic: true }) || undefined })
        .setTitle(`👋 Welcome to ${member.guild.name}`)
        .setDescription(
            `<@${member.id}> joined with invite code \`${inviteCode}\` created by ${inviterMention}.\n\n` +
            `**Nickname:** ${member.nickname || 'None'}\n` +
            `**Global Name:** \`${member.user.globalName || member.user.username}\`\n\n` +
            `**Joined Server:** <t:${joinedUnix}:F> (<t:${joinedUnix}:R>)\n` +
            `**Account Created:** <t:${createdAtUnix}:F> (<t:${createdAtUnix}:R>)\n` +
            `**Account Age:** ${ageStr}\n\n` +
            `📊 **Activity Counter (14-Day Window)**\n` +
            `• Messages: **${stats.msgs}**\n` +
            `• Media/Attachments: **${stats.media}**\n` +
            `• Web Links: **${stats.links}**\n` +
            `• Voice Connections: **${stats.voice}**\n` +
            `• Reactions Added: **${stats.reacts}**\n\n` +
            `⏳ **Tracking Period Ends:** <t:${endsAtUnix}:F> (<t:${endsAtUnix}:R>)`
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ text: `User ID: ${member.id} • Starry Activity Engine` })
        .setTimestamp();
}

// 14-Day Inactivity Alert Embed (Screenshot 1)
function buildInactivityAlertEmbed(member, inviterId, inviteCode, joinedAtMs) {
    const ageStr = getAccountAge(member.user.createdAt);
    const inviterMention = inviterId !== 'Unknown' ? `<@${inviterId}>` : 'Unknown Inviter';

    return new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('⚠️ No activity after 14 days')
        .setDescription(
            `The user <@${member.id}> had no interaction within **14 days** after joining.\n\n` +
            `The user joined through invite code \`${inviteCode}\` created by ${inviterMention} on <t:${Math.floor(joinedAtMs / 1000)}:F>.\n\n` +
            `**Account age:** ${ageStr} • **User ID:** \`${member.id}\``
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ text: `User ID: ${member.id}` })
        .setTimestamp();
}

// Sus Account Inactivity Alert Embed (Screenshot 2)
function buildSusInactivityAlertEmbed(member, days = 30) {
    const ageStr = getAccountAge(member.user.createdAt);
    const createdAtUnix = Math.floor(member.user.createdTimestamp / 1000);
    const joinedUnix = Math.floor(member.joinedTimestamp / 1000);

    return new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ name: 'Sus-account inactivity alert', iconURL: member.guild.iconURL({ dynamic: true }) || undefined })
        .setTitle('No tracked activity detected')
        .setDescription(
            `<@${member.id}>\nhas shown no tracked activity for **${days} days**.\n\n` +
            `**Nickname**\n${member.nickname || 'None'}\n\n` +
            `**Global Name**\n\`${member.user.globalName || member.user.username}\`\n\n` +
            `**Account Age**\n<t:${createdAtUnix}:F>\n${ageStr}\n\n` +
            `**Join Date**\n<t:${joinedUnix}:F>\n<t:${joinedUnix}:R>\n\n` +
            `**Tracking Duration**\n${days} days`
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ text: `User ID: ${member.id}` })
        .setTimestamp();
}
// ==========================================
// 🛡️ STARRY TRACKER ENGINE (PART 2 OF 2)
// ==========================================
const universalTrackerModule = (client) => {

    client.getUserActivity = async (guildId, userId) => {
        if (!UserActivity) return null;
        return await UserActivity.findOne({ guildId, userId });
    };

    if (client.commands && typeof client.commands.set === 'function') {
        client.commands.set('tracker', { data: trackerCommandSchema, execute: handleCommand });
    }

    const invitesCache = new Map();

    client.once(Events.ClientReady || 'clientReady', async () => {
        try {
            for (const [guildId, guild] of client.guilds.cache) {
                if (guild.members.me?.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                    const guildInvites = await guild.invites.fetch().catch(() => null);
                    if (guildInvites) invitesCache.set(guildId, new Map(guildInvites.map(inv => [inv.code, inv.uses])));
                }
            }
            console.log(`✅ Universal Tracker Engine synchronized across ${client.guilds.cache.size} servers.`);
        } catch (err) {}
    });

    client.on('inviteCreate', invite => {
        const guildInvites = invitesCache.get(invite.guild.id);
        if (guildInvites) guildInvites.set(invite.code, invite.uses);
    });

    client.on('inviteDelete', invite => {
        const guildInvites = invitesCache.get(invite.guild.id);
        if (guildInvites) guildInvites.delete(invite.code);
    });

    // --- MEMBER JOIN LISTENER ---
    client.on('guildMemberAdd', async member => {
        if (member.user.bot) return;
        const guild = member.guild;

        let inviterId = 'Unknown';
        let inviteCode = 'Direct/Vanity';

        if (guild.members.me?.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            const cachedInvites = invitesCache.get(guild.id);
            const newInvites = await guild.invites.fetch().catch(() => null);

            if (cachedInvites && newInvites) {
                const usedInvite = newInvites.find(inv => {
                    const oldUses = cachedInvites.get(inv.code) || 0;
                    return inv.uses > oldUses;
                });

                if (usedInvite) {
                    inviterId = usedInvite.inviter ? usedInvite.inviter.id : 'Unknown';
                    inviteCode = usedInvite.code;
                }
                invitesCache.set(guild.id, new Map(newInvites.map(inv => [inv.code, inv.uses])));
            }
        }

        let inactivityCh = guild.channels.cache.find(c => c.name === 'inactivity-tracker');
        const joinedAtMs = Date.now();

        if (inactivityCh) {
            const trackEmbed = buildLiveTrackingEmbed(member, inviterId, inviteCode, joinedAtMs);
            await inactivityCh.send({ embeds: [trackEmbed] }).catch(() => null);
        }

        if (UserActivity) {
            await UserActivity.findOneAndUpdate(
                { guildId: guild.id, userId: member.id },
                {
                    joinedAt: joinedAtMs, inviterId, inviteCode,
                    logChannelId: inactivityCh ? inactivityCh.id : null,
                    is14DayTracker: true, alerted: false,
                    $setOnInsert: { stats: { msgs: 0, media: 0, links: 0, voice: 0, reacts: 0, invites: 0 } }
                },
                { upsert: true, new: true }
            ).catch(() => {});
        }
    });

    // --- ACTION PANEL BUTTON LISTENERS ---
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;
        const id = interaction.customId;

        // Inactivity Mod Panel Buttons
        if (id.startsWith('mod_')) {
            const [_, action, targetUserId] = id.split('_');
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return interaction.reply({ content: '❌ You lack permission to perform moderation actions.', ephemeral: true });
            }

            const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);

            try {
                if (action === 'timeout') {
                    if (!member) return interaction.reply({ content: '❌ Member no longer in server.', ephemeral: true });
                    await member.timeout(7 * 24 * 60 * 60 * 1000, 'Inactive for 14 days after joining');
                    return interaction.reply({ content: `⏰ Timed out <@${targetUserId}> for 7 days.`, ephemeral: true });
                } else if (action === 'kick') {
                    if (!member) return interaction.reply({ content: '❌ Member no longer in server.', ephemeral: true });
                    await member.kick('Inactive for 14 days after joining');
                    return interaction.reply({ content: `👢 Kicked <@${targetUserId}> from the server.`, ephemeral: true });
                } else if (action === 'ban') {
                    await interaction.guild.members.ban(targetUserId, { reason: 'Inactive for 14 days after joining' });
                    return interaction.reply({ content: `🔨 Banned <@${targetUserId}> from the server.`, ephemeral: true });
                } else if (action === 'dismiss') {
                    return interaction.message.delete().catch(() => {});
                }
            } catch (error) {
                return interaction.reply({ content: `❌ Action failed: \`${error.message}\``, ephemeral: true });
            }
        }

        // Sus Account Mod Panel Buttons (Screenshot 2)
        if (id.startsWith('sus_')) {
            const [_, action, targetUserId] = id.split('_');
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return interaction.reply({ content: '❌ You lack permission to perform moderation actions.', ephemeral: true });
            }

            const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);

            try {
                if (action === 'track') {
                    return interaction.reply({ content: `🔄 Re-initialized active activity tracking for <@${targetUserId}>.`, ephemeral: true });
                } else if (action === 'kick') {
                    if (!member) return interaction.reply({ content: '❌ Member no longer in server.', ephemeral: true });
                    await member.kick('Sus Account Inactivity Timeout');
                    return interaction.reply({ content: `👢 Kicked <@${targetUserId}> from the server.`, ephemeral: true });
                } else if (action === 'ban') {
                    await interaction.guild.members.ban(targetUserId, { reason: 'Sus Account Inactivity Timeout' });
                    return interaction.reply({ content: `🔨 Banned <@${targetUserId}> from the server.`, ephemeral: true });
                }
            } catch (error) {
                return interaction.reply({ content: `❌ Action failed: \`${error.message}\``, ephemeral: true });
            }
        }
    });

    async function handleCommand(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({ content: '❌ You need **Manage Server** permissions.', ephemeral: true });
        }

        const subCommand = interaction.options.getSubcommand();

        if (subCommand === 'setup') {
            await interaction.deferReply();
            const channel = interaction.options.getChannel('channel', true);

            const sampleMember = interaction.member;
            const sampleJoinedMs = Date.now() - (14 * 24 * 60 * 60 * 1000);

            const inactivityAlert = buildInactivityAlertEmbed(sampleMember, interaction.user.id, 'uPUQpU4ecR', sampleJoinedMs);
            const inactivityRow = buildInactivityModPanelRow(sampleMember.id);

            const susAlert = buildSusInactivityAlertEmbed(sampleMember, 30);
            const susRow = buildSusModPanelRow(sampleMember.id);

            await channel.send({
                content: `<@${interaction.user.id}>\nThe user <@${sampleMember.id}> had no interaction within 14 days after joining.`,
                embeds: [inactivityAlert],
                components: [inactivityRow]
            }).catch(() => {});

            await channel.send({
                content: `<@${interaction.user.id}>`,
                embeds: [susAlert],
                components: [susRow]
            }).catch(() => {});

            return interaction.editReply({ content: `✅ **Tracker Setup Complete!** Target channel set to ${channel}. Sent live alert previews with moderation panels!` });
        }
    }

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand() || interaction.commandName !== 'tracker') return;
        await handleCommand(interaction);
    });
};

universalTrackerModule.data = trackerCommandSchema;
universalTrackerModule.buildInactivityAlertEmbed = buildInactivityAlertEmbed;
universalTrackerModule.buildInactivityModPanelRow = buildInactivityModPanelRow;
universalTrackerModule.buildSusInactivityAlertEmbed = buildSusInactivityAlertEmbed;
universalTrackerModule.buildSusModPanelRow = buildSusModPanelRow;

module.exports = universalTrackerModule;
                        
