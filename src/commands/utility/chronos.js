// ==========================================
// ⏳ STARRY CHRONOS: COMMAND CONTROLLER
// File Path: src/commands/utility/chronos.js
// /chronos
// Prefix: ,chronos, ,timemachine, ,goldenhour, ,forecast
// ==========================================
const { SlashCommandBuilder } = require('discord.js');
const { analyzeServerChronos } = require('../../modules/serverChronos');

module.exports = {
    name: 'chronos',
    description: '⏳ Predictive Server Time-Machine: Circadian heatmaps, timezone centroid & Golden Hour forecasts.',
    category: 'utility',
    aliases: ['timemachine', 'goldenhour', 'forecast', 'serverforecast', 'pulsehour'],
    data: new SlashCommandBuilder()
        .setName('chronos')
        .setDescription('⏳ Predictive Server Time-Machine: Circadian heatmaps & Golden Hour forecasts.')
        .addBooleanOption(opt => 
            opt.setName('public')
               .setDescription('Whether to post the forecast publicly in the channel (Default: false)')
               .setRequired(false)
        ),

    async execute(ctx) {
        if (!ctx.guild) {
            return ctx.reply('❌ Chronos Time-Machine can only be run inside a Discord server!');
        }

        const isPublic = ctx.isSlash ? (ctx.interaction.options.getBoolean('public') ?? false) : true;
        await ctx.deferReply({ ephemeral: !isPublic });

        try {
            const { embed, components } = await analyzeServerChronos(ctx.guild, ctx.user);
            return await ctx.editReply({ embeds: [embed], components });
        } catch (err) {
            console.error('❌ [Chronos Command Error]:', err);
            return await ctx.editReply({ content: `⚠️ Failed to compute server chronological forecast: ${err.message}` });
        }
    }
};
