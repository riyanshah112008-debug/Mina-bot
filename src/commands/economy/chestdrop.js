const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');

// Shared Mongoose Schema for Chest Settings
const ChestGuild = mongoose.models.ChestGuild || mongoose.model('ChestGuild', new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: true }
}));

const OWNER_ID = '1465049039153135639';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chestdrop')
        .setDescription('Configure random chest drop settings for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Enable, disable, or check chest drop status')
                .setRequired(true)
                .addChoices(
                    { name: '🟢 Enable Chest Drops', value: 'enable' },
                    { name: '🔴 Disable Chest Drops', value: 'disable' },
                    { name: '📊 Check Status', value: 'status' }
                )
        ),

    async execute(interaction) {
        const isOwner = typeof interaction.client.isOwner === 'function' 
            ? interaction.client.isOwner(interaction.user.id) 
            : interaction.user.id === OWNER_ID;
            
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!isAdmin && !isOwner) {
            return interaction.reply({ 
                content: '❌ You need **Administrator** permissions to use this command.', 
                ephemeral: true 
            });
        }

        const action = interaction.options.getString('action');
        const guildId = interaction.guildId;

        // Check Status
        if (action === 'status') {
            const setting = await ChestGuild.findOne({ guildId }).lean();
            const isEnabled = setting ? setting.enabled : true;

            const statusEmbed = new EmbedBuilder()
                .setColor(isEnabled ? '#57F287' : '#ED4245')
                .setTitle('💰 Random Chest Drops Status')
                .setDescription(`> Random chest drops are currently **${isEnabled ? 'ENABLED 🟢' : 'DISABLED 🔴'}** in this server.`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            return interaction.reply({ embeds: [statusEmbed], ephemeral: true });
        }

        // Toggle Enable / Disable
        const targetState = action === 'enable';
        await ChestGuild.findOneAndUpdate({ guildId }, { enabled: targetState }, { upsert: true, new: true });

        const resultEmbed = new EmbedBuilder()
            .setColor(targetState ? '#57F287' : '#ED4245')
            .setTitle(targetState ? '✅ Chest Drops Enabled' : '🚫 Chest Drops Disabled')
            .setDescription(`> Random chest drops have been **${targetState ? 'ENABLED' : 'DISABLED'}** for this entire server.`)
            .setTimestamp();

        return interaction.reply({ embeds: [resultEmbed] });
    }
};
