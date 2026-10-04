// ==========================================
// 🗞️ STARRY STARLIGHT GAZETTE: COMMAND CONTROLLER
// File Path: src/commands/utility/gazette.js
// /gazette
// Prefix: ,gazette, ,digest, ,newspaper, ,gazetteweekly
// Autonomous Weekly Digest & Community Chronicle
// ==========================================
const { SlashCommandBuilder } = require('discord.js');
const { generateServerGazette } = require('../../modules/serverGazette');

module.exports = {
    name: 'gazette',
    description: '🗞️ Autonomous Community Newspaper: Curated weekly digest, MVP awards & vitality index.',
    category: 'utility',
    usage: ',gazette [days: 1-14] [public]',
    aliases: ['digest', 'newspaper', 'starlightgazette', 'gazetteweekly', 'weeklydigest'],
    data: new SlashCommandBuilder()
        .setName('gazette')
        .setDescription('🗞️ Autonomous Community Newspaper: Curated weekly digest, MVP awards & vitality index.')
        .setContexts([0])
        .setIntegrationTypes([0])
        .addIntegerOption(opt =>
            opt.setName('days')
               .setDescription('Timeframe in days to synthesize (1 to 14 days, Default: 7)')
               .setRequired(false)
               .setMinValue(1)
               .setMaxValue(14)
        )
        .addBooleanOption(opt =>
            opt.setName('public')
               .setDescription('Whether to post the publication publicly in the channel (Default: false)')
               .setRequired(false)
        ),

    async execute(ctx) {
        if (!ctx.guild) {
            return ctx.reply('❌ The Starlight Gazette can only be published inside a Discord server!');
        }

        let days = 7;
        let isPublic = false;

        if (ctx.isSlash) {
            days = ctx.interaction.options.getInteger('days') || 7;
            isPublic = ctx.interaction.options.getBoolean('public') || false;
        } else {
            if (ctx.args && ctx.args[0]) {
                const parsed = parseInt(ctx.args[0], 10);
                if (!isNaN(parsed) && parsed >= 1 && parsed <= 14) {
                    days = parsed;
                }
            }
            // Prefix commands default to public channel response
            isPublic = true;
        }

        // Defer response while harvesting multi-channel messages & running AI synthesis
        await ctx.deferReply({ ephemeral: !isPublic });

        try {
            const { embed, components } = await generateServerGazette(ctx.guild, ctx.user, { days, page: 0 });
            return await ctx.editReply({ embeds: [embed], components });
        } catch (err) {
            console.error('❌ [Gazette Command Error]:', err);
            return await ctx.editReply({ 
                content: `⚠️ Failed to compile The Starlight Gazette: ${err.message}` 
            });
        }
    }
};
