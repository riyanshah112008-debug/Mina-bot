// ==========================================
// 🛡️ STARRY MASTER CHANNEL SYSTEM (PART 1 OF 3)
// ==========================================
const { 
    PermissionFlagsBits, 
    PermissionsBitField,
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ChannelType,
    MessageFlags,
    Events,
    AuditLogEvent,
    SlashCommandBuilder
} = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const EPHEMERAL_FLAG = MessageFlags.Ephemeral || 6;
const ServerSettings = mongoose.models.ServerSettings || require('../models/ServerSettings');

const PolicyVoteSchema = new mongoose.Schema({
    guildId: String, messageId: String, title: String, description: String,
    yesVotes: { type: Array, default: [] }, noVotes: { type: Array, default: [] }, createdAt: { type: Date, default: Date.now }
});
const PolicyVote = mongoose.models.PolicyVote || mongoose.model('PolicyVote', PolicyVoteSchema);

const masterSecuritySchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    autoKick: { type: Boolean, default: false }, autoBan: { type: Boolean, default: false }, ownerBypass: { type: Boolean, default: true },
    modules: { antinuke: { type: Boolean, default: true }, antiraid: { type: Boolean, default: true }, altshield: { type: Boolean, default: false }, automod: { type: Boolean, default: true } },
    userInfractions: { type: Map, of: Number, default: {} }
});
const MasterSecurity = mongoose.models.MasterSecurity || mongoose.model('MasterSecurity', masterSecuritySchema);

const securityCache = new Map();

async function getSecurityConfig(guildId) {
    if (securityCache.has(guildId)) return securityCache.get(guildId);
    let config = await MasterSecurity.findOne({ guildId }).lean();
    if (!config) {
        config = { guildId, autoKick: false, autoBan: false, ownerBypass: true, modules: { antinuke: true, antiraid: true, altshield: false, automod: true }, userInfractions: new Map() };
        await MasterSecurity.create(config).catch(() => {});
    }
    securityCache.set(guildId, config);
    return config;
}

async function executeFullGuildBackup(guild) {
    try {
        const allRoles = await guild.roles.fetch();
        const allChannels = await guild.channels.fetch();
        return {
            rolesSaved: allRoles.size,
            categoriesSaved: allChannels.filter(c => c.type === ChannelType.GuildCategory).size,
            channelsSaved: allChannels.filter(c => c.type !== ChannelType.GuildCategory).size
        };
    } catch (e) {
        return { rolesSaved: guild.roles.cache.size, categoriesSaved: guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size, channelsSaved: guild.channels.cache.filter(c => c.type !== ChannelType.GuildCategory).size };
    }
}
// ==========================================
// 🛡️ STARRY MASTER CHANNEL SYSTEM (PART 2 OF 3)
// ==========================================
async function getOrCreateCategory(guild, name, overwrites = []) {
    let cat = guild.channels.cache.find(c => c.name.toLowerCase() === name.toLowerCase() && c.type === ChannelType.GuildCategory);
    if (!cat) {
        cat = await guild.channels.create({ name, type: ChannelType.GuildCategory, permissionOverwrites: overwrites });
    }
    return cat;
}

