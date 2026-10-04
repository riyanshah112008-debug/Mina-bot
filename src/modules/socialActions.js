// ==========================================
// 🎭 Starry SOCIAL & ANIME ACTIONS MODULE
// File Path: src/modules/socialActions.js
// 1-Year Responsive Interaction • MongoDB Shared Count Tracking
// Direct Fast-CDN Animated Anime GIFs
// ==========================================
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder,
    MessageFlags 
} = require('discord.js');
const mongoose = require('mongoose');
const config = require('../config');
const { ONE_YEAR_MS } = require('../utils/contextHelper');
const { getSocialGif, ANIME_GIFS } = require('../utils/animeGifs');
const { incrementSocialCount, getSocialCount } = require('../models/SocialStats');

const EPHEMERAL_FLAG = MessageFlags ? MessageFlags.Ephemeral : 64;

// Cache of used reciprocation buttons to prevent duplicate clicks
const usedActionButtons = new Set();

// Anti-spam cooldown cache: userId -> timestamp
const userSocialCooldowns = new Map();
const COOLDOWN_MS = 3000; // 3 second cooldown

const ACTION_CONFIG = {
    // === Targeted Actions (with past tense for disabled reciprocation button) ===
    highfive: { verb: 'highfives', singular: 'highfive', plural: 'highfives', past: 'Highfived back', noun: 'highfives', emoji: '🙌', color: '#F1C40F', group: 'action', requiresTarget: true },
    hug:      { verb: 'hugs', singular: 'hug', plural: 'hugs', past: 'Hugged back', noun: 'hugs', emoji: '🤗', color: '#FF9494', group: 'action', requiresTarget: true },
    kiss:     { verb: 'kisses', singular: 'kiss', plural: 'kisses', past: 'Kissed back', noun: 'kisses', emoji: '💋', color: '#FFB6C1', group: 'action', requiresTarget: true },
    pat:      { verb: 'pats', singular: 'pat', plural: 'pats', past: 'Patted back', noun: 'pats', emoji: '⭐', color: '#A7C7E7', group: 'action', requiresTarget: true },
    slap:     { verb: 'slaps', singular: 'slap', plural: 'slaps', past: 'Slapped back', noun: 'slaps', emoji: '✋', color: '#E74C3C', group: 'action', requiresTarget: true },
    cuddle:   { verb: 'cuddles with', singular: 'cuddle', plural: 'cuddles', past: 'Cuddled back', noun: 'cuddles', emoji: '🥺', color: '#F39C12', group: 'action', requiresTarget: true },
    bite:     { verb: 'bites', singular: 'bite', plural: 'bites', past: 'Bit back', noun: 'bites', emoji: '🦷', color: '#9B59B6', group: 'action', requiresTarget: true },
    poke:     { verb: 'pokes', singular: 'poke', plural: 'pokes', past: 'Poked back', noun: 'pokes', emoji: '👉', color: '#3498DB', group: 'action', requiresTarget: true },
    punch:    { verb: 'punches', singular: 'punch', plural: 'punches', past: 'Punched back', noun: 'punches', emoji: '🥊', color: '#C0392B', group: 'action', requiresTarget: true },
    tickle:   { verb: 'tickles', singular: 'tickle', plural: 'tickles', past: 'Tickled back', noun: 'tickles', emoji: '🤏', color: '#1ABC9C', group: 'action', requiresTarget: true },
    feed:     { verb: 'feeds', singular: 'meal', plural: 'meals', past: 'Fed back', noun: 'meals', emoji: '🍱', color: '#2ECC71', group: 'action', requiresTarget: true },
    lick:     { verb: 'licks', singular: 'lick', plural: 'licks', past: 'Licked back', noun: 'licks', emoji: '👅', color: '#E91E63', group: 'action', requiresTarget: true },
    wave:     { verb: 'waves at', singular: 'wave', plural: 'waves', past: 'Waved back', noun: 'waves', emoji: '👋', color: '#34495E', group: 'action', requiresTarget: true },
    handhold: { verb: 'holds hands with', singular: 'handhold', plural: 'handholds', past: 'Held hands back', noun: 'handholds', emoji: '🤝', color: '#FFD700', group: 'action', requiresTarget: true },
    handshake:{ verb: 'shakes hands with', singular: 'handshake', plural: 'handshakes', past: 'Shook hands back', noun: 'handshakes', emoji: '🤝', color: '#3498DB', group: 'action', requiresTarget: true },
    bonk:     { verb: 'bonks', singular: 'bonk', plural: 'bonks', past: 'Bonked back', noun: 'bonks', emoji: '🔨', color: '#E67E22', group: 'action', requiresTarget: true },
    yeet:     { verb: 'yeets', singular: 'yeet', plural: 'yeets', past: 'Yeeted back', noun: 'yeets', emoji: '🚀', color: '#9B59B6', group: 'action', requiresTarget: true },
    boop:     { verb: 'boops', singular: 'boop', plural: 'boops', past: 'Booped back', noun: 'boops', emoji: '👉', color: '#1ABC9C', group: 'action', requiresTarget: true },
    kill:     { verb: 'dramatically slayed', singular: 'defeat', plural: 'defeats', past: 'Defeated back', noun: 'defeats', emoji: '⚔️', color: '#C0392B', group: 'action', requiresTarget: true },
    spank:    { verb: 'playfully spanks', singular: 'spank', plural: 'spanks', past: 'Spanked back', noun: 'spanks', emoji: '🍑', color: '#E91E63', group: 'action', requiresTarget: true },
    wink:     { verb: 'winks at', singular: 'wink', plural: 'winks', past: 'Winked back', noun: 'winks', emoji: '😉', color: '#F1C40F', group: 'action', requiresTarget: true },
    suck:     { verb: 'sucks on', singular: 'suck', plural: 'sucks', past: 'Sucked back', noun: 'sucks', emoji: '🍭', color: '#FF69B4', group: 'action', requiresTarget: true },
    pinch:    { verb: 'pinches', singular: 'pinch', plural: 'pinches', past: 'Pinched back', noun: 'pinches', emoji: '🤏', color: '#E67E22', group: 'action', requiresTarget: true },
    smack:    { verb: 'smacks', singular: 'smack', plural: 'smacks', past: 'Smacked back', noun: 'smacks', emoji: '💥', color: '#E74C3C', group: 'action', requiresTarget: true },
    nom:      { verb: 'noms on', singular: 'nom', plural: 'noms', past: 'Nommed back', noun: 'noms', emoji: '🍰', color: '#F39C12', group: 'action', requiresTarget: true },
    bully:    { verb: 'playfully bullies', singular: 'bully', plural: 'bullies', past: 'Bullied back', noun: 'bullies', emoji: '😈', color: '#9B59B6', group: 'action', requiresTarget: true },
    baka:     { verb: 'yells BAKA at', singular: 'baka', plural: 'bakas', past: 'Called baka back', noun: 'bakas', emoji: '💢', color: '#ED4245', group: 'action', requiresTarget: true },
    shoot:    { verb: 'shoots at', singular: 'shot', plural: 'shots', past: 'Shot back', noun: 'shots', emoji: '🔫', color: '#34495E', group: 'action', requiresTarget: true },

    // === Solo / Emotion Expressions ===
    sleep:    { verb: 'is sleeping zzz...', singular: 'nap', plural: 'naps', noun: 'naps', emoji: '😴', color: '#2C3E50', group: 'express', requiresTarget: false },
    wakeup:   { verb: 'just woke up!', singular: 'wakeup', plural: 'wakeups', noun: 'wakeups', emoji: '⏰', color: '#E67E22', group: 'express', requiresTarget: false },
    cry:      { verb: 'is crying...', singular: 'cry', plural: 'cries', noun: 'cries', emoji: '😭', color: '#3498DB', group: 'express', requiresTarget: false },
    laugh:    { verb: 'is laughing hysterically!', singular: 'laugh', plural: 'laughs', noun: 'laughs', emoji: '😆', color: '#F1C40F', group: 'express', requiresTarget: false },
    dance:    { verb: 'is dancing happily!', singular: 'dance', plural: 'dances', noun: 'dances', emoji: '💃', color: '#9B59B6', group: 'express', requiresTarget: false },
    blush:    { verb: 'is blushing deeply...', singular: 'blush', plural: 'blushes', noun: 'blushes', emoji: '😳', color: '#FFB6C1', group: 'express', requiresTarget: false },
    pout:     { verb: 'is pouting!', singular: 'pout', plural: 'pouts', noun: 'pouts', emoji: '😤', color: '#E74C3C', group: 'express', requiresTarget: false },
    smile:    { verb: 'smiles warmly!', singular: 'smile', plural: 'smiles', noun: 'smiles', emoji: '😊', color: '#2ECC71', group: 'express', requiresTarget: false },
    stare:    { verb: 'stares intently...', singular: 'stare', plural: 'stares', noun: 'stares', emoji: '👀', color: '#95A5A6', group: 'express', requiresTarget: false },
    cheer:    { verb: 'is cheering excitedly!', singular: 'cheer', plural: 'cheers', noun: 'cheers', emoji: '🎉', color: '#F39C12', group: 'express', requiresTarget: false },
    smug:     { verb: 'looks smugly at everyone 😏', singular: 'smug look', plural: 'smug looks', noun: 'smug looks', emoji: '😏', color: '#9B59B6', group: 'express', requiresTarget: false },
    sip:      { verb: 'sips tea peacefully 🍵', singular: 'sip', plural: 'sips', noun: 'sips', emoji: '🍵', color: '#27AE60', group: 'express', requiresTarget: false },
    shrug:    { verb: 'shrugs nonchalantly ¯\\_(ツ)_/¯', singular: 'shrug', plural: 'shrugs', noun: 'shrugs', emoji: '🤷', color: '#95A5A6', group: 'express', requiresTarget: false },
    bleh:     { verb: 'sticks their tongue out: Bleh! 😝', singular: 'bleh', plural: 'blehs', noun: 'blehs', emoji: '😝', color: '#F39C12', group: 'express', requiresTarget: false },
    clap:     { verb: 'is clapping enthusiastically! 👏', singular: 'applause', plural: 'applauses', noun: 'applauses', emoji: '👏', color: '#2ECC71', group: 'express', requiresTarget: false }
};

