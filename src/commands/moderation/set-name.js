const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ServerSettings = require('../../models/ServerSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-name')
        .setDescription('Change the bot\'s trigger word/name for this server (Admins Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt => 
            opt.setName('name')
               .setDescription('The new trigger word (e.g., Jarvis, HelperBot)')
               .setRequired(true)
        ),

    async execute(interaction) {
        const newName = interaction.options.getString('name');

        // Find the server settings and update the trigger word (or create it if it doesn't exist)
        await ServerSettings.findOneAndUpdate(
            { guildId: interaction.guild.id },
            { triggerWord: newName },
            { upsert: true, new: true }
        );

        const { t } = require('../../utils/i18n');
        return interaction.reply({ 
            content: t(interaction.guild.id, 'setname.success', { name: newName }), 
            ephemeral: true 
        });
    }
};