async function deployActiveModulePanel(channel, moduleType, verifiedRole) {
    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const hasPanel = messages ? messages.some(m => m.author.id === channel.guild.client.user.id && (m.components.length > 0 || m.embeds.length > 0)) : false;

    if (!hasPanel) {
        let embed = new EmbedBuilder().setColor('#2b2d31');
        let components = [];

        if (moduleType === 'verification') {
            embed.setColor('#2ecc71').setTitle('🛡️ Server Web Verification Portal').setDescription('Welcome! Human verification is required before full channel access is granted.\n\nClick the button below to generate your secure verification link.');
            components = [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`verify_role_${verifiedRole?.id || 'active'}`).setLabel('Get Verification Link').setStyle(ButtonStyle.Primary).setEmoji('🌐'))];
        } else if (moduleType === 'tickets') {
            embed.setColor('#00F2FE').setTitle('🎫 Support & Application Portal').setDescription('• **Open Support Ticket:** Opens a private channel with staff.\n• **Apply for Staff:** Opens an application form.');
            components = [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('sys_create_ticket').setLabel('Open Support Ticket').setStyle(ButtonStyle.Primary).setEmoji('📩'),
                new ButtonBuilder().setCustomId('sys_apply_staff').setLabel('Apply for Staff').setStyle(ButtonStyle.Success).setEmoji('📝')
            )];
        } else if (moduleType === 'log_access') {
            embed.setColor('#3BA55C').setTitle('🟢 Access & Member Join Audit Engine').addFields({ name: 'Engine Status', value: '`RUNNING 🟢`', inline: true }, { name: 'Active Listeners', value: '`Member Joins • Leaves • Invites`', inline: true });
        } else if (moduleType === 'sus_tracker') {
            embed.setColor('#ED4245').setTitle('🚨 Young Account & Sus Profile Scanner').addFields({ name: 'Engine Status', value: '`ARMED 🚨`', inline: true }, { name: 'Detection Rule', value: '`Flags accounts < 7 days old`', inline: true });
        } else if (moduleType === 'inactivity_tracker') {
            embed.setColor('#5865F2').setTitle('💤 Engagement & Inactivity Scanner').addFields({ name: 'Engine Status', value: '`SCANNING 💤`', inline: true }, { name: 'Tracking Window', value: '`14-Day Inactivity Matrix`', inline: true });
        } else if (moduleType === 'status_monitor') {
            embed.setColor('#2ecc71').setTitle('🟢 Autonomous Network Telemetry & Uptime Hub').addFields({ name: 'Metrics Update', value: '`Loops every 60 seconds`', inline: true }, { name: 'Monitored Assets', value: '`Members • RAM Heap • Ping • Modules`', inline: true });
        }

        if (components.length > 0) {
            await channel.send({ embeds: [embed], components }).catch(() => null);
        } else if (embed.data.title) {
            await channel.send({ embeds: [embed] }).catch(() => null);
        }
    }
}

async function createNonDuplicatingActiveChannel(guild, options, verifiedRole) {
    let channel = guild.channels.cache.find(c => c.name.toLowerCase() === options.name.toLowerCase() && c.parentId === options.parent);
    if (!channel) {
        channel = await guild.channels.create({
            name: options.name, type: options.type || ChannelType.GuildText, parent: options.parent, topic: options.topic || '', permissionOverwrites: options.permissionOverwrites || []
        });
    }
    await deployActiveModulePanel(channel, options.moduleType, verifiedRole);
    return channel;
}

