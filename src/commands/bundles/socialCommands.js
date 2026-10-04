// ==========================================
// 🎭 Starry SUPREME SOCIAL & ANIME ACTIONS (34 COMMANDS)
// File Path: src/commands/bundles/socialCommands.js
// 1-Year Interactive Action Back Buttons & High-Definition Anime GIFs
// MongoDB Database Persistence for Hugs, Kisses, Pats & Highfives Shared Together
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const mongoose = require('mongoose');
const config = require('../../config');
const { ONE_YEAR_MS } = require('../../utils/contextHelper');
const { getSocialGif } = require('../../utils/animeGifs');
const { incrementSocialCount } = require('../../models/SocialStats');
const { 
    ACTION_CONFIG, 
    getSocialNoun, 
    executeSocialAction, 
    sendSocialHelpMenu 
} = require('../../modules/socialActions');

let User;
try {
    User = require('../../models/User');
} catch (e) {
    User = mongoose.models.User;
}

// Anti-spam cooldown cache: userId -> timestamp
const userSocialCooldowns = new Map();
const COOLDOWN_MS = 3000;

function createSocialCommand(key, configData) {
    return {
        name: key,
        aliases: key === 'handshake' ? ['shake'] : [],
        category: 'Social',
        description: `${configData.verb.charAt(0).toUpperCase() + configData.verb.slice(1)} ${configData.requiresTarget ? 'a member' : 'an emotion'}`,
        usage: configData.requiresTarget ? `,${key} @user` : `,${key}`,
        async execute(ctx) {
            const author = ctx.user;
            const authorIdStr = String(author.id);

            // Anti-spam cooldown check (3 seconds)
            const now = Date.now();
            const lastUsed = userSocialCooldowns.get(authorIdStr) || 0;
            if (now - lastUsed < COOLDOWN_MS) {
                const remaining = ((COOLDOWN_MS - (now - lastUsed)) / 1000).toFixed(1);
                return ctx.reply(`⏳ Please wait **${remaining}s** before using another social action!`);
            }
            userSocialCooldowns.set(authorIdStr, now);

            let target = null;
            if (ctx.options?.getUser) {
                target = ctx.options.getUser('target');
            } else if (ctx.message?.reference?.messageId) {
                try {
                    const refMsg = await ctx.channel.messages.fetch(ctx.message.reference.messageId);
                    target = refMsg.author;
                } catch (e) {}
            } else if (ctx.message?.mentions?.users?.first()) {
                target = ctx.message.mentions.users.first();
            }

            if (configData.requiresTarget) {
                if (!target) {
                    return ctx.reply(`❌ Please mention someone or reply to their message to ${key} them!\n*Usage: \`,${key} @user\`*`);
                }

                if (String(target.id) === authorIdStr) {
                    return ctx.reply(`❌ You cannot ${key} yourself! Please mention someone else.`);
                }
            } else if (target && String(target.id) === authorIdStr) {
                target = null;
            }

            const targetIdStr = target ? String(target.id) : null;
            const totalCount = await incrementSocialCount(authorIdStr, targetIdStr, key);

            const gifUrl = await getSocialGif(key);
            const countWord = getSocialNoun(key, totalCount, configData);

            let desc = `**${author.username}** ${configData.verb}`;
            if (target) {
                if (configData.requiresTarget) {
                    desc += ` **${target.username}**!\n\n✨ That's **${totalCount}** ${countWord} shared together! ${configData.emoji}`;
                } else {
                    desc += ` with **${target.username}**!\n\n✨ That's **${totalCount}** ${countWord} shared together! ${configData.emoji}`;
                }
            } else {
                desc += `\n\n✨ Personal ${key} count: **${totalCount}** ${configData.emoji}`;
            }

            const embed = new EmbedBuilder()
                .setColor(configData.color || '#FF79C6')
                .setDescription(desc)
                .setImage(gifUrl)
                .setFooter({ text: `Social Actions Engine • Total: ${totalCount} • Prefix: ,` });

            const components = [];
            if (target && !target.bot) {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`social_${key}_back_${target.id}_${authorIdStr}`)
                        .setLabel(`${key.charAt(0).toUpperCase() + key.slice(1)} back`)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(configData.emoji)
                );
                components.push(row);
            }

            return ctx.reply({ embeds: [embed], components });
        }
    };
}

const commands = [
    // Social Menu Command
    {
        name: 'social',
        aliases: ['actions', 'anime'],
        category: 'Social',
        description: 'Interactive anime social actions hub or execute direct social action.',
        usage: ',social',
        async execute(ctx) {
            if (ctx.isSlash) {
                const sub = ctx.source?.options?.getSubcommand(false);
                if (sub && ACTION_CONFIG[sub]) {
                    return executeSocialAction(sub, ctx.source, true);
                }
            }
            return sendSocialHelpMenu(ctx);
        }
    }
];

// Generate all individual commands from unified ACTION_CONFIG
for (const [key, conf] of Object.entries(ACTION_CONFIG)) {
    commands.push(createSocialCommand(key, conf));
}

module.exports = commands;
