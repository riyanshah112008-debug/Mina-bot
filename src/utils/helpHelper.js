// ==========================================
// 🌸 MINA EXECUTIVE HELP & DISPATCH HUB
// File Path: src/utils/helpHelper.js
// Professional Command Directory, Select Menus, & Visual Embeds
// ==========================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');

const BASE_HELP_CATEGORIES = [
    { id: 'music', label: 'Music & Hi-Fi Audio (37)', desc: 'Playback, Autoplay, Spotify, DSP filters & 24/7 Voice', emoji: '🎵' },
    { id: 'mod', label: 'Moderation & Security (45+)', desc: 'AutoMod shield, bans, mutes, lockdowns & audit logs', emoji: '🛡️' },
    { id: 'booster', label: 'Vanity & Custom Colors (10)', desc: 'Optical hex blends, zero-boost roles & booster perks', emoji: '🎨' },
    { id: 'util', label: 'Utility & Server Tools (50+)', desc: 'AI assistant, reminders, poll, weather, math & info', emoji: '⚙️' },
    { id: 'social', label: 'Anime Socials & Actions (44)', desc: 'Hugs, kisses, anime GIFs & shared interaction counters', emoji: '🌸' },
    { id: 'eco', label: 'Economy & Leveling (32)', desc: 'XP ranks, leaderboards, wallet, daily, work & shop', emoji: '💎' },
    { id: 'game', label: 'Arcade & Community Games (12)', desc: 'Boss raids, blackjack, trivia, coinflip & wordle', emoji: '🎮' },
    { id: 'sys', label: 'Systems & Administration (26)', desc: 'Welcome/goodbye cards, reaction roles, tickets & logs', emoji: '🤖' }
];

const NSFW_CATEGORY_INFO = {
    id: 'nsfw',
    label: 'Mature & Anime NSFW (21)',
    desc: 'Anime waifus, ecchi art galleries & mature interactions',
    emoji: '🔞'
};

function getHelpCategories(isNsfw = false) {
    if (isNsfw) {
        return [...BASE_HELP_CATEGORIES, NSFW_CATEGORY_INFO];
    }
    return BASE_HELP_CATEGORIES;
}

