// ==========================================
// 🎙️ STARRY VOICE MODERATION COMMAND SUITE
// File Path: src/commands/moderation/vcmod.js
// Control Suite for AI Real-Time Voice Channel Moderation
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
const VoiceModerationConfig = require('../../models/VoiceModerationConfig');
const { 
    startVoiceModeration, 
    stopVoiceModeration, 
    getActiveSession, 
    getGuildVoiceModConfig, 
    updateGuildConfigCache 
} = require('../../modules/voiceModerator');

module.exports = {
    name: 'vcmod',
    description: '🎙️ Real-time AI voice channel moderation for fighting, toxicity & verbal abuse',
    category: 'Moderation',
    usage: ',vcmod [join|leave|status|action|logchannel|sensitivity|audiowarning|panel]',
    aliases: ['voicemod', 'vcmoderation'],
    autoDefer: true,

    data: new SlashCommandBuilder()
        .setName('vcmod')
        .setDescription('🎙️ Real-time AI voice channel moderation for fighting, toxicity & verbal abuse')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setContexts([0])
        .setIntegrationTypes([0])
        .addSubcommand(sub => 
            sub.setName('join')
               .setDescription('Connect Starry to monitor a voice channel in real-time')
               .addChannelOption(opt => 
                   opt.setName('channel')
                      .setDescription('The voice channel to moderate (defaults to your current voice channel)')
                      .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
                      .setRequired(false)
               )
        )
        .addSubcommand(sub => 
            sub.setName('leave')
               .setDescription('Stop voice moderation and disconnect Starry from the voice channel')
        )
        .addSubcommand(sub => 
            sub.setName('status')
               .setDescription('View live monitoring status, active channel, and violation statistics')
        )
        .addSubcommand(sub => 
            sub.setName('action')
               .setDescription('Configure automated enforcement action when abuse/fighting is detected')
               .addStringOption(opt => 
                   opt.setName('type')
                      .setDescription('Enforcement penalty')
                      .setRequired(true)
                      .addChoices(
                          { name: '⚠️ DM Warning Only', value: 'warn' },
                          { name: '🔇 Server Mute Member', value: 'mute' },
                          { name: '👢 Disconnect from VC', value: 'disconnect' },
                          { name: '⏳ Timeout (5 min)', value: 'timeout' },
                          { name: '📋 Log Only (No Automated Penalty)', value: 'log' }
                      )
               )
        )
        .addSubcommand(sub => 
            sub.setName('logchannel')
               .setDescription('Set the text channel where voice moderation violation reports are posted')
               .addChannelOption(opt => 
                   opt.setName('channel')
                      .setDescription('Target log channel')
                      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                      .setRequired(true)
               )
        )
        .addSubcommand(sub => 
            sub.setName('sensitivity')
               .setDescription('Set the AI trigger sensitivity threshold')
               .addStringOption(opt => 
                   opt.setName('level')
                      .setDescription('Sensitivity level')
                      .setRequired(true)
                      .addChoices(
                          { name: 'Standard (Medium, High & Critical flags - Recommended)', value: 'standard' },
                          { name: 'Strict (Flags even mild toxicity/arguments)', value: 'strict' },
                          { name: 'Severe Only (Flags only extreme abuse & threats)', value: 'severe' }
                      )
               )
        )
        .addSubcommand(sub => 
            sub.setName('audiowarning')
               .setDescription('Toggle spoken voice warnings into the voice channel when violations occur')
               .addBooleanOption(opt => 
                   opt.setName('enabled')
                      .setDescription('Enable or disable in-VC audio warnings')
                      .setRequired(true)
               )
        )
        .addSubcommand(sub => 
            sub.setName('panel')
               .setDescription('Open the interactive visual Voice Moderation control dashboard')
        ),

    async execute(ctx) {
        const member = ctx.member;
        const guild = ctx.guild;

        // Check Permissions
        if (!member.permissions.has(PermissionFlagsBits.ManageGuild) &&
            !member.permissions.has(PermissionFlagsBits.ModerateMembers) &&
            !member.permissions.has(PermissionFlagsBits.Administrator)) {
            return ctx.reply('❌ You require **Manage Server** or **Moderate Members** permission to use Starry Voice Moderation!');
        }

        // Determine Subcommand & Args
        let sub = 'panel';
        if (ctx.isSlash) {
            sub = ctx.interaction.options.getSubcommand(false) || 'panel';
        } else {
            sub = (ctx.args[0] || 'panel').toLowerCase();
        }

        // Load / Ensure Config
        let config = await getGuildVoiceModConfig(guild.id);

        // ==========================================
        // SUBCOMMAND: JOIN
        // ==========================================
        if (sub === 'join' || sub === 'start' || sub === 'monitor') {
            let targetChannel = null;
            if (ctx.isSlash) {
                targetChannel = ctx.interaction.options.getChannel('channel');
            } else if (ctx.args[1]) {
                const cleanId = ctx.args[1].replace(/[<#>]/g, '');
                targetChannel = guild.channels.cache.get(cleanId);
            }

            if (!targetChannel) {
                targetChannel = member.voice?.channel;
            }

            if (!targetChannel) {
                return ctx.reply('❌ Please specify a voice channel or join one first!\n*Usage: `/vcmod join #channel` or `,vcmod join` while in VC.*');
            }

            if (targetChannel.type !== ChannelType.GuildVoice && targetChannel.type !== ChannelType.GuildStageVoice) {
                return ctx.reply('❌ Selected channel must be a Voice or Stage channel!');
            }

            // Verify Bot Permissions in VC
            const botPermissions = targetChannel.permissionsFor(guild.members.me);
            if (!botPermissions.has(PermissionFlagsBits.Connect)) {
                return ctx.reply(`❌ I don't have permission to **Connect** to <#${targetChannel.id}>!`);
            }
            if (!botPermissions.has(PermissionFlagsBits.Speak)) {
                return ctx.reply(`❌ I don't have permission to **Speak** in <#${targetChannel.id}>!`);
            }

            // Enable in database
            config.enabled = true;
            await VoiceModerationConfig.findOneAndUpdate(
                { guildId: guild.id },
                { enabled: true },
                { upsert: true }
            );
            updateGuildConfigCache(guild.id, config);

            // Connect & Start Session
            const result = await startVoiceModeration(guild, targetChannel, ctx.client);

            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🎙️ Starry AI Voice Moderation Active')
                .setDescription(`Starry is now actively connected to **<#${targetChannel.id}>** and monitoring speech in real-time.`)
                .addFields(
                    { name: '🔊 Monitored Channel', value: `<#${targetChannel.id}>`, inline: true },
                    { name: '⚖️ Enforcement Penalty', value: `\`${config.action.toUpperCase()}\``, inline: true },
                    { name: '🎯 Sensitivity', value: `\`${config.sensitivity.toUpperCase()}\``, inline: true },
                    { name: '🗣️ Voice Warnings', value: config.audioWarning ? '🟢 Enabled' : '🔴 Disabled', inline: true },
                    { name: '📋 Log Channel', value: config.logChannelId ? `<#${config.logChannelId}>` : '*(Default mod logs)*', inline: true }
                )
                .setFooter({ text: 'Verbal abuse, harassment, and aggressive fighting will be automatically detected and moderated.' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }

        // ==========================================
        // SUBCOMMAND: LEAVE
        // ==========================================
        if (sub === 'leave' || sub === 'stop' || sub === 'disconnect') {
            const stopped = stopVoiceModeration(guild.id);

            const embed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('🎙️ Starry Voice Moderation Stopped')
                .setDescription(stopped 
                    ? 'Starry has disconnected from the voice channel and paused live moderation.' 
                    : 'Starry was not actively monitoring any voice channel in this server.')
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }

        // ==========================================
        // SUBCOMMAND: STATUS
        // ==========================================
        if (sub === 'status' || sub === 'stats') {
            const session = getActiveSession(guild.id);
            const stats = config.stats || {};

            const embed = new EmbedBuilder()
                .setColor(session ? '#2ECC71' : '#7289DA')
                .setTitle('📊 Starry Voice Moderation Status')
                .setDescription(session 
                    ? `🟢 **Actively Monitoring:** <#${session.channel.id}>\n⏱️ **Uptime:** Since <t:${Math.floor(session.startTime / 1000)}:R>` 
                    : '⚪ **Status:** Offline / Idle (Use `/vcmod join` to start)')
                .addFields(
                    { name: '⚖️ Configured Action', value: `\`${config.action.toUpperCase()}\``, inline: true },
                    { name: '🎯 Sensitivity Level', value: `\`${config.sensitivity.toUpperCase()}\``, inline: true },
                    { name: '🗣️ Audio Warnings', value: config.audioWarning ? '🟢 Enabled' : '🔴 Disabled', inline: true },
                    { name: '📋 Incident Log Channel', value: config.logChannelId ? `<#${config.logChannelId}>` : '*None configured*', inline: true },
                    { name: '📈 Total Violations Caught', value: `**${config.totalViolations || 0}** incidents`, inline: true },
                    { 
                        name: '🔍 Category Breakdown', 
                        value: `• 🥊 Fighting: **${stats.fighting || 0}**\n• 🤬 Verbal Abuse: **${stats.verbalAbuse || 0}**\n• ⚠️ Harassment: **${stats.harassment || 0}**\n• 🚨 Threats: **${stats.threats || 0}**` 
                    }
                )
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }

        // ==========================================
        // SUBCOMMAND: ACTION
        // ==========================================
        if (sub === 'action' || sub === 'penalty') {
            let newAction = null;
            if (ctx.isSlash) {
                newAction = ctx.interaction.options.getString('type');
            } else {
                newAction = ctx.args[1]?.toLowerCase();
            }

            const validActions = ['warn', 'mute', 'disconnect', 'timeout', 'log'];
            if (!newAction || !validActions.includes(newAction)) {
                return ctx.reply('❌ Please choose a valid action: `warn`, `mute`, `disconnect`, `timeout`, or `log`.\n*Example: `/vcmod action mute`*');
            }

            config.action = newAction;
            await VoiceModerationConfig.findOneAndUpdate(
                { guildId: guild.id },
                { action: newAction },
                { upsert: true }
            );
            updateGuildConfigCache(guild.id, config);

            return ctx.reply(`✅ Voice moderation action updated to: **${newAction.toUpperCase()}**!`);
        }

        // ==========================================
        // SUBCOMMAND: LOGCHANNEL
        // ==========================================
        if (sub === 'logchannel' || sub === 'logs') {
            let targetChannel = null;
            if (ctx.isSlash) {
                targetChannel = ctx.interaction.options.getChannel('channel');
            } else if (ctx.args[1]) {
                const cleanId = ctx.args[1].replace(/[<#>]/g, '');
                targetChannel = guild.channels.cache.get(cleanId);
            }

            if (!targetChannel) {
                return ctx.reply('❌ Please specify a valid text channel for violation incident logs!\n*Example: `/vcmod logchannel #voice-logs`*');
            }

            config.logChannelId = targetChannel.id;
            await VoiceModerationConfig.findOneAndUpdate(
                { guildId: guild.id },
                { logChannelId: targetChannel.id },
                { upsert: true }
            );
            updateGuildConfigCache(guild.id, config);

            return ctx.reply(`✅ Voice moderation incident reports will now be sent to <#${targetChannel.id}>!`);
        }

        // ==========================================
        // SUBCOMMAND: SENSITIVITY
        // ==========================================
        if (sub === 'sensitivity') {
            let level = null;
            if (ctx.isSlash) {
                level = ctx.interaction.options.getString('level');
            } else {
                level = ctx.args[1]?.toLowerCase();
            }

            const valid = ['strict', 'standard', 'severe'];
            if (!level || !valid.includes(level)) {
                return ctx.reply('❌ Please choose a sensitivity level: `standard` (recommended), `strict`, or `severe`.');
            }

            config.sensitivity = level;
            await VoiceModerationConfig.findOneAndUpdate(
                { guildId: guild.id },
                { sensitivity: level },
                { upsert: true }
            );
            updateGuildConfigCache(guild.id, config);

            return ctx.reply(`✅ Voice moderation sensitivity set to: **${level.toUpperCase()}**!`);
        }

        // ==========================================
        // SUBCOMMAND: AUDIOWARNING
        // ==========================================
        if (sub === 'audiowarning') {
            let enabled = null;
            if (ctx.isSlash) {
                enabled = ctx.interaction.options.getBoolean('enabled');
            } else {
                const val = ctx.args[1]?.toLowerCase();
                enabled = val === 'on' || val === 'enable' || val === 'true';
            }

            config.audioWarning = Boolean(enabled);
            await VoiceModerationConfig.findOneAndUpdate(
                { guildId: guild.id },
                { audioWarning: Boolean(enabled) },
                { upsert: true }
            );
            updateGuildConfigCache(guild.id, config);

            return ctx.reply(`✅ In-VC audio warnings are now: **${enabled ? 'ENABLED' : 'DISABLED'}**!`);
        }

        // ==========================================
        // DEFAULT: DASHBOARD / PANEL
        // ==========================================
        const session = getActiveSession(guild.id);
        const stats = config.stats || {};

        const panelEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎙️ Starry AI Voice Moderation Control Panel')
            .setDescription('Intelligent real-time voice channel monitoring powered by Gemini Multimodal Audio AI.\nAutomatically detects verbal abuse, aggressive fighting, toxicity, and threats in voice channels.')
            .addFields(
                { 
                    name: '📡 Current Session', 
                    value: session ? `🟢 Monitoring <#${session.channel.id}>` : '⚪ Idle / Not Connected', 
                    inline: true 
                },
                { 
                    name: '⚖️ Action Enforced', 
                    value: `\`${(config.action || 'warn').toUpperCase()}\``, 
                    inline: true 
                },
                { 
                    name: '🎯 Sensitivity', 
                    value: `\`${(config.sensitivity || 'standard').toUpperCase()}\``, 
                    inline: true 
                },
                { 
                    name: '🗣️ Spoken Voice Warning', 
                    value: config.audioWarning ? '🟢 Enabled' : '🔴 Disabled', 
                    inline: true 
                },
                { 
                    name: '📋 Log Channel', 
                    value: config.logChannelId ? `<#${config.logChannelId}>` : '*None (uses mod log)*', 
                    inline: true 
                },
                { 
                    name: '📈 Incidents Detected', 
                    value: `**${config.totalViolations || 0}** total violations`, 
                    inline: true 
                },
                {
                    name: '📊 Violation Statistics',
                    value: `• 🥊 Fighting: **${stats.fighting || 0}**\n• 🤬 Verbal Abuse: **${stats.verbalAbuse || 0}**\n• ⚠️ Harassment: **${stats.harassment || 0}**\n• 🚨 Threats: **${stats.threats || 0}**`
                }
            )
            .setFooter({ text: 'Starry Sentinel • Real-Time Voice Channel Protection' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(session ? 'vcmod_panel_leave' : 'vcmod_panel_join')
                .setLabel(session ? 'Stop Monitoring' : 'Start Monitoring')
                .setStyle(session ? ButtonStyle.Danger : ButtonStyle.Success)
                .setEmoji(session ? '⏹️' : '🎙️'),
            new ButtonBuilder()
                .setCustomId('vcmod_panel_toggle_action')
                .setLabel(`Action: ${(config.action || 'warn').toUpperCase()}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⚖️'),
            new ButtonBuilder()
                .setCustomId('vcmod_panel_toggle_warning')
                .setLabel(`Audio Warning: ${config.audioWarning ? 'ON' : 'OFF'}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🗣️')
        );

        return ctx.reply({ embeds: [panelEmbed], components: [row] });
    }
};
