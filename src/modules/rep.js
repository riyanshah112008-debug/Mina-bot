// ==========================================
// 1. IMPORTS & MONGOOSE SCHEMAS
// ==========================================
const { 
    EmbedBuilder, 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const mongoose = require('mongoose');

// Mongoose User Schema for Reputation and XP Tracking
const userRepSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    reputation: { type: Number, default: 0 },
    lastRepGiven: { type: Date, default: null },
    messagesCount: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 }
});

userRepSchema.index({ guildId: 1, userId: 1 }, { unique: true });
const UserRep = mongoose.models.UserRep || mongoose.model('UserRep', userRepSchema);

// ==========================================
// 2. SLASH COMMAND DEFINITIONS
// ==========================================
const repCommand = new SlashCommandBuilder()
    .setName('rep')
    .setDescription('+1 Give reputation to a helpful server member')
    .addUserOption(option => 
        option.setName('user')
            .setDescription('The member you want to give reputation to')
            .setRequired(true));

const checkRepCommand = new SlashCommandBuilder()
    .setName('checkrep')
    .setDescription('⭐ Check your or another member\'s total reputation score')
    .addUserOption(option => 
        option.setName('user')
            .setDescription('The user whose reputation you want to view')
            .setRequired(false));

const leaderboardCommand = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('🏆 Display top server rankings for Reputation and XP');

// ==========================================
// 3. MAIN REPUTATION MODULE
// ==========================================
const repModule = (client) => {

    // Register slash commands into client command collection
    if (client.commands && typeof client.commands.set === 'function') {
        client.commands.set('rep', { data: repCommand, execute: handleRepCommand });
        client.commands.set('checkrep', { data: checkRepCommand, execute: handleCheckRepCommand });
        client.commands.set('leaderboard', { data: leaderboardCommand, execute: handleLeaderboardCommand });
    }

    // --- /rep Command Execution ---
    async function handleRepCommand(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
        } catch (e) { return; }

        const targetUser = interaction.options.getUser('user', true);

        if (targetUser.id === interaction.user.id) {
            return interaction.editReply('❌ You cannot give reputation to yourself!');
        }

        if (targetUser.bot) {
            return interaction.editReply('❌ Bots cannot earn reputation!');
        }

        const CooldownMs = 12 * 60 * 60 * 1000; // 12 Hour Cooldown
        let giverData = await UserRep.findOne({ guildId: interaction.guildId, userId: interaction.user.id });

        if (!giverData) {
            giverData = new UserRep({ guildId: interaction.guildId, userId: interaction.user.id });
        }

        if (giverData.lastRepGiven && (Date.now() - giverData.lastRepGiven.getTime() < CooldownMs)) {
            const nextRepTime = Math.floor((giverData.lastRepGiven.getTime() + CooldownMs) / 1000);
            return interaction.editReply(`⏳ You are on cooldown! You can give reputation again <t:${nextRepTime}:R>.`);
        }

        let receiverData = await UserRep.findOne({ guildId: interaction.guildId, userId: targetUser.id });
        if (!receiverData) {
            receiverData = new UserRep({ guildId: interaction.guildId, userId: targetUser.id });
        }

        receiverData.reputation += 1;
        giverData.lastRepGiven = new Date();

        await receiverData.save();
        await giverData.save();

        const embed = new EmbedBuilder()
            .setColor('#23A559')
            .setTitle('⭐ Reputation Point Awarded!')
            .setDescription(`${interaction.user} gave **+1 Rep** to ${targetUser}!`)
            .addFields(
                { name: 'Target User', value: `${targetUser.tag}`, inline: true },
                { name: 'Total Reputation', value: `⭐ \`${receiverData.reputation}\``, inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Starry Reputation System' })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }

    // --- /checkrep Command Execution ---
    async function handleCheckRepCommand(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
        } catch (e) { return; }

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const userData = await UserRep.findOne({ guildId: interaction.guildId, userId: targetUser.id });
        const repScore = userData ? userData.reputation : 0;

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`⭐ Reputation Score`)
            .setDescription(`**${targetUser.username}** has accumulated **${repScore}** reputation point${repScore === 1 ? '' : 's'}.`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `User ID: ${targetUser.id}` })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }

    // --- /leaderboard Command Execution ---
    async function handleLeaderboardCommand(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
        } catch (e) { return; }

        const topUsers = await UserRep.find({ guildId: interaction.guildId })
            .sort({ reputation: -1, xp: -1 })
            .limit(10);

        if (!topUsers || topUsers.length === 0) {
            return interaction.editReply('🏆 **Leaderboard is empty!** Start giving reputation with `/rep`!');
        }

        const leaderboardList = topUsers.map((u, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**#${index + 1}**`;
            return `${medal} <@${u.userId}> • ⭐ **${u.reputation}** Rep | ⚡ Level **${u.level}**`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle(`🏆 Server Leaderboard — ${interaction.guild.name}`)
            .setDescription(leaderboardList)
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }) || undefined)
            .setFooter({ text: 'Starry Global Leaderboard Engine' })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }

    // --- Interaction Event Router ---
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName === 'rep') await handleRepCommand(interaction);
        if (interaction.commandName === 'checkrep') await handleCheckRepCommand(interaction);
        if (interaction.commandName === 'leaderboard') await handleLeaderboardCommand(interaction);
    });
};

repModule.UserRep = UserRep;
module.exports = repModule;