async function provisionMasterServerStructure(interaction) {
    const guild = interaction.guild;
    const botMember = guild.members.me;

    let verifiedRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'verified');
    if (!verifiedRole) verifiedRole = await guild.roles.create({ name: 'Verified', color: '#2ecc71', reason: 'Starry Master System' });

    let staffRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'staff' || r.name.toLowerCase() === 'moderator');
    if (!staffRole) staffRole = await guild.roles.create({ name: 'Staff', color: '#3498db', reason: 'Starry Master System' });

    const hideEveryone = { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] };
    const showEveryone = { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] };
    const showVerified = { id: verifiedRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.Connect] };
    const staffFullControl = { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] };
    const botFullControl = { id: botMember.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] };

    // 1. SECURITY & GOVERNANCE CATEGORY
    const govCat = await getOrCreateCategory(guild, '🛡️ SECURITY & GOVERNANCE', [showEveryone, botFullControl]);
    await createNonDuplicatingActiveChannel(guild, { name: 'rules-and-info', parent: govCat.id, permissionOverwrites: [showEveryone, botFullControl] }, verifiedRole);
    await createNonDuplicatingActiveChannel(guild, { name: 'announcements', parent: govCat.id, permissionOverwrites: [showEveryone, botFullControl] }, verifiedRole);
    await createNonDuplicatingActiveChannel(guild, { name: 'server-status-monitor', parent: govCat.id, moduleType: 'status_monitor', permissionOverwrites: [showEveryone, botFullControl] }, verifiedRole);

    // 2. INCIDENT & AUDIT LOGS CATEGORY
    const sysCat = await getOrCreateCategory(guild, '🚨 INCIDENT & SECURITY LOGS', [hideEveryone, staffFullControl, botFullControl]);
    const sysChannels = [
        { name: 'logs-access', moduleType: 'log_access' }, 
        { name: 'logs-moderate', moduleType: 'log_moderate' },
        { name: 'logs-messages', moduleType: 'log_messages' }, 
        { name: 'logs-voice', moduleType: 'log_voice' },
        { name: 'logs-channels', moduleType: 'log_channels' }, 
        { name: 'logs-members', moduleType: 'log_members' }
    ];
    for (const item of sysChannels) {
        await createNonDuplicatingActiveChannel(guild, { name: item.name, parent: sysCat.id, moduleType: item.moduleType, permissionOverwrites: [hideEveryone, staffFullControl, botFullControl] }, verifiedRole);
    }

    // 3. AUTOMATED TRACKERS CATEGORY
    const trackerCat = await getOrCreateCategory(guild, '📡 AUTOMATED TRACKERS', [hideEveryone, staffFullControl, botFullControl]);
    await createNonDuplicatingActiveChannel(guild, { name: 'sus-account-tracker', parent: trackerCat.id, moduleType: 'sus_tracker', permissionOverwrites: [hideEveryone, staffFullControl, botFullControl] }, verifiedRole);
    await createNonDuplicatingActiveChannel(guild, { name: 'inactivity-tracker', parent: trackerCat.id, moduleType: 'inactivity_tracker', permissionOverwrites: [hideEveryone, staffFullControl, botFullControl] }, verifiedRole);
    await createNonDuplicatingActiveChannel(guild, { name: 'chest-drops', parent: trackerCat.id, permissionOverwrites: [hideEveryone, showVerified, botFullControl] }, verifiedRole);

    // 4. SUPPORT & APPLICATIONS CATEGORY
    const supportCat = await getOrCreateCategory(guild, '🎫 SUPPORT & APPLICATIONS');
    await createNonDuplicatingActiveChannel(guild, { name: 'verify-here', parent: supportCat.id, moduleType: 'verification', permissionOverwrites: [{ id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] }, { id: verifiedRole.id, deny: [PermissionFlagsBits.ViewChannel] }, botFullControl] }, verifiedRole);
    await createNonDuplicatingActiveChannel(guild, { name: 'open-a-ticket', parent: supportCat.id, moduleType: 'tickets', permissionOverwrites: [hideEveryone, showVerified, botFullControl] }, verifiedRole);

    // 5. ADMIN & STAFF HQ CATEGORY
    const staffCat = await getOrCreateCategory(guild, '👑 ADMIN & STAFF HQ', [hideEveryone, staffFullControl, botFullControl]);
    await createNonDuplicatingActiveChannel(guild, { name: 'owners-chat', parent: staffCat.id, permissionOverwrites: [hideEveryone, staffFullControl, botFullControl] }, verifiedRole);
    await createNonDuplicatingActiveChannel(guild, { name: 'staff-discussion', parent: staffCat.id, permissionOverwrites: [hideEveryone, staffFullControl, botFullControl] }, verifiedRole);

    // 6. COMMUNITY PROTOCOL CATEGORY
    const commCat = await getOrCreateCategory(guild, '📊 COMMUNITY PROTOCOL', [hideEveryone, showVerified, botFullControl]);
    await createNonDuplicatingActiveChannel(guild, { name: 'general-chat', parent: commCat.id, permissionOverwrites: [hideEveryone, showVerified, botFullControl] }, verifiedRole);
    await createNonDuplicatingActiveChannel(guild, { name: 'bot-commands', parent: commCat.id, permissionOverwrites: [hideEveryone, showVerified, botFullControl] }, verifiedRole);

    await ServerSettings.findOneAndUpdate({ guildId: String(guild.id) }, { setupCompleted: true, verifiedRoleId: verifiedRole.id }, { upsert: true });
    return { verifiedRole: verifiedRole.name, totalCategories: 6, totalChannels: 22 };
}
// ==========================================
// 🛡️ STARRY MASTER CHANNEL SYSTEM (PART 3 OF 3)
// ==========================================
function start60sChannelTelemetryLoop(client) {
    setInterval(async () => {
        if (!client.guilds) return;
        client.guilds.cache.forEach(async (guild) => {
            try {
                const statusCh = guild.channels.cache.find(c => c.name === 'server-status-monitor');
                if (statusCh) {
                    const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
                    const statusEmbed = new EmbedBuilder().setColor('#2ecc71').setTitle('🟢 Autonomous Network Telemetry & Uptime Hub').addFields(
                        { name: '📊 Total Members', value: `\`${guild.memberCount}\``, inline: true },
                        { name: '🟢 System Uptime', value: `\`${(process.uptime() / 60).toFixed(1)} mins\``, inline: true },
                        { name: '🧠 RAM Usage (Heap)', value: `\`${memUsage} MB\``, inline: true },
                        { name: '📡 Bot Latency (Ping)', value: `\`${client.ws.ping}ms\``, inline: true }
                    );
                    const msgs = await statusCh.messages.fetch({ limit: 5 }).catch(() => null);
                    const botMsg = msgs ? msgs.find(m => m.author.id === client.user.id && m.embeds.length > 0) : null;
                    if (botMsg) await botMsg.edit({ embeds: [statusEmbed] }).catch(() => {});
                    else await statusCh.send({ embeds: [statusEmbed] }).catch(() => {});
                }
            } catch (err) {}
        });
    }, 60000);
}