function getSocialNoun(actionKey, count, configData) {
    const conf = configData || ACTION_CONFIG[actionKey];
    if (!conf) return count === 1 ? actionKey : `${actionKey}s`;
    return count === 1 ? (conf.singular || actionKey) : (conf.plural || conf.noun || `${actionKey}s`);
}

const socialCommandBuilder = new SlashCommandBuilder()
    .setName('social')
    .setDescription('🎭 Perform anime social actions or express emotions!')
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1]);

socialCommandBuilder.addSubcommandGroup(group => {
    group.setName('action').setDescription('Targeted social actions with other members');
    Object.keys(ACTION_CONFIG).filter(k => ACTION_CONFIG[k].group === 'action').slice(0, 25).forEach(actionKey => {
        group.addSubcommand(sub => 
            sub.setName(actionKey)
               .setDescription(`${actionKey.charAt(0).toUpperCase() + actionKey.slice(1)} another user`)
               .addUserOption(opt => opt.setName('target').setDescription('Target member').setRequired(true))
        );
    });
    return group;
});

socialCommandBuilder.addSubcommandGroup(group => {
    group.setName('express').setDescription('Express individual feelings or emotions');
    Object.keys(ACTION_CONFIG).filter(k => ACTION_CONFIG[k].group === 'express').slice(0, 25).forEach(actionKey => {
        group.addSubcommand(sub => 
            sub.setName(actionKey)
               .setDescription(`Express ${actionKey}`)
        );
    });
    return group;
});

