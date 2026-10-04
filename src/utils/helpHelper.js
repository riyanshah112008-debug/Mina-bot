const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');

const BASE_HELP_CATEGORIES = [
    { id: 'music', label: 'Music & Hi-Fi Audio (37)', desc: 'Playback, Autoplay, Spotify, DSP filters, 24/7 & controller', emoji: '🎵' },
    { id: 'mod', label: 'Moderation & AutoMod (45+)', desc: 'AutoMod for emojis & links, bans, mutes, lockdowns & nukes', emoji: '🛡️' },
    { id: 'booster', label: 'Booster Studio & Shared Roles (4)', desc: 'Custom roles, shared booster perks & administration', emoji: '🚀' },
    { id: 'util', label: 'Utility & AI Innovations (50+)', desc: 'Spark AI, Astral Portal, Pulse, Code Studio & Gazette', emoji: '🛠️' },
    { id: 'social', label: 'Social & Expressions (44)', desc: 'Hug, kiss, slap, anime GIFs, interactions & counters', emoji: '🎭' },
    { id: 'eco', label: 'Economy & RPG Adventure (32)', desc: 'Passport, beg, scavenge, heists, crates, shop & mining', emoji: '💰' },
    { id: 'game', label: 'Cosmic Arcade & Boss Raids (12)', desc: 'Co-op World Boss Raids, Blackjack, Mines & Wordle', emoji: '🎮' },
    { id: 'sys', label: 'Multi-Bot & Systems (26)', desc: 'Multi-bot cluster, treasure chests, giveaways & tickets', emoji: '🤖' }
];

