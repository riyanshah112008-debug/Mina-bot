// ==========================================
// 🤖 STARRY DEV COUNCIL & CODE STUDIO COMMAND
// File Path: src/commands/utility/codeStudio.js
// /code-studio [review | invent | generate]
// Prefix: ,review, ,codereview, ,council, ,invent, ,code
// ==========================================
const { SlashCommandBuilder } = require('discord.js');
const { 
    reviewCodeWithCouncil, 
    inventFeatureWithCouncil, 
    generateCodeWithCouncil 
} = require('../../modules/devCouncil');

module.exports = {
    name: 'code-studio',
    description: '🤖 Multi-AI Collective Coding: CodeRabbit review, feature invention & code generation.',
    category: 'utility',
    aliases: ['review', 'codereview', 'council', 'invent', 'code', 'devcouncil'],
    data: new SlashCommandBuilder()
        .setName('code-studio')
        .setDescription('🤖 Multi-AI Collective Coding: CodeRabbit review, feature invention & code generation.')
        .addSubcommand(sub => 
            sub.setName('review')
               .setDescription('🐰 Multi-AI Code Review: CodeRabbit security audit, Claude architecture, & OpenAI polish.')
               .addStringOption(opt => 
                   opt.setName('code')
                      .setDescription('The code snippet to review')
                      .setRequired(true)
               )
        )
        .addSubcommand(sub => 
            sub.setName('invent')
               .setDescription('✨ Invent an unprecedented Discord bot feature that no bot has ever created.')
               .addStringOption(opt => 
                   opt.setName('idea')
                      .setDescription('Theme or idea for the new feature')
                      .setRequired(false)
               )
        )
        .addSubcommand(sub => 
            sub.setName('generate')
               .setDescription('💻 Collective Code Generation: Write production-grade code with multi-agent consensus.')
               .addStringOption(opt => 
                   opt.setName('prompt')
                      .setDescription('Description of what code to write')
                      .setRequired(true)
               )
        ),

    async execute(ctx) {
        let action = 'review';
        let input = '';

        if (ctx.isSlash) {
            action = ctx.interaction.options.getSubcommand(false) || 'review';
            if (action === 'review') input = ctx.interaction.options.getString('code', true);
            else if (action === 'invent') input = ctx.interaction.options.getString('idea') || 'Next-Gen Community Innovation';
            else if (action === 'generate') input = ctx.interaction.options.getString('prompt', true);
        } else {
            // Prefix Command Dispatcher (,review, ,invent, ,code)
            const rawContent = ctx.message?.content || '';
            const args = ctx.args || [];
            const cmdName = (ctx.args && ctx.args._cmdName) || '';

            // Check if user replied to another message containing a code block
            let repliedCode = null;
            if (ctx.message?.reference?.messageId) {
                try {
                    const refMsg = await ctx.channel.messages.fetch(ctx.message.reference.messageId).catch(() => null);
                    if (refMsg && refMsg.content) {
                        repliedCode = refMsg.content;
                    }
                } catch (e) {}
            }

            if (rawContent.includes('invent')) {
                action = 'invent';
                input = args.join(' ').trim() || 'Next-Gen Community Innovation';
            } else if (rawContent.includes('code') && !rawContent.includes('codereview')) {
                action = 'generate';
                input = args.join(' ').trim();
                if (!input) return ctx.reply('⚠️ Usage: `,code <description of code to build>`');
            } else {
                action = 'review';
                input = repliedCode || args.join(' ').trim();
                if (!input) {
                    return ctx.reply('⚠️ Usage: `,review <code>` (or reply to a message containing a code block with `,review`)');
                }
            }
        }

        await ctx.deferReply();

        try {
            if (action === 'review') {
                const { embed, components } = await reviewCodeWithCouncil(input, ctx.user);
                return await ctx.editReply({ embeds: [embed], components });
            } else if (action === 'invent') {
                const { embed, components } = await inventFeatureWithCouncil(input, ctx.user);
                return await ctx.editReply({ embeds: [embed], components });
            } else if (action === 'generate') {
                const { embed, components } = await generateCodeWithCouncil(input, ctx.user);
                return await ctx.editReply({ embeds: [embed], components });
            }
        } catch (err) {
            console.error('❌ [CodeStudio Error]:', err);
            return await ctx.editReply({ content: `⚠️ Failed to execute collective coding: ${err.message}` });
        }
    }
};
