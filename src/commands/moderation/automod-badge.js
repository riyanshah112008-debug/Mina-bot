// ==========================================
// 🛡️ STARRY "USES AUTOMOD" BADGE COMMAND
// File Path: src/commands/moderation/automod-badge.js
// Visual progress tracker & 1-click batch deployment for Discord's official AutoMod Badge
// ==========================================
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits 
} = require('discord.js');
const nativeAutoMod = require('../../modules/nativeAutoMod');

function createProgressBar(current, max, size = 15) {
    const ratio = Math.min(1, Math.max(0, current / max));
    const filled = Math.round(ratio * size);
    const empty = size - filled;
    return `\`[${'█'.repeat(filled)}${'░'.repeat(empty)}]\` **${Math.round(ratio * 100)}%**`;
}

function buildBadgeEmbed(progress, client, botUser) {
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=18014398509481983&scope=bot%20applications.commands`;

    const embed = new EmbedBuilder()
        .setColor(progress.hasBadge ? '#10B981' : '#5865F2')
        .setTitle('🛡️ Discord "Uses AutoMod" Profile Badge Manager')
        .setDescription(
            `Discord automatically awards the **[🤖 Uses AutoMod]** profile badge to bots with **at least 100 active native AutoMod rules** across their installed servers.\n\n` +
            `*Currently tracking application:* **${botUser.username}#${botUser.discriminator || '0'}**`
        )
        .addFields(
            {
                name: '📊 Badge Qualification Progress',
                value: `${createProgressBar(progress.totalStarryRules, progress.target)}\n` +
                       `• Active Rules by Starry: **${progress.totalStarryRules} / ${progress.target}**\n` +
                       `• Qualification Status: ${progress.hasBadge ? '✅ **QUALIFIED! Badge is being synced by Discord (12–24h)**' : `⏳ **${progress.remaining} rules remaining**`}`,
                inline: false
            },
            {
                name: '🌐 Current Network Capacity',
                value: `• Connected Servers: **${progress.totalGuilds} servers**\n` +
                       `• Eligible Servers (Manage Server): **${progress.eligibleGuilds} servers**\n` +
                       `• Open Rule Slots Available: **${progress.totalSlotsAvailable} slots**`,
                inline: false
            },
            {
                name: '🎯 Fast Route to 100 Rules',
                value: progress.hasBadge 
                    ? '🎉 **Congratulations!** You have reached 100+ native rules. Discord\'s profile badge engine typically refreshes within 12–24 hours.'
                    : `1. Tap **⚡ Deploy to All Current Servers** below to fill available slots.\n` +
                      `2. Create **${progress.estimatedGuildsNeeded} free private Discord servers** (takes 2 minutes).\n` +
                      `3. Invite Starry with **Manage Server** using the Invite button.\n` +
                      `4. Tap deploy again! Reaching 100 unlocks the badge on Starry\'s profile.`,
                inline: false
            }
        )
        .setFooter({ text: 'Discord Native AutoMod Engine • Starry Pro Security', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ambadge_deploy_all')
            .setLabel('⚡ Deploy to All Current Servers')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('ambadge_deploy_here')
            .setLabel('🛡️ Deploy in This Server Only')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('ambadge_refresh')
            .setLabel('🔄 Refresh')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setLabel('➕ Invite to More Servers')
            .setStyle(ButtonStyle.Link)
            .setURL(inviteUrl)
    );

    return { embeds: [embed], components: [row] };
}

