const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prestige')
        .setDescription('Reset your level to gain Prestige 👑 and permanent bonus multipliers!'),

    async execute(interaction, client) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        let userData = await User.findOne({ userId, guildId });
        if (!userData || userData.level < 50) {
            return interaction.editReply('❌ You must reach **Level 50** before you can Prestige!');
        }

        // Increment Prestige and Reset Level/XP
        userData.prestige += 1;
        userData.level = 1;
        userData.xp = 0;
        await userData.save();

        const embed = new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle('👑 PRESTIGE UNLOCKED! 👑')
            .setDescription(
                `Congratulations <@${userId}>! You have reset your Level back to **1** and advanced to **Prestige ${userData.prestige}**!\n\n` +
                `✨ **Permanent Perks Earned:**\n` +
                `• **+15% Boost** to all XP and Credits earned from chests.\n` +
                `• Exclusive Prestige Badge displayed on your profile.`
            )
            .setFooter({ text: 'Starry Prestige System', iconURL: client.user.displayAvatarURL() });

        return interaction.editReply({ embeds: [embed] });
    }
};