async function executeSocialAction(actionKey, context, isSlash) {
    const configData = ACTION_CONFIG[actionKey];
    if (!configData) return;

    const authorUser = isSlash ? context.user : context.author;
    const authorIdStr = String(authorUser.id);
    const authorName = authorUser.username;

    // Anti-spam cooldown check (3 seconds)
    const now = Date.now();
    const lastUsed = userSocialCooldowns.get(authorIdStr) || 0;
    if (now - lastUsed < COOLDOWN_MS) {
        const remaining = ((COOLDOWN_MS - (now - lastUsed)) / 1000).toFixed(1);
        const coolMsg = `⏳ Please wait **${remaining}s** before using another social action!`;
        return isSlash 
            ? context.reply({ content: coolMsg, flags: [EPHEMERAL_FLAG] }) 
            : context.reply(coolMsg);
    }
    userSocialCooldowns.set(authorIdStr, now);

    let target = null;

    if (configData.requiresTarget) {
        if (isSlash) {
            target = context.options?.getUser ? context.options.getUser('target') : null;
        } else {
            if (context.reference && context.reference.messageId) {
                try {
                    const refMsg = await context.channel.messages.fetch(context.reference.messageId);
                    target = refMsg.author;
                } catch (err) {}
            } else if (context.mentions && context.mentions.users && context.mentions.users.size > 0) {
                target = context.mentions.users.first();
            }
        }

        if (!target) {
            const reqMsg = `❌ Please mention a user or reply to a message to ${actionKey} them!\n*Example: \`,${actionKey} @user\`*`;
            return isSlash 
                ? context.reply({ content: reqMsg, flags: [EPHEMERAL_FLAG] }) 
                : context.reply(reqMsg);
        }

        if (String(target.id) === authorIdStr) {
            const errReply = `❌ You can't ${actionKey} yourself! Mention someone else.`;
            return isSlash 
                ? context.reply({ content: errReply, flags: [EPHEMERAL_FLAG] }) 
                : context.reply(errReply);
        }
    }

    const randomGif = await getSocialGif(actionKey);

    // Save and increment count in MongoDB database
    const targetIdStr = target ? String(target.id) : null;
    const totalCount = await incrementSocialCount(authorIdStr, targetIdStr, actionKey);

    const countWord = getSocialNoun(actionKey, totalCount, configData);

    let descriptionText = `**${authorName}** ${configData.verb}`;
    if (target) {
        descriptionText += ` **${target.username}**!\n\n✨ That's **${totalCount}** ${countWord} shared together! ${configData.emoji}`;
    } else {
        descriptionText += `\n\n✨ Personal ${actionKey} count: **${totalCount}** ${configData.emoji}`;
    }

    const embed = new EmbedBuilder()
        .setColor(configData.color)
        .setDescription(descriptionText)
        .setImage(randomGif)
        .setFooter({ text: `Social Actions Engine • Total: ${totalCount} • Prefix: ,` });

    // Attach single reciprocation button for target
    const components = [];
    if (target && !target.bot) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`social_${actionKey}_back_${target.id}_${authorIdStr}`)
                .setLabel(`${actionKey.charAt(0).toUpperCase() + actionKey.slice(1)} back`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(configData.emoji)
        );
        components.push(row);
    }

    if (isSlash && (context.deferred || context.replied)) {
        await context.editReply({ embeds: [embed], components }).catch(() => {});
    } else {
        await context.reply({ embeds: [embed], components }).catch(() => {});
    }
}

