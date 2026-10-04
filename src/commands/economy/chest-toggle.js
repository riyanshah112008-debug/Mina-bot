const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const ChestChannel = require('../../models/ChestChannel');
const mongoose = require('mongoose');

const ChestGuild = mongoose.models.ChestGuild || mongoose.model('ChestGuild', new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: true }
}));

const OWNER_ID = '1465049039153135639';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chest-toggle')
        .setDescription('Toggle or configure automatic chest drops for your server or a channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('server')
                .setDescription('Toggle chest drops across this server')
                .addStringOption(opt =>
                    opt.setName('action')
                        .setDescription('Enable, disable or check status')
                        .setRequired(false)
                        .addChoices(
                            { name: '🟢 Enable Everywhere', value: 'enable' },
                            { name: '🔴 Disable Everywhere', value: 'disable' },
                            { name: '📊 Check Status', value: 'status' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('channel')
                .setDescription('Toggle chest drops for a specific channel')
                .addChannelOption(opt =>
                    opt.setName('target')
                        .setDescription('Select the channel')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('action')
                        .setDescription('Enable or disable in this channel')
                        .setRequired(false)
                        .addChoices(
                            { name: '🟢 Enable Channel', value: 'enable' },
                            { name: '🔴 Disable Channel', value: 'disable' }
                        )
                )
        ),

    async execute(interaction, client) {
        const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);
        const isOwner = typeof client?.isOwner === 'function' ? client.isOwner(interaction.user.id) : interaction.user.id === OWNER_ID;

        if (!isAdmin && !isOwner) {
            return interaction.reply({ content: '❌ You need **Administrator** permissions to configure chest drops.', ephemeral: true });
        }

        if (!client.chestChannelsCache) {
            client.chestChannelsCache = new Set();
            const channels = await ChestChannel.find();
            channels.forEach(c => client.chestChannelsCache.add(c.channelId));
        }

        const sub = interaction.options.getSubcommand(false) || 'server';
        const guildId = interaction.guildId;

        if (sub === 'server') {
            const action = interaction.options.getString('action');

            if (action === 'status') {
                const setting = await ChestGuild.findOne({ guildId }).lean();
                const isEnabled = setting ? setting.enabled : true;
                const activeChannels = await ChestChannel.find({ guildId }).lean();

                const statusEmbed = new EmbedBuilder()
                    .setColor(isEnabled ? '#57F287' : '#ED4245')
                    .setTitle('💰 Random Chest Drops Status')
                    .setDescription(
                        `> Server-wide Status: **${isEnabled ? 'ENABLED 🟢' : 'DISABLED 🔴'}**\n` +
                        `> Configured Channels: **${activeChannels.length}**\n` +
                        (activeChannels.length > 0 ? activeChannels.map(c => `<#${c.channelId}>`).join(', ') : '*No specific channels enabled. Chest drops will spawn in active text channels when enabled.*')
                    )
                    .setFooter({ text: `Configured by ${interaction.user.tag}` })
                    .setTimestamp();

                return interaction.reply({ embeds: [statusEmbed], ephemeral: true });
            }

            if (action === 'disable') {
                await ChestGuild.findOneAndUpdate({ guildId }, { enabled: false }, { upsert: true, new: true });
                const guildChannels = await ChestChannel.find({ guildId });
                for (const c of guildChannels) {
                    client.chestChannelsCache.delete(c.channelId);
                }
                await ChestChannel.deleteMany({ guildId });

                const embed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('🚫 Chest Drops Disabled')
                    .setDescription(`> Random chest drops have been **DISABLED** across **${interaction.guild.name}**.`)
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

            // Default or action === 'enable'
            await ChestGuild.findOneAndUpdate({ guildId }, { enabled: true }, { upsert: true, new: true });
            const currentChan = interaction.channel;
            if (currentChan && currentChan.id) {
                await ChestChannel.findOneAndUpdate(
                    { guildId, channelId: currentChan.id },
                    { guildId, channelId: currentChan.id },
                    { upsert: true }
                );
                client.chestChannelsCache.add(currentChan.id);
            }

            const embed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('🎉 Chest Drops Enabled')
                .setDescription(`> Random chest drops have been **ENABLED** for **${interaction.guild.name}**!\n> Active drop channel: <#${currentChan.id}>. Members can chat to discover loot chests.`)
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'channel') {
            const target = interaction.options.getChannel('target');
            const action = interaction.options.getString('action') || (client.chestChannelsCache.has(target.id) ? 'disable' : 'enable');

            if (action === 'enable') {
                await ChestChannel.findOneAndUpdate(
                    { guildId, channelId: target.id },
                    { guildId, channelId: target.id },
                    { upsert: true }
                );
                client.chestChannelsCache.add(target.id);
                return interaction.reply({ content: `✅ Chest drops are now **ENABLED** in <#${target.id}>!`, ephemeral: true });
            } else {
                await ChestChannel.deleteOne({ guildId, channelId: target.id });
                client.chestChannelsCache.delete(target.id);
                return interaction.reply({ content: `🚫 Chest drops are now **DISABLED** in <#${target.id}>.`, ephemeral: true });
            }
        }
    }
};
