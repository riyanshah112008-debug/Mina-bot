const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const GuildTelemetry = require('../../models/GuildTelemetry');
const config = require('../../config');
const { 
    searchGuilds, 
    getOrCreateTelemetry, 
    buildServerTelemetryEmbed, 
    buildGlobalTelemetryEmbed 
} = require('../../modules/telemetryEngine');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('telemetry')
        .setDescription('📊 View server or global network telemetry, or configure 6-hour scheduler.')
        .setDMPermission(true)
        .addStringOption(option =>
            option.setName('server')
                .setDescription('Search telemetry by server name or 18-digit server ID')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('schedule')
                .setDescription('Configure automated periodic telemetry dispatch interval')
                .setRequired(false)
                .addChoices(
                    { name: 'Every 6 Hours (Recommended)', value: '6h' },
                    { name: 'Every 12 Hours', value: '12h' },
                    { name: 'Every 24 Hours (Daily)', value: '24h' },
                    { name: 'Turn Off Auto-Telemetry', value: 'off' }
                )
        )
        .addBooleanOption(option =>
            option.setName('global')
                .setDescription('View global network overview across all connected servers')
                .setRequired(false)
        ),

    async execute(interaction) {
        const isOwner = config.BOT_OWNERS.includes(interaction.user.id);
        const serverQuery = interaction.options.getString('server');
        const scheduleChoice = interaction.options.getString('schedule');
        const viewGlobal = interaction.options.getBoolean('global');

        // 1. Configure Scheduled Telemetry
        if (scheduleChoice) {
            if (!isOwner) {
                return interaction.reply({ content: '❌ Only bot developers/owners can configure automated telemetry schedules.', ephemeral: true });
            }

            const targetGuild = interaction.guild;
            if (!targetGuild) {
                return interaction.reply({ content: '❌ Please execute the schedule command inside a server channel.', ephemeral: true });
            }

            const doc = await getOrCreateTelemetry(targetGuild);

            if (scheduleChoice === 'off') {
                doc.autoSchedule.enabled = false;
                await doc.save();
                return interaction.reply({ content: `🔴 **Automated Telemetry Disabled** for **${targetGuild.name}**. You will no longer receive periodic DM reports.` });
            }

            let hours = 6;
            if (scheduleChoice === '12h') hours = 12;
            if (scheduleChoice === '24h') hours = 24;

            doc.autoSchedule.enabled = true;
            doc.autoSchedule.intervalHours = hours;
            doc.autoSchedule.target = 'dm';
            doc.autoSchedule.lastSent = new Date();
            await doc.save();

            return interaction.reply({
                content: `🟢 **Automated Telemetry Configured!**\n\n• **Interval:** Every **${hours} hours**\n• **Server:** **${targetGuild.name}**\n• **Destination:** Bot Owner DMs\n• **Next Dispatch:** <t:${Math.floor((Date.now() + hours * 3600000) / 1000)}:R>`
            });
        }

        await interaction.deferReply();

        // 2. Global Overview
        if (viewGlobal) {
            if (!isOwner && !interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
                return interaction.editReply('❌ Administrator permission required for global ecosystem overview.');
            }
            const allData = await GuildTelemetry.find({});
            const embed = buildGlobalTelemetryEmbed(interaction.client, allData);
            return interaction.editReply({ embeds: [embed] });
        }

        // 3. Search by Server Name or ID
        if (serverQuery) {
            if (!isOwner && !interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
                return interaction.editReply('❌ You can only view telemetry for this server. Contact bot owners for cross-server queries.');
            }

            const matched = searchGuilds(interaction.client, serverQuery);
            if (matched.length === 0) {
                return interaction.editReply(`❌ No connected servers found matching: **"${serverQuery}"**.\n*Check the spelling or supply the exact server ID.*`);
            }

            const targetGuild = matched[0];
            const telemetryDoc = await getOrCreateTelemetry(targetGuild);
            const embed = buildServerTelemetryEmbed(targetGuild, telemetryDoc, interaction.client);
            return interaction.editReply({ embeds: [embed] });
        }

        // 4. Default: Current Server
        if (!interaction.guild) {
            return interaction.editReply('❌ Please specify a server name or use `/telemetry global:True` in DMs.');
        }

        const currentDoc = await getOrCreateTelemetry(interaction.guild);
        const embed = buildServerTelemetryEmbed(interaction.guild, currentDoc, interaction.client);
        return interaction.editReply({ embeds: [embed] });
    }
};
