// ==========================================
// 🌌 STARRY AI SERVER QUANTUM PULSE COMMAND
// File Path: src/commands/utility/pulse.js
// Real-Time Community Health • Vibe Radar • AI Executive Briefing
// ==========================================
const { SlashCommandBuilder } = require('discord.js');
const { generateServerPulse } = require('../../modules/serverPulse');

module.exports = {
    name: 'pulse',
    description: '🌌 Real-time AI Server Health, Community Vibe Radar & Executive Intelligence Briefing',
    category: 'Utility',
    usage: ',pulse',
    aliases: ['serverpulse', 'health', 'vibe', 'intelligence'],
    autoDefer: true,

    data: new SlashCommandBuilder()
        .setName('pulse')
        .setDescription('🌌 Real-time AI Server Health, Community Vibe Radar & Executive Intelligence Briefing')
        .setContexts([0])
        .setIntegrationTypes([0]),

    async execute(ctx) {
        if (!ctx.guild) {
            return ctx.reply('❌ This command can only be used inside a Discord server!');
        }

        const { embed, row } = await generateServerPulse(ctx.guild, ctx.client);
        return ctx.reply({ embeds: [embed], components: [row] });
    }
};