function buildCategoryEmbed(catId, customPrefix, isNsfw = false) {
    const prefix = customPrefix || config.DEFAULT_PREFIX || ',';
    const embed = new EmbedBuilder()
        .setColor(config.EMBED_COLORS.PRIMARY)
        .setAuthor({ name: 'Mina • Intelligent Discord Suite', iconURL: 'https://cdn.discordapp.com/emojis/1090333200787382342.webp' })
        .setFooter({ text: `Mina System • Slash Commands (/) • Server Prefix: ${prefix}` })
        .setTimestamp();

    if (catId === 'music') {
        embed.setColor(config.EMBED_COLORS.MUSIC || '#1DB954')
            .setTitle('🎵 Music & Hi-Fi Audio Suite')
            .setDescription(
                `>>> Studio-grade lossless audio streaming powered by Lavalink v4 cluster with Spotify & YouTube integration.\n\n` +
                `**🎛️ Playback & Queue Controls:**\n` +
                `\`${prefix}play <song>\` • \`${prefix}search <query>\` • \`${prefix}pause\` • \`${prefix}resume\` • \`${prefix}skip\` • \`${prefix}stop\` • \`${prefix}queue\` • \`${prefix}nowplaying\` • \`${prefix}volume <1-100>\` • \`${prefix}loop\` • \`${prefix}shuffle\` • \`${prefix}seek <time>\` • \`${prefix}replay\` • \`${prefix}clear\` • \`${prefix}join\` • \`${prefix}247\`\n\n` +
                `**📻 Autoplay & Smart Recommendations:**\n` +
                `• \`${prefix}autoplay\` (or \`${prefix}ap\`) — Automatic continuous stream based on Spotify & YouTube algorithms\n` +
                `• \`${prefix}spotify\` (or \`${prefix}sp\`) — Connect your Spotify account & stream saved playlists with 1 click\n` +
                `• \`${prefix}setup\` — Create the dedicated interactive Music Controller desk\n` +
                `• \`${prefix}djpanel\` — Open real-time DJ control panel with filter toggles\n\n` +
                `**🎚️ Lossless DSP Filters (15 Presets):**\n` +
                `\`${prefix}bass\` *(Physical Subwoofer)* • \`${prefix}8d\` • \`${prefix}nightcore\` • \`${prefix}daycore\` • \`${prefix}vaporwave\` • \`${prefix}lofi\` • \`${prefix}karaoke\` • \`${prefix}clearfilters\``
            );
    } else if (catId === 'mod') {
        embed.setColor(config.EMBED_COLORS.DANGER || '#ED4245')
            .setTitle('🛡️ Moderation & Enterprise Security')
            .setDescription(
                `>>> Advanced moderation suite with role hierarchy verification, audit logs, and proactive anti-raid defenses.\n\n` +
                `**🤖 Channel AutoMod Shield:**\n` +
                `• \`${prefix}automod\` — Interactive control dashboard to toggle link, invite & emoji spam protection\n` +
                `• \`${prefix}antilink\` — Instant channel link protection\n` +
                `• \`${prefix}antiemoji\` — Excessive emoji spam prevention\n` +
                `• \`${prefix}ignore\` / \`${prefix}unignore\` — Channel automod bypass management\n\n` +
                `**⚖️ Sanctions & Enforcement:**\n` +
                `\`${prefix}ban <@user> [reason]\` • \`${prefix}unban <id>\` • \`${prefix}kick <@user>\` • \`${prefix}timeout <@user> <time>\` • \`${prefix}untimeout <@user>\` • \`${prefix}warn <@user>\` • \`${prefix}warnings <@user>\` • \`${prefix}clearwarns <@user>\` • \`${prefix}delwarn <caseId>\`\n\n` +
                `**🚨 Emergency Raid Lockdown & Recovery:**\n` +
                `• \`${prefix}emergency-lockdown\` — Instant zero-delay freeze on all text channels\n` +
                `• \`${prefix}emergency-nuke\` — Fast quarantine, clone, and cleanse compromised channels\n` +
                `• \`${prefix}emergency-secure\` — Multi-threat anti-raid lockdown\n\n` +
                `**🧹 Channel & Member Management:**\n` +
                `\`${prefix}purge <amount>\` • \`${prefix}slowmode <seconds>\` • \`${prefix}lock\` • \`${prefix}unlock\` • \`${prefix}nuke\` • \`${prefix}role <@user> <@role>\` • \`${prefix}autorole\``
            );
    } else if (catId === 'booster') {
        embed.setColor('#FF73FA')
            .setTitle('🎨 Vanity Studio & Optical Name Colors')
            .setDescription(
                `>>> Zero-boost optical color blending and VIP server booster customization suites.\n\n` +
                `**🌈 Zero-Boost Name Colors (No Boosts Needed!):**\n` +
                `• \`${prefix}color blend <#Hex1> <#Hex2> [ratio%]\` — Blend two hex colors optically with WCAG contrast guarantee\n` +
                `• \`${prefix}color presets\` — 26 hand-crafted aesthetic blend palettes (Cyberpunk, Sunset, Sakura)\n` +
                `• \`${prefix}color <#HexCode>\` — Apply a solid vibrant hex color\n` +
                `• \`${prefix}color random\` — Generate and equip a random vibrant color blend\n` +
                `• \`${prefix}color info\` • \`${prefix}color remove\` — View active custom role or reset to default\n\n` +
                `**💎 Server Booster Perks & Shared Roles:**\n` +
                `• \`${prefix}boosterrole\` (or \`${prefix}br\`) — Create and customize your personal booster role (Color, Icon, Name)\n` +
                `• \`${prefix}boostperks\` — Inspect your active boosting tier and shared role slots\n` +
                `• \`${prefix}boost-setup\` — Configure booster announcements and VIP welcome cards`
            );
    } else if (catId === 'util') {
        embed.setColor(config.EMBED_COLORS.PRIMARY || '#5865F2')
            .setTitle('⚙️ General Utility & AI Innovations')
            .setDescription(
                `>>> High-speed utility, artificial intelligence tools, and server diagnostics.\n\n` +
                `**✨ Artificial Intelligence:**\n` +
                `• \`${prefix}ai <prompt>\` — Conversational AI with multi-turn intelligence & vision support\n` +
                `• \`${prefix}vision <attachment>\` — Multimodal visual analysis of images, charts, and error logs\n` +
                `• \`${prefix}image <prompt>\` — Generate AI artwork and creative visual concepts\n` +
                `• \`${prefix}spark\` (or \`${prefix}revive\`) — AI-driven conversation starter for quiet channels\n\n` +
                `**📊 Server & User Intelligence:**\n` +
                `\`${prefix}ping\` • \`${prefix}botinfo\` • \`${prefix}serverinfo\` • \`${prefix}userinfo\` • \`${prefix}avatar [@user]\` • \`${prefix}banner [@user]\` • \`${prefix}membercount\` • \`${prefix}emojis\` • \`${prefix}roles\`\n\n` +
                `**🛠️ Productivity & Server Tools:**\n` +
                `\`${prefix}afk [status]\` • \`${prefix}poll <question>\` • \`${prefix}remind <time> <task>\` • \`${prefix}steal <emojis>\` • \`${prefix}translate <lang> <text>\` • \`${prefix}calculator <expr>\` • \`${prefix}snipe\` • \`${prefix}editsnipe\` • \`${prefix}sticky\``
            );
    } else if (catId === 'social') {
        embed.setColor(config.EMBED_COLORS.SOCIAL || '#FF79C6')
            .setTitle('🌸 Anime Social Actions & Expressions')
            .setDescription(
                `>>> Express emotions or share anime interactions with friends. All shared actions track cumulative counters!\n\n` +
                `**👥 Targeted Interactions (With GIF & Reciprocation Button):**\n` +
                `\`${prefix}hug @user\` • \`${prefix}kiss @user\` • \`${prefix}pat @user\` • \`${prefix}slap @user\` • \`${prefix}cuddle @user\` • \`${prefix}bite @user\` • \`${prefix}poke @user\` • \`${prefix}feed @user\` • \`${prefix}highfive @user\` • \`${prefix}handhold @user\` • \`${prefix}bonk @user\` • \`${prefix}yeet @user\`\n\n` +
                `**🎭 Solo Expressions & Reactions:**\n` +
                `\`${prefix}dance\` • \`${prefix}cry\` • \`${prefix}laugh\` • \`${prefix}blush\` • \`${prefix}smile\` • \`${prefix}cheer\` • \`${prefix}sleep\` • \`${prefix}sip\` • \`${prefix}smug\` • \`${prefix}shrug\` • \`${prefix}bleh\`\n\n` +
                `*Tip: You can reply directly to any message and type \`${prefix}hug\` to interact!*`
            );
    } else if (catId === 'eco') {
        embed.setColor(config.EMBED_COLORS.ECONOMY || '#F39C12')
            .setTitle('💎 Economy, Wealth & Leveling Suite')
            .setDescription(
                `>>> Complete server engagement economy with XP progression, cash balances, and prestige.\n\n` +
                `**📈 Server Leveling System:**\n` +
                `• \`${prefix}rank [@user]\` — View your current level, total XP, and progress bar\n` +
                `• \`${prefix}leaderboard\` (or \`${prefix}lb\`) — View top server members by XP, messages, or voice\n` +
                `• \`${prefix}leveling\` — Open the server-wide leveling configuration dashboard\n` +
                `• \`${prefix}leveling toggle\` — Enable or disable XP accumulation\n\n` +
                `**💰 Economy & Career:**\n` +
                `\`${prefix}balance\` • \`${prefix}daily\` • \`${prefix}work\` • \`${prefix}pay <@user> <amount>\` • \`${prefix}profile\` • \`${prefix}inventory\` • \`${prefix}shop\` • \`${prefix}buy <item>\` • \`${prefix}marry <@user>\` • \`${prefix}divorce\` • \`${prefix}ship <@user1> [@user2]\``
            );
    } else if (catId === 'game') {
        embed.setColor('#9B59B6')
            .setTitle('🎮 Arcade & Community Games')
            .setDescription(
                `>>> Interactive multiplayer games, casino duels, and cooperative world boss raids.\n\n` +
                `**⚔️ Cooperative World Boss Raids:**\n` +
                `• \`${prefix}raid\` — Summon or join active server boss battles with real-time damage counters and loot\n\n` +
                `**🎲 Arcade & Card Games:**\n` +
                `• \`${prefix}blackjack\` (or \`${prefix}bj\`) — Casino 21 with Hit, Stand, and Double Down\n` +
                `• \`${prefix}trivia\` — Interactive timed 4-option trivia quiz\n` +
                `• \`${prefix}rps <choice>\` — Rock-Paper-Scissors with member challenge buttons\n` +
                `• \`${prefix}coinflip\` • \`${prefix}dice\` • \`${prefix}8ball <question>\``
            );
    } else if (catId === 'sys') {
        embed.setColor('#3498DB')
            .setTitle('🤖 Systems & Server Architecture')
            .setDescription(
                `>>> Automated server infrastructure, onboarding, support portals, and visual customization.\n\n` +
                `**🌟 Onboarding & Design:**\n` +
                `• \`${prefix}setupwelcome <#channel>\` — Automated image welcome cards\n` +
                `• \`${prefix}setupgoodbye <#channel>\` — Automated departure announcements\n` +
                `• \`${prefix}customize\` — Visuality studio for welcome, goodbye & server embed theme\n` +
                `• \`${prefix}autorole\` — Multi-role assignment on member join\n\n` +
                `**🎫 Support Tickets & Verification:**\n` +
                `• \`${prefix}ticketsetup\` — Deploy the interactive support ticket panel\n` +
                `• \`${prefix}ticket close/claim/add/transcript\` — Manage open ticket channels\n` +
                `• \`${prefix}verifysetup\` — Deploy human verification panel (Button / Captcha)\n` +
                `• \`${prefix}videoverifysetup\` — VC-based video verification desk\n` +
                `• \`${prefix}applysetup\` — Deploy staff & partnership application panel`
            );
    } else if (catId === 'nsfw') {
        if (!isNsfw) {
            embed.setColor('#ED4245')
                .setTitle('🔒 Age-Restricted Content')
                .setDescription(
                    `>>> The Mature module requires an **Age-Restricted (NSFW)** channel.\n\n` +
                    `To view these commands, enable Age-Restricted in Discord channel settings.`
                );
            return embed;
        }

        embed.setColor('#FF1493')
            .setTitle('🔞 Mature & Anime NSFW Commands')
            .setDescription(
                `>>> Age-restricted anime waifu art and mature interactions.\n\n` +
                `\`${prefix}waifu\` • \`${prefix}neko\` • \`${prefix}ecchi\` • \`${prefix}hentai\` • \`${prefix}nsfwkiss\` • \`${prefix}nsfwhug\``
            );
    } else {
        const totalCount = isNsfw ? '270+' : '250+';
        embed.setTitle('🌸 Mina • Executive Command Center')
            .setDescription(
                `>>> Welcome to **Mina**, a high-performance Discord engine engineered for enterprise server moderation, studio-grade Hi-Fi music streaming, engaging anime socials, leveling systems, and community intelligence.\n\n` +
                `**⚡ Interface & Execution:**\n` +
                `• **Slash Commands:** \`/command\` *(Full autocomplete support)*\n` +
                `• **Prefix Commands:** \`${prefix}command\` *(Dual prefix \`,\` and \`.\` active)*\n` +
                `• **Interaction Engine:** Long-lived 1-Year interactive components\n\n` +
                `**📊 System Health & Telemetry:**\n` +
                `• **Cluster Status:** 🟢 All Systems Operational\n` +
                `• **Available Commands:** \`${totalCount}\` across ${isNsfw ? '9' : '8'} specialized modules\n\n` +
                `*Select a category from the dropdown menu below or click a quick-action button:*`
            )
            .addFields(
                { name: '🎵 Music (37)', value: `\`${prefix}play\`, \`${prefix}autoplay\`, \`${prefix}djpanel\``, inline: true },
                { name: '🛡️ Moderation (45+)', value: `\`${prefix}ban\`, \`${prefix}automod\`, \`${prefix}purge\``, inline: true },
                { name: '🎨 Vanity & Colors (10)', value: `\`${prefix}color\`, \`${prefix}boosterrole\`, \`${prefix}customize\``, inline: true },
                { name: '⚙️ Utility & AI (50+)', value: `\`${prefix}ai\`, \`${prefix}ping\`, \`${prefix}remind\``, inline: true },
                { name: '🌸 Socials (44)', value: `\`${prefix}hug\`, \`${prefix}kiss\`, \`${prefix}pat\``, inline: true },
                { name: '💎 Economy & Leveling (32)', value: `\`${prefix}rank\`, \`${prefix}leveling\`, \`${prefix}leaderboard\``, inline: true },
                { name: '🎮 Arcade (12)', value: `\`${prefix}raid\`, \`${prefix}blackjack\`, \`${prefix}trivia\``, inline: true },
                { name: '🤖 Systems (26)', value: `\`${prefix}setupwelcome\`, \`${prefix}ticketsetup\`, \`${prefix}rr\``, inline: true }
            );

        if (isNsfw) {
            embed.addFields({ name: '🔞 Mature & Anime (21)', value: `\`${prefix}waifu\`, \`${prefix}nsfwkiss\``, inline: true });
        }
    }

    return embed;
}