async function sendSocialHelpMenu(context) {
    const prefix = config.DEFAULT_PREFIX || ',';
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('social_select_action')
        .setPlaceholder('🎭 Select a social action to view preview & details...')
        .addOptions([
            { label: 'Highfive', description: 'Highfive a friend 🙌', value: 'highfive', emoji: '🙌' },
            { label: 'Hug', description: 'Give someone a warm hug 🤗', value: 'hug', emoji: '🤗' },
            { label: 'Kiss', description: 'Blow a sweet kiss 💋', value: 'kiss', emoji: '💋' },
            { label: 'Pat', description: 'Gently pat someone on the head ⭐', value: 'pat', emoji: '⭐' },
            { label: 'Slap', description: 'Slap someone ✋', value: 'slap', emoji: '✋' },
            { label: 'Cuddle', description: 'Snuggle up and cuddle 🥺', value: 'cuddle', emoji: '🥺' },
            { label: 'Handhold', description: 'Hold hands 🤝', value: 'handhold', emoji: '🤝' },
            { label: 'Handshake', description: 'Shake hands with someone 🤝', value: 'handshake', emoji: '🤝' },
            { label: 'Bonk', description: 'Bonk on the head 🔨', value: 'bonk', emoji: '🔨' },
            { label: 'Bite', description: 'Playfully bite 🦷', value: 'bite', emoji: '🦷' },
            { label: 'Poke', description: 'Poke someone 👉', value: 'poke', emoji: '👉' },
            { label: 'Punch', description: 'Playful punch 🥊', value: 'punch', emoji: '🥊' },
            { label: 'Dance', description: 'Dance happily 💃', value: 'dance', emoji: '💃' },
            { label: 'Cry', description: 'Cry your heart out 😭', value: 'cry', emoji: '😭' },
            { label: 'Blush', description: 'Blush deeply 😳', value: 'blush', emoji: '😳' },
            { label: 'Smile', description: 'Smile warmly 😊', value: 'smile', emoji: '😊' },
            { label: 'Sleep', description: 'Sleep zzz... 😴', value: 'sleep', emoji: '😴' }
        ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
        .setColor('#FF79C6')
        .setTitle('🎭 Starry Anime Social Actions')
        .setDescription(`Express feelings or interact with friends using animated anime GIFs!\nAll shared actions (hugs, kisses, pats, highfives) are saved and tracked in the database!\n\n**Direct Command Examples:**\n• \`${prefix}highfive @user\` — Highfive someone\n• \`${prefix}hug @user\` — Hug a friend\n• \`${prefix}kiss @user\` — Kiss someone\n• \`${prefix}slap @user\` — Slap someone\n• \`${prefix}pat @user\` — Pat someone\n• \`${prefix}dance\` — Dance solo\n\n*Select an action from the dropdown menu to preview:*`)
        .setFooter({ text: 'Starry Social Suite • Prefix: ,' })
        .setTimestamp();

    const replyMsg = await context.reply({ embeds: [embed], components: [row] });
    
    if (replyMsg && typeof replyMsg.createMessageComponentCollector === 'function') {
        const collector = replyMsg.createMessageComponentCollector({ time: ONE_YEAR_MS });
        collector.on('collect', async (i) => {
            if (i.customId === 'social_select_action') {
                const selectedAction = i.values[0];
                const conf = ACTION_CONFIG[selectedAction];
                if (conf) {
                    const sampleGif = await getSocialGif(selectedAction);
                    const previewEmbed = new EmbedBuilder()
                        .setColor(conf.color)
                        .setTitle(`${conf.emoji} Action Preview: ${selectedAction.toUpperCase()}`)
                        .setDescription(`**Usage:** \`${prefix}${selectedAction} ${conf.requiresTarget ? '@user' : ''}\`\n**Verb:** \`${conf.verb}\`\n**Action Type:** ${conf.group === 'action' ? '👥 Targeted Member Action' : '🎭 Solo Expression'}\n\n*Shared interactions are counted and stored in MongoDB!*`)
                        .setImage(sampleGif)
                        .setFooter({ text: `Prefix: ${prefix} • Starry Social Engine` });
                    await i.reply({ embeds: [previewEmbed], flags: [EPHEMERAL_FLAG] });
                }
            }
        });
    }
}

// Global Single-Source Handler for Social "Action Back" Buttons
// Strictly enforces 1 hug -> 1 hug back (no infinite loop, one-time button use)
async function handleSocialBackButton(interaction) {
    if (!interaction.isButton()) return;
    const customId = interaction.customId;
    if (!customId.startsWith('social_') || !customId.includes('_back_')) return;

    const parts = customId.split('_');
    if (parts.length < 5 || parts[2] !== 'back') return;

    const actionKey = parts[1];
    const allowedTargetId = parts[3];
    const originalAuthorId = parts[4];

    // Only the targeted member may reciprocate
    if (interaction.user.id !== allowedTargetId) {
        return interaction.reply({
            content: `❌ Only <@${allowedTargetId}> can use this button to action back!`,
            flags: [EPHEMERAL_FLAG]
        }).catch(() => {});
    }

    const configData = ACTION_CONFIG[actionKey] || { 
        verb: `${actionKey}s`, 
        singular: actionKey, 
        plural: `${actionKey}s`, 
        past: `${actionKey}ed back`,
        emoji: '✨', 
        color: '#FF9494' 
    };

    // Check if this specific message's button was already used (prevent multiple clicks)
    const messageId = interaction.message?.id;
    const buttonKey = `${messageId || ''}_${actionKey}`;
    if (messageId && usedActionButtons.has(buttonKey)) {
        const pastText = configData.past ? configData.past.toLowerCase() : `${actionKey}ed back`;
        return interaction.reply({
            content: `❌ You have already ${pastText}!`,
            flags: [EPHEMERAL_FLAG]
        }).catch(() => {});
    }

    if (messageId) {
        usedActionButtons.add(buttonKey);
        if (usedActionButtons.size > 2000) {
            usedActionButtons.clear();
        }
    }

    // Immediately disable the button on the original message so it cannot be clicked again
    if (interaction.message) {
        const disabledLabel = configData.past || `${actionKey.charAt(0).toUpperCase() + actionKey.slice(1)}ed back`;
        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`social_${actionKey}_used_${interaction.message.id}`)
                .setLabel(disabledLabel)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(configData.emoji)
                .setDisabled(true)
        );
        await interaction.message.edit({ components: [disabledRow] }).catch(() => {});
    }

    await interaction.deferReply().catch(() => {});

    // Increment count ONCE in MongoDB
    const totalCount = await incrementSocialCount(interaction.user.id, originalAuthorId, actionKey);

    const countWord = getSocialNoun(actionKey, totalCount, configData);
    const backGif = await getSocialGif(actionKey);

    const backEmbed = new EmbedBuilder()
        .setColor(configData.color || '#FF79C6')
        .setDescription(`**${interaction.user.username}** ${configData.verb} **<@${originalAuthorId}>** back!\n\n✨ That's **${totalCount}** ${countWord} shared together! ${configData.emoji}`)
        .setImage(backGif)
        .setFooter({ text: `Social Actions Engine • Total: ${totalCount} • Prefix: ,` })
        .setTimestamp();

    // Do NOT attach another button on the reply (keeps strictly: 1 action + 1 action back, no infinite loop!)
    return interaction.editReply({ embeds: [backEmbed], components: [] }).catch(async () => {
        return interaction.followUp({ embeds: [backEmbed], components: [] }).catch(() => {});
    });
}

