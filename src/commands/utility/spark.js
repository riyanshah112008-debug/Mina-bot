// ==========================================
// 🌌 STARRY AI CHAT SPARK COMMAND
// File Path: src/commands/utility/spark.js
// Context-Aware Dead Chat Reviver & Interactive Voting Dilemmas
// ==========================================
const { SlashCommandBuilder } = require('discord.js');
const { createChatSpark } = require('../../modules/chatSpark');

module.exports = {
    name: 'spark',
    description: '✨ Intelligent AI conversation spark & dilemma poll to revive and ignite chat',
    category: 'Utility',
    usage: ',spark',
    aliases: ['revive', 'topic', 'deadchat', 'chatreviver'],
    autoDefer: true,

    data: new SlashCommandBuilder()
        .setName('spark')
        .setDescription('✨ Intelligent AI conversation spark & dilemma poll to revive and ignite chat')
        .setContexts([0])
        .setIntegrationTypes([0]),

    async execute(ctx) {
        if (!ctx.channel) {
            return ctx.reply('❌ This command can only be used in a text channel!');
        }

        const { embed, row } = await createChatSpark(ctx.channel, ctx.user);
        return ctx.reply({ embeds: [embed], components: [row] });
    }
};
