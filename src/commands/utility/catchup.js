// ==========================================
// 📰 STARRY AI CHANNEL CATCH-UP COMMAND
// File Path: src/commands/utility/catchup.js
// Autonomous Conversation Summarizer • Executive TL;DR & Highlights
// ==========================================
const { 
    SlashCommandBuilder, 
    ChannelType 
} = require('discord.js');
const { generateChannelCatchup } = require('../../modules/chatCatchup');

module.exports = {
    name: 'catchup',
    description: '📰 AI executive summary of what was discussed in the channel while you were away',
    category: 'Utility',
    usage: ',catchup [hours] [#channel]',
    aliases: ['tldr', 'recap', 'summary', 'missed'],
    autoDefer: true,

    data: new SlashCommandBuilder()
        .setName('catchup')
        .setDescription('📰 AI executive summary of what was discussed in the channel while you were away')
        .setContexts([0])
        .setIntegrationTypes([0])
        .addIntegerOption(opt => 
            opt.setName('hours')
               .setDescription('Time window to summarize (default: 6 hours)')
               .setRequired(false)
               .addChoices(
                   { name: '1 Hour (Recent discussions)', value: 1 },
                   { name: '3 Hours (Morning / Afternoon recap)', value: 3 },
                   { name: '6 Hours (Half-day catch-up - Recommended)', value: 6 },
                   { name: '12 Hours (Full day summary)', value: 12 },
                   { name: '24 Hours (Full 24h day digest)', value: 24 }
               )
        )
        .addChannelOption(opt => 
            opt.setName('channel')
               .setDescription('Specific text channel to summarize (defaults to current channel)')
               .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
               .setRequired(false)
        )
        .addBooleanOption(opt => 
            opt.setName('public')
               .setDescription('Whether to post the summary publicly in the channel (default: private/only you)')
               .setRequired(false)
        ),

    async execute(ctx) {
        if (!ctx.guild) {
            return ctx.reply('❌ Channel Catch-Up can only be used inside a Discord server!');
        }

        let targetChannel = ctx.channel;
        let hours = 6;
        let isPublic = false;

        if (ctx.isSlash) {
            const ch = ctx.interaction.options.getChannel('channel');
            if (ch) targetChannel = ch;
            hours = ctx.interaction.options.getInteger('hours') || 6;
            isPublic = ctx.interaction.options.getBoolean('public') || false;
        } else {
            if (ctx.args[0]) {
                const parsedHours = parseInt(ctx.args[0], 10);
                if (!isNaN(parsedHours) && parsedHours > 0) {
                    hours = Math.min(24, parsedHours);
                }
            }
            if (ctx.args[1]) {
                const cleanId = ctx.args[1].replace(/[<#>]/g, '');
                const foundCh = ctx.guild.channels.cache.get(cleanId);
                if (foundCh && foundCh.isTextBased()) targetChannel = foundCh;
            }
            isPublic = true; // Prefix commands reply in-channel
        }

        if (!targetChannel || !targetChannel.isTextBased()) {
            return ctx.reply('❌ Selected channel is not a valid text channel!');
        }

        const { embed, components } = await generateChannelCatchup(targetChannel, {
            hours,
            user: ctx.user
        });

        if (ctx.isSlash && !isPublic) {
            // Send privately (ephemeral)
            return ctx.reply({ embeds: [embed], components, ephemeral: true });
        }

        return ctx.reply({ embeds: [embed], components });
    }
};