const emergencyNukeCommand = new SlashCommandBuilder()
    .setName('emergency-nuke')
    .setDescription('⚡ Emergency Protocol: Purge channel or reset whole server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o =>
        o.setName('target')
            .setDescription('Select whether to nuke this channel or the entire server')
            .setRequired(true)
            .addChoices(
                { name: 'Channel (Purge & Recreate)', value: 'channel' },
                { name: 'Server (Reset All Channels & Non-Essential Roles)', value: 'server' }
            )
    )
    .addChannelOption(o =>
        o.setName('channel')
            .setDescription('Target channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
    );

const modMasterCommand = new SlashCommandBuilder()
    .setName('mod').setDescription('🛡️ Master Moderation Hub').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub => sub.setName('warn').setDescription('Warn member').addUserOption(o => o.setName('target').setDescription('User').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)));

const autoModMasterCommand = new SlashCommandBuilder()
    .setName('automod')
    .setDescription('⚙️ AutoMod Hub • Channel & Server Protection')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => 
        sub.setName('channel')
            .setDescription('Configure AutoMod protection for a channel')
            .addStringOption(o => 
                o.setName('action')
                    .setDescription('Enable, disable, or check status')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Enable Filter', value: 'enable' },
                        { name: 'Disable Filter', value: 'disable' },
                        { name: 'Check Status', value: 'status' }
                    )
            )
            .addStringOption(o => 
                o.setName('filter')
                    .setDescription('Filter type to configure')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Links & Invites', value: 'links' },
                        { name: 'Emoji Spam (5+)', value: 'emojis' },
                        { name: 'All Filters (Both)', value: 'all' }
                    )
            )
            .addChannelOption(o => 
                o.setName('channel')
                    .setDescription('Target channel (defaults to current)')
                    .setRequired(false)
            )
    )
    .addSubcommand(sub => 
        sub.setName('status')
            .setDescription('View AutoMod status for a channel')
            .addChannelOption(o => 
                o.setName('channel')
                    .setDescription('Target channel (defaults to current)')
                    .setRequired(false)
            )
    )
    .addSubcommand(sub => 
        sub.setName('toggle')
            .setDescription('Toggle server-wide AutoMod engine')
            .addStringOption(o => 
                o.setName('action')
                    .setDescription('Enable or disable server-wide')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Enable', value: 'enable' },
                        { name: 'Disable', value: 'disable' }
                    )
            )
    );

const ignoreCommand = new SlashCommandBuilder()
    .setName('ignore')
    .setDescription('🚫 Disable/ignore AutoMod links or emojis in a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => 
        o.setName('type')
            .setDescription('Filter to ignore')
            .setRequired(true)
            .addChoices(
                { name: 'Links & Invites', value: 'links' },
                { name: 'Emoji Spam', value: 'emojis' },
                { name: 'All Filters', value: 'all' },
                { name: 'Check Status', value: 'status' }
            )
    )
    .addChannelOption(o => 
        o.setName('channel')
            .setDescription('Target channel (defaults to current)')
            .setRequired(false)
    );

const unignoreCommand = new SlashCommandBuilder()
    .setName('unignore')
    .setDescription('✅ Re-enable/unignore AutoMod links or emojis in a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => 
        o.setName('type')
            .setDescription('Filter to unignore/activate')
            .setRequired(true)
            .addChoices(
                { name: 'Links & Invites', value: 'links' },
                { name: 'Emoji Spam', value: 'emojis' },
                { name: 'All Filters', value: 'all' }
            )
    )
    .addChannelOption(o => 
        o.setName('channel')
            .setDescription('Target channel (defaults to current)')
            .setRequired(false)
    );

const moderateMasterCommand = new SlashCommandBuilder()
    .setName('moderate').setDescription('⚙️ Toggle advanced security modules').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('toggle').setDescription('Toggle module').addStringOption(o => o.setName('module').setDescription('Module').setRequired(true).addChoices({ name: 'Anti-Nuke', value: 'antinuke' }, { name: 'Anti-Raid', value: 'antiraid' })).addBooleanOption(o => o.setName('status').setDescription('Status').setRequired(true)));