function createHelpComponents(isNsfw = false) {
    const categories = getHelpCategories(isNsfw);

    const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder('📂 Browse specialized command modules...')
            .addOptions([
                { label: 'Overview / Home Dashboard', description: 'Main command center and system statistics', value: 'home', emoji: '🌸' },
                ...categories.map(c => ({ label: c.label, description: c.desc, value: c.id, emoji: c.emoji }))
            ])
    );

    const buttons = [
        new ButtonBuilder().setCustomId('help_btn_music').setLabel('Music').setEmoji('🎵').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('help_btn_mod').setLabel('Moderation').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('help_btn_eco').setLabel('Leveling & Eco').setEmoji('💎').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('help_btn_util').setLabel('Utility').setEmoji('⚙️').setStyle(ButtonStyle.Secondary)
    ];

    if (isNsfw) {
        buttons.push(new ButtonBuilder().setCustomId('help_btn_nsfw').setLabel('Mature').setEmoji('🔞').setStyle(ButtonStyle.Danger));
    } else {
        buttons.push(new ButtonBuilder().setCustomId('help_btn_social').setLabel('Socials').setEmoji('🌸').setStyle(ButtonStyle.Secondary));
    }

    const buttonsRow = new ActionRowBuilder().addComponents(buttons);

    return [selectMenu, buttonsRow];
}

module.exports = {
    helpCategories: BASE_HELP_CATEGORIES,
    getHelpCategories,
    buildCategoryEmbed,
    createHelpComponents
};