module.exports = {
    name: 'automod-badge',
    aliases: ['ambadge', 'automodbadge', 'automodsign', 'automod-sign'],
    category: 'moderation',
    description: 'Track and deploy native Discord AutoMod rules across servers to earn the "Uses AutoMod" profile badge.',
    
    data: new SlashCommandBuilder()
        .setName('automod-badge')
        .setDescription('Track and batch-deploy AutoMod rules to unlock the official "Uses AutoMod" profile badge')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(ctx, args) {
        // Normalize context for prefix message or slash interaction
        const isInteraction = Boolean(ctx.isChatInputCommand || ctx.isCommand);
        const client = ctx.client;
        const guild = ctx.guild;
        const user = isInteraction ? ctx.user : ctx.author;

        if (isInteraction) {
            await ctx.deferReply().catch(() => {});
        }

        const initialProgress = await nativeAutoMod.getBadgeProgress(client);
        const payload = buildBadgeEmbed(initialProgress, client, client.user);

        let replyMessage;
        if (isInteraction) {
            replyMessage = await ctx.editReply(payload);
        } else {
            replyMessage = await ctx.reply(payload);
        }

        // Handle button interactions
        const collector = replyMessage.createMessageComponentCollector({
            filter: i => i.user.id === user.id,
            time: 300000 // 5 minutes
        });

        collector.on('collect', async (interaction) => {
            await interaction.deferUpdate().catch(() => {});

            if (interaction.customId === 'ambadge_deploy_all') {
                const loadingEmbed = new EmbedBuilder()
                    .setColor('#F59E0B')
                    .setTitle('⚡ Deploying Native AutoMod Rules...')
                    .setDescription('Batch deploying official Starry AutoMod rules across all connected servers. Please wait...');
                await interaction.editReply({ embeds: [loadingEmbed], components: [] });

                const result = await nativeAutoMod.deployAllGuilds(client);
                const updatedProgress = await nativeAutoMod.getBadgeProgress(client);
                const updatedPayload = buildBadgeEmbed(updatedProgress, client, client.user);

                const statusNotice = new EmbedBuilder()
                    .setColor('#10B981')
                    .setTitle('✅ Batch AutoMod Deployment Complete!')
                    .setDescription(
                        `• Newly Deployed Rules: **+${result.totalCreated} rules**\n` +
                        `• Servers Configured: **${result.guildsUpdated} servers**\n` +
                        `• Total Starry Rules: **${updatedProgress.totalStarryRules} / 100**\n\n` +
                        (updatedProgress.hasBadge 
                            ? '🎉 **100 RULES REACHED!** Discord is syncing the "Uses AutoMod" badge to your bot profile!' 
                            : `👉 Need **${updatedProgress.remaining} more rules** (${updatedProgress.estimatedGuildsNeeded} servers) to reach 100!`)
                    );

                await interaction.editReply({ 
                    embeds: [statusNotice, updatedPayload.embeds[0]], 
                    components: updatedPayload.components 
                });

            } else if (interaction.customId === 'ambadge_deploy_here') {
                if (!guild) {
                    return interaction.followUp({ content: '❌ This action must be performed in a server.', ephemeral: true });
                }
                const res = await nativeAutoMod.deployGuildRules(guild, client);
                const updatedProgress = await nativeAutoMod.getBadgeProgress(client);
                const updatedPayload = buildBadgeEmbed(updatedProgress, client, client.user);

                const notice = new EmbedBuilder()
                    .setColor(res.success ? '#10B981' : '#EF4444')
                    .setTitle(res.success ? '✅ Server AutoMod Rules Configured!' : '⚠️ Deployment Notice')
                    .setDescription(res.success 
                        ? `Deployed **${res.createdCount} native rules** in **${guild.name}**!\nTotal Starry Rules across all servers: **${updatedProgress.totalStarryRules} / 100**.`
                        : `Could not deploy: ${res.reason}`);

                await interaction.editReply({ 
                    embeds: [notice, updatedPayload.embeds[0]], 
                    components: updatedPayload.components 
                });

            } else if (interaction.customId === 'ambadge_refresh') {
                const refreshedProgress = await nativeAutoMod.getBadgeProgress(client);
                const refreshedPayload = buildBadgeEmbed(refreshedProgress, client, client.user);
                await interaction.editReply(refreshedPayload);
            }
        });

        collector.on('end', () => {
            replyMessage.edit({ components: [] }).catch(() => {});
        });
    }
};