const verifySetupCommand = new SlashCommandBuilder()
    .setName('verify-setup').setDescription('Set up verification panel').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(o => o.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true));

async function handleEmergencyCommands(interaction) {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: [EPHEMERAL_FLAG] }).catch(() => {});
    }

    const cmd = interaction.commandName;
    const guild = interaction.guild;

    if (cmd === 'emergency-nuke') {
        const targetScope = interaction.options.getString('target', true);

        if (targetScope === 'channel') {
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            const position = channel.position;
            const newChannel = await channel.clone();
            await channel.delete().catch(() => {});
            await newChannel.setPosition(position).catch(() => {});
            return newChannel.send({ content: '⚡ **EMERGENCY NUKE:** Channel has been completely purged and recreated.' });
        }

        if (targetScope === 'server') {
            if (interaction.user.id !== guild.ownerId) {
                return interaction.editReply('❌ **Owner Only:** Only the Server Owner can execute a whole-server emergency nuke!');
            }

            const currentChannel = interaction.channel;
            const botMember = guild.members.me;

            let deletedChannels = 0;
            let deletedRoles = 0;

            const channelsToDelete = guild.channels.cache.filter(c => c.id !== currentChannel.id);
            for (const [, ch] of channelsToDelete) {
                try {
                    await ch.delete();
                    deletedChannels++;
                } catch (e) {}
            }

            const rolesToDelete = guild.roles.cache.filter(r => 
                !r.managed && 
                r.id !== guild.roles.everyone.id && 
                r.position < botMember.roles.highest.position
            );
            for (const [, role] of rolesToDelete) {
                try {
                    await role.delete();
                    deletedRoles++;
                } catch (e) {}
            }

            return interaction.editReply(`⚡ **EMERGENCY SERVER NUKE COMPLETED:**\n• Purged **${deletedChannels}** channels.\n• Deleted **${deletedRoles}** non-essential roles.`);
        }
    }
}

function initModule(client) {
    start60sChannelTelemetryLoop(client);

    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        const verifiedRole = newMember.guild.roles.cache.find(r => r.name.toLowerCase() === 'verified');
        if (verifiedRole && !oldMember.roles.cache.has(verifiedRole.id) && newMember.roles.cache.has(verifiedRole.id)) {
            const chamberCh = newMember.guild.channels.cache.find(c => c.name === 'verification-chamber');
            if (chamberCh) {
                const verifiedEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('🟢 Member Human Verification Complete')
                    .setDescription(`**User Verified:** <@${newMember.id}> (\`${newMember.user.tag}\`) has passed human verification and unlocked full server access.`)
                    .setTimestamp();
                await chamberCh.send({ embeds: [verifiedEmbed] }).catch(() => {});
            }
        }
    });

    // 🛑 STRICTLY ZERO messageCreate LISTENERS HERE TO PREVENT DOUBLE-REPLYING!

    // ⚡ LISTEN TO SYSTEM INTERACTION SLASH COMMANDS ONLY
    client.on('interactionCreate', async (interaction) => {
        if (interaction.isChatInputCommand()) {
            const cmd = interaction.commandName;

            if (cmd === 'setup-starry') {
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: [EPHEMERAL_FLAG] }).catch(() => {});
                const result = await provisionMasterServerStructure(interaction);
                const embed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('✨ Autonomous Server Setup Complete!')
                    .setDescription(`Configured **6 Categories** and **${result.totalChannels} Security & Log Channels**!`);
                return interaction.editReply({ embeds: [embed] });
            }

            if (['emergency-nuke', 'emergency-lockdown', 'emergency-secure', 'emergency-unban'].includes(cmd)) {
                await handleEmergencyCommands(interaction);
            }
        }
    });

    console.log('✅ Master Channel Systems Engine Initialized (Slash & Setup Engine Only - Zero Double-Reply)');
}

module.exports = initModule;
module.exports.init = initModule;
module.exports.provisionMasterServerStructure = provisionMasterServerStructure;
module.exports.executeFullGuildBackup = executeFullGuildBackup;
module.exports.emergencyNukePayload = emergencyNukeCommand.toJSON();
module.exports.modMasterPayload = modMasterCommand.toJSON();
module.exports.autoModMasterPayload = autoModMasterCommand.toJSON();
module.exports.ignorePayload = ignoreCommand.toJSON();
module.exports.unignorePayload = unignoreCommand.toJSON();
module.exports.moderateMasterPayload = moderateMasterCommand.toJSON();
module.exports.verifySetupPayload = verifySetupCommand.toJSON();