// Global Single-Source Handler for Social Select Menu
async function handleSocialSelectMenu(interaction) {
    if (!interaction.isStringSelectMenu() || interaction.customId !== 'social_select_action') return;
    const selectedAction = interaction.values[0];
    const conf = ACTION_CONFIG[selectedAction];
    if (!conf) return;

    const prefix = config.DEFAULT_PREFIX || ',';
    const sampleGif = await getSocialGif(selectedAction);
    const previewEmbed = new EmbedBuilder()
        .setColor(conf.color)
        .setTitle(`${conf.emoji} Action Preview: ${selectedAction.toUpperCase()}`)
        .setDescription(`**Usage:** \`${prefix}${selectedAction} ${conf.requiresTarget ? '@user' : ''}\`\n**Verb:** \`${conf.verb}\`\n**Action Type:** ${conf.group === 'action' ? '👥 Targeted Member Action' : '🎭 Solo Expression'}\n\n*Shared interactions are counted and stored in MongoDB!*`)
        .setImage(sampleGif)
        .setFooter({ text: `Prefix: ${prefix} • Starry Social Engine` });

    return interaction.reply({ embeds: [previewEmbed], flags: [EPHEMERAL_FLAG] }).catch(async () => {
        return interaction.followUp({ embeds: [previewEmbed], flags: [EPHEMERAL_FLAG] }).catch(() => {});
    });
}

const socialModule = (client) => {
    // Engine initialized - all interactions routed centrally through commandHandler
};

socialModule.data = socialCommandBuilder;
socialModule.execute = async (interaction) => {
    const group = interaction.options?.getSubcommandGroup ? interaction.options.getSubcommandGroup(false) : null;
    const subCommand = interaction.options?.getSubcommand ? interaction.options.getSubcommand(false) : null;
    const targetAction = subCommand || group;
    if (targetAction && ACTION_CONFIG[targetAction]) {
        await executeSocialAction(targetAction, interaction, true);
    } else {
        await sendSocialHelpMenu(interaction);
    }
};
socialModule.executeSocialAction = executeSocialAction;
socialModule.sendSocialHelpMenu = sendSocialHelpMenu;
socialModule.handleSocialBackButton = handleSocialBackButton;
socialModule.handleSocialSelectMenu = handleSocialSelectMenu;
socialModule.getSocialNoun = getSocialNoun;
socialModule.ACTION_CONFIG = ACTION_CONFIG;
socialModule.socialCommandPayload = socialCommandBuilder.toJSON();

module.exports = socialModule;