const NSFW_CATEGORY_INFO = {
    id: 'nsfw',
    label: 'Mature & Anime NSFW (21)',
    desc: 'Anime waifus, nekos, ecchi art & mature social actions',
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
        .setFooter({ text: `Starry Master Bot • Slash Commands (/) • Prefix (${prefix}) Owner-Only` })
        .setTimestamp();

    if (catId === 'music') {
        embed.setTitle('🎵 Music & Hi-Fi Audio Suite (45 Commands)')
            .setDescription(
                `**Playback & Controls:**\n` +
                `\`${prefix}play\`, \`${prefix}pause\`, \`${prefix}resume\`, \`${prefix}skip\`, \`${prefix}stop\`, \`${prefix}queue\`, \`${prefix}nowplaying\`, \`${prefix}volume\`, \`${prefix}loop\`, \`${prefix}shuffle\`, \`${prefix}seek\`, \`${prefix}replay\`, \`${prefix}previous\`, \`${prefix}jump\`, \`${prefix}move\`, \`${prefix}clear\`, \`${prefix}remove\`, \`${prefix}speed\`, \`${prefix}join\`, \`${prefix}247\`\n\n` +
                `**📻 Smart Autoplay & Spotify Integration:**\n` +
                `• \`${prefix}autoplay\` (or \`${prefix}ap\`) — Seamless continuous playback using Spotify & YouTube recommendation engine\n` +
                `• \`${prefix}spotify\` (or \`${prefix}sp\`) — Link personal Spotify account, save custom playlists & 1-click voice stream\n` +
                `• \`${prefix}setup\` — Deploy the dedicated interactive Music Controller request channel\n` +
                `• \`${prefix}callstarry\` — Summon a free multi-bot worker to your voice channel\n\n` +
                `**🎛️ Studio DSP Audio Filters (15 Presets):**\n` +
                `\`${prefix}bass\` *(True Subwoofer Physical Vibration)*, \`${prefix}8d\`, \`${prefix}nightcore\`, \`${prefix}daycore\`, \`${prefix}vaporwave\`, \`${prefix}lofi\`, \`${prefix}reverb\`, \`${prefix}karaoke\`, \`${prefix}surround\`, \`${prefix}electronic\`, \`${prefix}soft\`, \`${prefix}radio\`, \`${prefix}treble\`, \`${prefix}pop\`, \`${prefix}filter <name>\`, \`${prefix}clearfilters\`\n\n` +
                `**Panels & Lyrics:**\n` +
                `\`${prefix}djpanel\`, \`${prefix}lyrics\`, \`${prefix}grab\``
            );
    } else if (catId === 'mod') {
        embed.setTitle('🛡️ Moderation & AutoMod Suite (45+ Commands)')
            .setDescription(
                `**🤖 Channel AutoMod Pro (Links & Emojis):**\n` +
                `• \`${prefix}automod\` (or \`${prefix}am\`) — Toggle link & emoji spam protection per channel with 1-year interactive buttons\n` +
                `• \`${prefix}antilink\` — Instant enable/disable link protection for specific channels\n` +
                `• \`${prefix}antiemoji\` — Instant enable/disable 5+ emoji spam filter for specific channels\n` +
                `• \`${prefix}ignore\` / \`${prefix}unignore\` — Exclude or re-activate channel automod filtering\n\n` +
                `**Punishments & Enforcement:**\n` +
                `\`${prefix}ban\`, \`${prefix}unban\`, \`${prefix}softban\`, \`${prefix}tempban\`, \`${prefix}kick\`, \`${prefix}mute\`, \`${prefix}unmute\`, \`${prefix}warn\`, \`${prefix}warnings\`, \`${prefix}clearwarns\`, \`${prefix}delwarn\`\n\n` +
                `**🚨 Emergency Raid Lockdown & Recovery:**\n` +
                `• \`${prefix}emergency-lockdown\` — Instant zero-delay freeze on all text channels\n` +
                `• \`${prefix}emergency-nuke\` — Emergency quarantine, clone and cleanse channel\n` +
                `• \`${prefix}emergency-secure\` — Multi-threat lockdown & anti-raid quarantine\n` +
                `• \`${prefix}emergency-unban\` — Automated mass-unban recovery suite\n\n` +
                `**Channel & Member Management:**\n` +
                `\`${prefix}purge\`, \`${prefix}purgeuser\`, \`${prefix}purgelinks\`, \`${prefix}purgebot\`, \`${prefix}slowmode\`, \`${prefix}lock\`, \`${prefix}unlock\`, \`${prefix}lockdown\`, \`${prefix}unlockdown\`, \`${prefix}nuke\`, \`${prefix}hide\`, \`${prefix}unhide\`, \`${prefix}setnick\`, \`${prefix}role\`, \`${prefix}addrole\`, \`${prefix}removerole\`, \`${prefix}roleall\`, \`${prefix}autorole\`\n\n` +
                `**Voice Moderation & Cases:**\n` +
                `\`${prefix}vckick\`, \`${prefix}vcmute\`, \`${prefix}vcunmute\`, \`${prefix}vcmod\`, \`${prefix}modpanel\`, \`${prefix}case\`, \`${prefix}editcase\`, \`${prefix}modstats\`, \`${prefix}modleaderboard\`, \`${prefix}banfile\`, \`${prefix}preban\``
            );
    } else if (catId === 'booster') {
        embed.setTitle('🚀 Vanity Studio & Zero-Boost Name Colors')
            .setDescription(
                `**🎨 Zero-Boost Name Colors & Optical Hex Blends:**\n` +
                `• \`${prefix}color blend <#Hex1> <#Hex2> [ratio%]\` — Blend two hex colors optically (Zero server boosts needed!)\n` +
                `• \`${prefix}color presets\` — Browse 26 hand-crafted aesthetic blend palettes\n` +
                `• \`${prefix}color <#HexCode>\` — Apply a solid custom hex color role\n` +
                `• \`${prefix}color random\` — Generate and equip a random vibrant blend\n` +
                `• \`${prefix}color preview <#Hex1> [#Hex2]\` — Preview color blend & WCAG contrast\n` +
                `• \`${prefix}color info\` / \`${prefix}color remove\` — View active role or reset to default\n\n` +
                `**🌟 Server Booster Vanity & Shared Roles:**\n` +
                `• \`${prefix}boosterrole\` (or \`${prefix}br\`) — Create, edit color/icon/name, delete, or share your custom role with friends!\n` +
                `• \`${prefix}boostperks\` — Inspect your active boosting tier, tenure, and shared role recipients.\n\n` +
                `**⚙️ Administrator Controls:**\n` +
                `• \`${prefix}color config\` — Configure color role system access and hierarchy anchor.\n` +
                `• \`${prefix}boosteradmin\` — Configure booster share slots and sync rules.\n` +
                `• \`${prefix}boost-setup\` — Configure booster announcements and VIP perks.`
            );
    } else if (catId === 'util') {
        embed.setTitle('🛠️ Utility & AI Server Innovations (50+ Commands)')
            .setDescription(
                `**🌟 Cutting-Edge Starry Innovations:**\n` +
                `• 💬 **Chat Reviver Spark:** \`${prefix}spark\` (or \`${prefix}revive\`, \`${prefix}deadchat\`) *(AI high-engagement discussions)*\n` +
                `• 🌌 **Astral Portals:** \`${prefix}portal\` (or \`${prefix}wormhole\`) *(Live cross-server chat bridges)*\n` +
                `• 💓 **Server Pulse:** \`${prefix}pulse\` (or \`${prefix}vibe\`) *(Circadian server vibe, retention & health analytics)*\n` +
                `• 🧑‍💻 **Code Studio:** \`${prefix}code-studio\` (or \`${prefix}review\`) *(Multi-agent automated code audit & architect)*\n` +
                `• 🗞️ **Starlight Gazette:** \`${prefix}gazette\` (or \`${prefix}digest\`) *(Autonomous AI community newspaper & recap)*\n` +
                `• ⏳ **Server Chronos:** \`${prefix}chronos\` (or \`${prefix}goldenhour\`) *(Activity forecast heatmaps)*\n` +
                `• 🛡️ **CyberSec Pentest:** \`${prefix}pentest\` (or \`${prefix}audit\`) *(White-hat security vulnerability scan)*\n` +
                `• 📰 **Channel Catch-Up:** \`${prefix}catchup\` (or \`${prefix}tldr\`) *(AI chat recap & DM executive briefing)*\n\n` +
                `**Core Server Tools:**\n` +
                `\`${prefix}help\`, \`${prefix}ahelp\`, \`${prefix}ping\`, \`${prefix}botinfo\`, \`${prefix}serverinfo\`, \`${prefix}userinfo\`, \`${prefix}whois\`, \`${prefix}avatar\`, \`${prefix}banner\`, \`${prefix}membercount\`, \`${prefix}roles\`, \`${prefix}emojis\`, \`${prefix}steal\`, \`${prefix}invite\`, \`${prefix}vote\`, \`${prefix}premium\`, \`${prefix}addpremium\`, \`${prefix}delpremium\`, \`${prefix}uptime\`, \`${prefix}afk\`, \`${prefix}translate\`, \`${prefix}calculator\`, \`${prefix}poll\`, \`${prefix}announce\`, \`${prefix}embed\`, \`${prefix}say\`, \`${prefix}snipe\`, \`${prefix}editsnipe\`, \`${prefix}setlogs\`, \`${prefix}setupwelcome\`, \`${prefix}setupgoodbye\`, \`${prefix}imagine\`, \`${prefix}nitroclaims\`, \`${prefix}remind\`, \`${prefix}starboard\`, \`${prefix}tempvoice\`, \`${prefix}tag\`, \`${prefix}tags\`, \`${prefix}sticky\`, \`${prefix}vram\`, \`${prefix}redeem\`, \`${prefix}approveorder\`, \`${prefix}orders\`, \`${prefix}genkey\``
            );
    } else if (catId === 'social') {
        embed.setTitle('🎭 Social Actions & Anime Expressions (44 Commands)')
            .setDescription(
                `**Targeted Member Interactions (Anime GIFs + Counter):**\n` +
                `\`${prefix}hug\`, \`${prefix}kiss\`, \`${prefix}slap\`, \`${prefix}pat\`, \`${prefix}cuddle\`, \`${prefix}bite\`, \`${prefix}poke\`, \`${prefix}punch\`, \`${prefix}tickle\`, \`${prefix}feed\`, \`${prefix}lick\`, \`${prefix}highfive\`, \`${prefix}wave\`, \`${prefix}handshake\`, \`${prefix}handhold\`, \`${prefix}bonk\`, \`${prefix}yeet\`, \`${prefix}boop\`, \`${prefix}kill\`, \`${prefix}spank\`, \`${prefix}wink\`, \`${prefix}suck\`, \`${prefix}pinch\`, \`${prefix}smack\`, \`${prefix}nom\`, \`${prefix}bully\`, \`${prefix}baka\`, \`${prefix}shoot\`\n\n` +
                `**Solo Expressions & Fun:**\n` +
                `\`${prefix}sleep\`, \`${prefix}wakeup\`, \`${prefix}cry\`, \`${prefix}laugh\`, \`${prefix}dance\`, \`${prefix}blush\`, \`${prefix}pout\`, \`${prefix}smile\`, \`${prefix}stare\`, \`${prefix}cheer\`, \`${prefix}smug\`, \`${prefix}sip\`, \`${prefix}shrug\`, \`${prefix}bleh\`, \`${prefix}clap\`, \`${prefix}social\`\n\n` +
                `*All social interaction buttons feature persistent 1-year lifetime!*`
            );
    } else if (catId === 'eco') {
        embed.setTitle('💰 Economy & RPG Adventure Suite (32 Commands)')
            .setDescription(
                `**Starlight Passport & Balances:**\n` +
                `\`${prefix}profile\` (or \`${prefix}p\`), \`${prefix}balance\` (or \`${prefix}bal\`), \`${prefix}rank\`, \`${prefix}leaderboard\`, \`${prefix}deposit\`, \`${prefix}withdraw\`, \`${prefix}pay\`, \`${prefix}setbio\`, \`${prefix}setlevel\`\n\n` +
                `**Adventure, Scavenging & Jobs:**\n` +
                `• \`${prefix}beg\` — Beg traveling cosmic merchants\n` +
                `• \`${prefix}search\` — Scavenge celestial locations (Nebula, Satellites, Craters)\n` +
                `• \`${prefix}crime\` — Attempt high-risk planetary heists\n` +
                `• \`${prefix}fish\` — Deep-space cosmic fishing\n` +
                `• \`${prefix}mine\` — Asteroid mining for valuable minerals\n` +
                `• \`${prefix}work\`, \`${prefix}daily\`, \`${prefix}weekly\`\n\n` +
                `**Market, Inventory & Romance:**\n` +
                `\`${prefix}shop\`, \`${prefix}buy\`, \`${prefix}sell\`, \`${prefix}inventory\`, \`${prefix}crate\`, \`${prefix}gamble\`, \`${prefix}slots\`, \`${prefix}rob\`, \`${prefix}pet\`, \`${prefix}marry\`, \`${prefix}divorce\`, \`${prefix}ship\``
            );
    } else if (catId === 'game') {
        embed.setTitle('🎮 Cosmic Arcade & Boss Raids (12 Commands)')
            .setDescription(
                `**⚔️ Server-Wide Co-op Raids:**\n` +
                `• \`${prefix}raid\` (or \`${prefix}boss\`, \`${prefix}bossraid\`) — Summon or battle ancient server World Bosses with cooperative mechanics & legendary loot!\n\n` +
                `**Card & Casino Games:**\n` +
                `• \`${prefix}blackjack\` (or \`${prefix}bj\`) — Full 21-card blackjack with Hit, Stand & Double Down buttons\n` +
                `• \`${prefix}highlow\` (or \`${prefix}hl\`) — Predict higher or lower for multiplying stardust\n` +
                `• \`${prefix}spin\` (or \`${prefix}wheel\`) — Animated celestial wheel of fortune\n\n` +
                `**Arcade & Logic Challenges:**\n` +
                `• \`${prefix}mines\` — 3x3 interactive minefield grid: reveal stars, avoid black holes, cash out!\n` +
                `• \`${prefix}wordle\` — Secret 5-letter starlight word challenge\n` +
                `• \`${prefix}trivia\` — Timed 4-choice trivia quiz with rewards\n` +
                `• \`${prefix}tictactoe\` (or \`${prefix}ttt\`) — Interactive 3x3 PvP duel\n` +
                `• \`${prefix}rps\` — Rock-Paper-Scissors against AI or members\n\n` +
                `**Casual & Mystic:**\n` +
                `• \`${prefix}coinflip\`, \`${prefix}roll\`, \`${prefix}8ball\``
            );
    } else if (catId === 'sys') {
        embed.setTitle('🤖 Multi-Bot & Systems Management (26 Commands)')
            .setDescription(
                `**Multi-Bot Architecture & Clustering:**\n` +
                `• \`${prefix}multibot\` — Inspect active worker bots, voice delegate states, and cluster health\n` +
                `• \`${prefix}telemetry\` — Real-time performance, cluster latency & sharding analytics\n\n` +
                `**Treasure Chests & Engagement:**\n` +
                `• \`${prefix}chest\` — Open and view your cosmic chests\n` +
                `• \`${prefix}chestdrop\` — Manually trigger a wild drop in the channel\n` +
                `• \`${prefix}chest-setup\` — Deploy auto-spawning chest drop systems\n` +
                `• \`${prefix}chest-toggle\` — Enable or disable chest drops per channel\n\n` +
                `**Automated Giveaways & Tickets:**\n` +
                `\`${prefix}giveaway\`, \`${prefix}reroll\`, \`${prefix}gend\`, \`${prefix}ticketsetup\`, \`${prefix}applysetup\`, \`${prefix}verify-setup\`, \`${prefix}confessionsetup\`, \`${prefix}setupcount\`\n\n` +
                `**Backups & Visual Branding:**\n` +
                `\`${prefix}backup\`, \`${prefix}restore\`, \`${prefix}embedtheme\`, \`${prefix}customizewelcome\`, \`${prefix}customizegoodbye\`, \`${prefix}customizelevels\``
            );
    } else if (catId === 'nsfw') {
        if (!isNsfw) {
            embed.setColor('#ED4245')
                .setTitle('🔒 Mature Commands are Hidden')
                .setDescription(
                    `The Mature & NSFW module is **disabled** in this server or channel.\n\n` +
                    `**How to Enable & View:**\n` +
                    `1. **In Servers:** An Administrator must run \`${prefix}nsfw on\` inside a channel marked as **Age-Restricted (NSFW)** in Discord settings.\n` +
                    `2. **In DMs:** Run \`${prefix}nsfw dms on\` in Direct Messages.\n` +
                    `3. **Ask AI:** Run \`${prefix}nsfw info\` for an AI breakdown of features.`
                );
            return embed;
        }

        embed.setColor('#FF1493')
            .setTitle('🔞 Mature & Anime NSFW Commands (21 Commands)')
            .setDescription(
                `**⚙️ Configuration & AI:**\n` +
                `\`${prefix}nsfw on/off\`, \`${prefix}nsfw info\`, \`${prefix}nsfw dms on/off\`, \`${prefix}nsfwhelp\`\n\n` +
                `**🌸 Anime & Waifu Art Galleries:**\n` +
                `\`${prefix}waifu\`, \`${prefix}neko\`, \`${prefix}kitsune\`, \`${prefix}husbando\`, \`${prefix}trap\`, \`${prefix}ecchi\`, \`${prefix}hentai\`, \`${prefix}blowkiss\`\n\n` +
                `**💋 Mature Anime Social Interactions:**\n` +
                `\`${prefix}nsfwkiss\`, \`${prefix}nsfwhug\`, \`${prefix}spank\`, \`${prefix}nsfwlick\`, \`${prefix}nsfwtouch\`, \`${prefix}nsfwcuddle\`, \`${prefix}nsfwsuck\`, \`${prefix}nsfwpinch\`, \`${prefix}nsfwsmack\`\n\n` +
                `*Strict Discord Age-Restricted channel verification active!*`
            );
    } else {
        const totalCommands = isNsfw ? '270+' : '250+';
        embed.setTitle('🌟 Manager Bot & Starry Supreme Command Hub')
            .setDescription(
                `Welcome to the ultimate Discord multi-feature bot!\n` +
                `• **Primary Interface:** **Slash Commands (\`/\`)** *(Type \`/\` to view autocomplete list)*\n` +
                `• **Prefix Commands (\`${prefix}\`):** Reserved exclusively for **Bot Owners**\n` +
                `• **Total Commands:** \`${totalCommands}\` across ${isNsfw ? '9' : '8'} specialized categories\n` +
                `• **Multi-Bot Clustering:** Active and synchronized\n` +
                `• **Embed Buttons Lifetime:** High persistence up to **1 Year**\n\n` +
                `Select a category from the dropdown menu below or click the quick action buttons.`
            )
            .addFields(
                { name: '🎵 Music (37)', value: `\`${prefix}play\`, \`${prefix}autoplay\`, \`${prefix}spotify\``, inline: true },
                { name: '🛡️ Moderation (40+)', value: `\`${prefix}ban\`, \`${prefix}lockdown\`, \`${prefix}modpanel\``, inline: true },
                { name: '🚀 Vanity & Colors (6)', value: `\`${prefix}color\`, \`${prefix}boosterrole\`, \`${prefix}boostperks\``, inline: true },
                { name: '🛠️ Utility (50+)', value: `\`${prefix}spark\`, \`${prefix}portal\`, \`${prefix}remind\``, inline: true },
                { name: '🎮 Arcade (12)', value: `\`${prefix}raid\`, \`${prefix}blackjack\`, \`${prefix}mines\``, inline: true },
                { name: '💰 Economy (32)', value: `\`${prefix}profile\`, \`${prefix}crime\`, \`${prefix}shop\``, inline: true },
                { name: '🎭 Social (44)', value: `\`${prefix}hug\`, \`${prefix}kiss\`, \`${prefix}bonk\``, inline: true },
                { name: '🤖 Systems (26)', value: `\`${prefix}multibot\`, \`${prefix}chest\`, \`${prefix}backup\``, inline: true }
            );

        if (isNsfw) {
            embed.addFields({ name: '🔞 Mature & Anime (21)', value: `\`${prefix}nsfwkiss\`, \`${prefix}waifu\`, \`${prefix}nsfwhelp\``, inline: true });
        }
    }
    return embed;
}

function createHelpComponents(isNsfw = false) {
    const categories = getHelpCategories(isNsfw);

    const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder('📂 Choose a command category...')
            .addOptions([
                { label: 'Overview / Home', description: 'Main bot dashboard and quick stats', value: 'home', emoji: '🏠' },
                ...categories.map(c => ({ label: c.label, description: c.desc, value: c.id, emoji: c.emoji }))
            ])
    );

    const buttons = [
        new ButtonBuilder().setCustomId('help_btn_music').setLabel('Music').setEmoji('🎵').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('help_btn_mod').setLabel('Mod').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('help_btn_booster').setLabel('Booster').setEmoji('🚀').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('help_btn_util').setLabel('Utility').setEmoji('🛠️').setStyle(ButtonStyle.Secondary)
    ];

    if (isNsfw) {
        buttons.push(new ButtonBuilder().setCustomId('help_btn_nsfw').setLabel('NSFW').setEmoji('🔞').setStyle(ButtonStyle.Danger));
    } else {
        buttons.push(new ButtonBuilder().setCustomId('help_btn_eco').setLabel('Economy').setEmoji('💰').setStyle(ButtonStyle.Secondary));
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
