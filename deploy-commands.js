// ==========================================
// 🚀 STARRY SUPREME GLOBAL DEPLOY ENGINE
// File Path: deploy-commands.js
// ==========================================
require('dotenv').config();
const { 
    REST, 
    Routes, 
    PermissionFlagsBits, 
    SlashCommandBuilder, 
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    ApplicationIntegrationType,
    InteractionContextType,
    ChannelType 
} = require('discord.js');

const ADMIN = PermissionFlagsBits.Administrator.toString();
const MANAGE_ROLES = PermissionFlagsBits.ManageRoles.toString();
const MANAGE_CHANNELS = PermissionFlagsBits.ManageChannels.toString();
const MODERATE_MEMBERS = PermissionFlagsBits.ModerateMembers.toString();

// Helper to safely require modules across relative path variants
function safeRequire(paths) {
    for (const p of paths) {
        try {
            return require(p);
        } catch (e) {
            // Continue candidate search
        }
    }
    return null;
}

// 1. BUILD AUTOROLE COMMAND DEFINITION
const autoroleOptions = [
    { name: 'sticky_roles', type: 5, required: false, description: 'Enable or disable restoring previous roles on rejoin' }
];

for (let i = 1; i <= 24; i++) {
    autoroleOptions.push({ name: `role${i}`, type: 8, required: false, description: `Select role #${i} to add to the autorole list` });
}

const autoroleCommandDef = {
    name: 'autorole',
    description: 'Set up multiple autoroles for when members join',
    default_member_permissions: ADMIN,
    options: autoroleOptions
};

// 2. SAFELY IMPORT ALL MODULE PAYLOADS
let masterPayloads = [];

// Master Systems Payloads (Starry Module)
const masterModule = safeRequire(['./src/modules/starry', './modules/starry', './src/modules/masterChannelSystems', './modules/masterChannelSystems']);
if (masterModule) {
    if (masterModule.modMasterPayload) masterPayloads.push(masterModule.modMasterPayload);
    if (masterModule.autoModMasterPayload) masterPayloads.push(masterModule.autoModMasterPayload);
    if (masterModule.ignorePayload) masterPayloads.push(masterModule.ignorePayload);
    if (masterModule.unignorePayload) masterPayloads.push(masterModule.unignorePayload);
}

// Tracker Payload
const trackerModule = safeRequire(['./src/modules/tracker', './modules/tracker']);
if (trackerModule && trackerModule.data) {
    masterPayloads.push(trackerModule.data.toJSON ? trackerModule.data.toJSON() : trackerModule.data);
}

// AFK Command Payload
const afkModule = safeRequire(['./src/modules/afk', './modules/afk']);
if (afkModule && afkModule.afkPayload) {
    masterPayloads.push(afkModule.afkPayload);
}

// Bump Engine Payload (Server Promotion)
const bumpModule = safeRequire(['./src/modules/bumpEngine', './modules/bumpEngine']);
if (bumpModule && bumpModule.bumpPayload) {
    masterPayloads.push(bumpModule.bumpPayload);
}

// Confession Engine Payload
const confessionModule = safeRequire(['./src/modules/confession', './modules/confession']);
if (confessionModule && confessionModule.confessionSetupPayload) {
    masterPayloads.push(confessionModule.confessionSetupPayload);
}

// Translator Engine Payload
const translatorModule = safeRequire(['./src/modules/translator', './modules/translator']);
if (translatorModule) {
    if (translatorModule.translatorPayload) masterPayloads.push(translatorModule.translatorPayload);
    if (translatorModule.translateContextPayload) masterPayloads.push(translatorModule.translateContextPayload);
}

const socialModule = safeRequire(['./src/modules/socialActions', './modules/socialActions']);
const vcmodModule = safeRequire(['./src/commands/moderation/vcmod', './commands/moderation/vcmod']);
if (vcmodModule && vcmodModule.data) {
    masterPayloads.push(vcmodModule.data.toJSON ? vcmodModule.data.toJSON() : vcmodModule.data);
}

const portalModule = safeRequire(['./src/commands/utility/portal', './commands/utility/portal']);
if (portalModule && portalModule.data) {
    masterPayloads.push(portalModule.data.toJSON ? portalModule.data.toJSON() : portalModule.data);
}

const pulseModule = safeRequire(['./src/commands/utility/pulse', './commands/utility/pulse']);
if (pulseModule && pulseModule.data) {
    masterPayloads.push(pulseModule.data.toJSON ? pulseModule.data.toJSON() : pulseModule.data);
}

const sparkModule = safeRequire(['./src/commands/utility/spark', './commands/utility/spark']);
if (sparkModule && sparkModule.data) {
    masterPayloads.push(sparkModule.data.toJSON ? sparkModule.data.toJSON() : sparkModule.data);
}

const raidModule = safeRequire(['./src/commands/game/raid', './commands/game/raid']);
if (raidModule && raidModule.data) {
    masterPayloads.push(raidModule.data.toJSON ? raidModule.data.toJSON() : raidModule.data);
}

const catchupModule = safeRequire(['./src/commands/utility/catchup', './commands/utility/catchup']);
if (catchupModule && catchupModule.data) {
    masterPayloads.push(catchupModule.data.toJSON ? catchupModule.data.toJSON() : catchupModule.data);
}

const pentestModule = safeRequire(['./src/commands/utility/pentest', './commands/utility/pentest']);
if (pentestModule && pentestModule.data) {
    masterPayloads.push(pentestModule.data.toJSON ? pentestModule.data.toJSON() : pentestModule.data);
}

const chronosModule = safeRequire(['./src/commands/utility/chronos', './commands/utility/chronos']);
if (chronosModule && chronosModule.data) {
    masterPayloads.push(chronosModule.data.toJSON ? chronosModule.data.toJSON() : chronosModule.data);
}

const gazetteModule = safeRequire(['./src/commands/utility/gazette', './commands/utility/gazette']);
if (gazetteModule && gazetteModule.data) {
    masterPayloads.push(gazetteModule.data.toJSON ? gazetteModule.data.toJSON() : gazetteModule.data);
}

const codeStudioModule = safeRequire(['./src/commands/utility/codeStudio', './commands/utility/codeStudio']);
if (codeStudioModule && codeStudioModule.data) {
    masterPayloads.push(codeStudioModule.data.toJSON ? codeStudioModule.data.toJSON() : codeStudioModule.data);
}

const commands = [
    ...masterPayloads,

    // VOICE HUB
    { name: 'djpanel', description: '🎛️ Post the ultimate interactive Starry DJ & Voice Control Hub', default_member_permissions: '16' },

    // MUSIC COMMANDS
    { 
        name: 'play', 
        description: '🎵 Play high-fidelity audio from SoundCloud, Spotify, or YouTube', 
        options: [{ 
            name: 'song', 
            type: 3, 
            required: true, 
            description: 'Song title, artist, or music link', 
            autocomplete: true 
        }] 
    },
    { 
        name: 'search', 
        description: '🔍 Interactive search across SoundCloud, Spotify, Apple Music & YouTube', 
        options: [{ 
            name: 'query', 
            type: 3, 
            required: true, 
            description: 'Song title or artist to search', 
            autocomplete: true 
        }] 
    },
    { name: 'skip', description: 'Skip the current song' },
    { name: 'stop', description: 'Stop the music and clear the queue' },
    { name: 'queue', description: 'View and interactively manage the current music queue' },
    { name: 'volume', description: 'Change the music volume', options: [{ name: 'amount', type: 4, required: true, description: 'Volume from 1 to 100', min_value: 1, max_value: 100 }] },

    // 🌟 SETUP WELCOME COMMAND
    new SlashCommandBuilder()
        .setName('setupwelcome')
        .setDescription('Set up the channel for automated server welcome messages')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The text channel to send welcome cards in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .toJSON(),

    // 👋 SETUP GOODBYE COMMAND
    new SlashCommandBuilder()
        .setName('setupgoodbye')
        .setDescription('Set up the channel for automated server goodbye messages')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The text channel to send goodbye cards in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .toJSON(),

    // 🎨 MASTER EMBED VISUALITY STUDIO
    new SlashCommandBuilder()
        .setName('customize')
        .setDescription('Universal Embed Visuality Studio - Customize welcome, goodbye, levels & server theme')
        .addStringOption(option =>
            option.setName('feature')
                .setDescription('Select specific feature visualizer to open')
                .setRequired(false)
                .addChoices(
                    { name: '🌸 Welcome Embeds', value: 'welcome' },
                    { name: '🥀 Goodbye Embeds', value: 'goodbye' },
                    { name: '📊 Level-Up Cards', value: 'levels' },
                    { name: '🎨 Server Embed Theme', value: 'theme' }
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .toJSON(),

    // 📊 SINGLE LEVELING SLASH COMMAND
    new SlashCommandBuilder()
        .setName('enableleveling')
        .setDescription('⚙️ Enable leveling system and select log channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Select channel for level-up notifications')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        )
        .toJSON(),


    // 🎨 AI IMAGE GENERATION SLASH COMMANDS (Usable in Guilds, DMs, & Group Chats)
    new SlashCommandBuilder()
        .setName('image')
        .setDescription('🎨 Generate AI images and artwork from text prompts')
        .setIntegrationTypes(
            ApplicationIntegrationType.GuildInstall, 
            ApplicationIntegrationType.UserInstall
        )
        .setContexts(
            InteractionContextType.Guild, 
            InteractionContextType.BotDM, 
            InteractionContextType.PrivateChannel
        )
        .addStringOption(option => 
            option.setName('prompt')
                .setDescription('Detailed text description of the image to generate')
                .setRequired(true)
        )
        .toJSON(),

    // 📥 GLOBAL EMOJI & STICKER STEALER COMMANDS
    new SlashCommandBuilder()
        .setName('steal')
        .setDescription('📥 Steal emojis or stickers from text or messages')
        .setIntegrationTypes(
            ApplicationIntegrationType.GuildInstall, 
            ApplicationIntegrationType.UserInstall
        )
        .setContexts(
            InteractionContextType.Guild, 
            InteractionContextType.BotDM, 
            InteractionContextType.PrivateChannel
        )
        .addStringOption(option => 
            option.setName('emojis')
                .setDescription('Paste emojis or text containing emojis to steal')
                .setRequired(true)
        )
        .toJSON(),

    // 🎨 ZERO-BOOST NAME COLOR & HEX BLEND SUITE
    new SlashCommandBuilder()
        .setName('color')
        .setDescription('🎨 Customize username color with hex blends or zero-role server profile mode')
        .addSubcommand(sub =>
            sub.setName('profile')
                .setDescription('Apply hex blend directly to Server Profile without creating ANY roles (Zero-role mode)')
                .addStringOption(opt => opt.setName('color1').setDescription('First hex color or preset name (e.g. #FF0055 or cyberpunk)').setRequired(true))
                .addStringOption(opt => opt.setName('color2').setDescription('Second hex color (optional for blend)').setRequired(false))
                .addIntegerOption(opt => opt.setName('ratio').setDescription('Blend ratio percentage (0-100, default 50)').setMinValue(0).setMaxValue(100).setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('blend')
                .setDescription('Blend two hex colors together optically (No server boosts needed!)')
                .addStringOption(opt => opt.setName('color1').setDescription('First hex color (e.g. #FF0055)').setRequired(true))
                .addStringOption(opt => opt.setName('color2').setDescription('Second hex color (e.g. #00E5FF)').setRequired(true))
                .addIntegerOption(opt => opt.setName('ratio').setDescription('Blend ratio percentage (0-100, default 50)').setMinValue(0).setMaxValue(100).setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('Apply a single solid hex color to your username')
                .addStringOption(opt => opt.setName('hex').setDescription('6-digit hex color (e.g. #FF73FA)').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('preset')
                .setDescription('Apply a hand-crafted aesthetic blend preset')
                .addStringOption(opt => 
                    opt.setName('name')
                        .setDescription('Select an aesthetic blend preset')
                        .setRequired(true)
                        .addChoices(
                            { name: '🌅 Sunset Horizon (#FF512F ➔ #DD2476)', value: 'sunset' },
                            { name: '⚡ Cyberpunk 2099 (#FF007F ➔ #7928CA)', value: 'cyberpunk' },
                            { name: '🌊 Oceanic Depths (#00F2FE ➔ #4FACFE)', value: 'ocean' },
                            { name: '🍬 Cotton Candy (#FFAFBD ➔ #C9FFBF)', value: 'cotton_candy' },
                            { name: '🌌 Northern Aurora (#00F260 ➔ #0575E6)', value: 'aurora' },
                            { name: '💿 Holographic Prism (#A9FFFF ➔ #FFCCCC)', value: 'holographic' },
                            { name: '🔥 Phoenix Blaze (#F12711 ➔ #F5AF19)', value: 'fire' },
                            { name: '🪻 Lavender Mist (#C471ED ➔ #F64F59)', value: 'lavender' },
                            { name: '💎 Mystic Emerald (#11998E ➔ #38EF7D)', value: 'emerald' },
                            { name: '✨ Supernova Galaxy (#3A1C71 ➔ #D76D77)', value: 'galaxy' },
                            { name: '🌸 Cherry Blossom (#FFA8A8 ➔ #FC6C85)', value: 'sakura' },
                            { name: '🌴 Vaporwave Dream (#FF71CE ➔ #01CDFE)', value: 'vaporwave' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('random')
                .setDescription('Generate and equip a random vibrant color blend')
        )
        .addSubcommand(sub =>
            sub.setName('preview')
                .setDescription('Preview an optical color blend without changing your role')
                .addStringOption(opt => opt.setName('color1').setDescription('First hex color (e.g. #FF0055)').setRequired(true))
                .addStringOption(opt => opt.setName('color2').setDescription('Second hex color (e.g. #00E5FF)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('info')
                .setDescription('View your active custom color role and contrast analysis')
                .addUserOption(opt => opt.setName('user').setDescription('Member to inspect (optional)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove your custom name color role and reset to default')
        )
        .toJSON(),

    new ContextMenuCommandBuilder()
        .setName('Steal Emojis')
        .setType(ApplicationCommandType.Message)
        .setIntegrationTypes(
            ApplicationIntegrationType.GuildInstall, 
            ApplicationIntegrationType.UserInstall
        )
        .setContexts(
            InteractionContextType.Guild, 
            InteractionContextType.BotDM, 
            InteractionContextType.PrivateChannel
        )
        .toJSON()
];

if (socialModule && socialModule.socialCommandPayload) {
    commands.push(socialModule.socialCommandPayload);
}

// Direct Social Action Slash Commands (Top 20 most popular actions directly accessible; all others accessible via /social and chat prefix)
const TOP_DIRECT_SOCIAL_ACTIONS = new Set([
    'hug', 'kiss', 'pat', 'slap', 'cuddle', 'highfive', 'bonk', 'yeet', 
    'poke', 'bite', 'feed', 'handhold', 'wink', 'dance', 'cry', 'blush', 
    'smile', 'wave', 'laugh', 'cheer'
]);

if (socialModule && socialModule.ACTION_CONFIG) {
    for (const [act, conf] of Object.entries(socialModule.ACTION_CONFIG)) {
        if (!TOP_DIRECT_SOCIAL_ACTIONS.has(act)) continue;
        const isTargeted = conf.requiresTarget !== false;
        const desc = isTargeted
            ? `${conf.verb.charAt(0).toUpperCase() + conf.verb.slice(1)} a member with an animated anime GIF!`
            : `${conf.verb.charAt(0).toUpperCase() + conf.verb.slice(1)} (Anime Reaction)`;
        
        commands.push(
            new SlashCommandBuilder()
                .setName(act)
                .setDescription(desc.slice(0, 100))
                .setContexts([0, 1, 2])
                .setIntegrationTypes([0, 1])
                .addUserOption(opt => 
                    opt.setName('target')
                       .setDescription(isTargeted ? 'Target member' : 'Optional target member')
                       .setRequired(isTargeted)
                )
                .toJSON()
        );
    }
}

// ✨ AI, VISION, SUMMARIZE, SETPREFIX & TOP.GG VOTE SLASH COMMANDS
commands.push(
    new SlashCommandBuilder()
        .setName('ai')
        .setDescription('✨ Ask Starry AI anything with interactive embed page-turning buttons & vision!')
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1])
        .addStringOption(option => 
            option.setName('question')
                .setDescription('The question or prompt for Starry AI')
                .setRequired(true)
        )
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('Optional image, screenshot, or diagram to visually analyze')
                .setRequired(false)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName('vision')
        .setDescription('🌌 Multimodal Vision: Analyze any image, screenshot, error log, or diagram')
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1])
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('Image file to visually inspect')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('Specific question about the image (optional)')
                .setRequired(false)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName('summarize')
        .setDescription('📰 AI Channel Catch-Up: Executive briefing of missed conversations and debates')
        .setContexts([0])
        .setIntegrationTypes([0])
        .addIntegerOption(option =>
            option.setName('hours')
                .setDescription('Time window in hours to summarize (1-24, default 6)')
                .setMinValue(1)
                .setMaxValue(24)
                .setRequired(false)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName('codebot')
        .setDescription('🚀 Autonomous Bot Studio: Build a complete multi-file bot pushed to GitHub or ZIP')
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1])
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('Describe the features and theme of your bot')
                .setRequired(false)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName('setprefix')
        .setDescription('⚙️ Set a custom prefix for this server')
        .setContexts([0])
        .setIntegrationTypes([0])
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option => 
            option.setName('prefix')
                .setDescription('The new prefix (e.g. ! or ? or -)')
                .setRequired(true)
        )
        .toJSON()
);

commands.push(
    { 
        name: 'setup-starry', 
        description: '🧠 AI MASTER COMMAND: Scans, builds, & configures custom server layout + infrastructure.', 
        default_member_permissions: '8',
        options: [{ name: 'prompt', type: 3, required: false, description: 'Describe your server theme' }]
    },
    autoroleCommandDef,
    { name: 'role', description: 'Manage server roles', default_member_permissions: MANAGE_ROLES, options: [{ name: 'create', type: 1, description: 'Create role', options: [{ name: 'name', type: 3, required: true, description: 'Role name' }] }] },
    
    // UPDATED FULL REACTION ROLES COMMAND (SUBCOMMANDS: spawn, add, remove, list)
    {
        name: 'rr',
        description: 'Manage reaction-role panels',
        default_member_permissions: ADMIN,
        options: [
            {
                name: 'spawn',
                type: 1,
                description: 'Create a reaction role panel embed',
                options: [
                    { name: 'channel', type: 7, required: true, description: 'Target channel' },
                    { name: 'title', type: 3, required: true, description: 'Embed title' },
                    { name: 'text', type: 3, required: true, description: 'Embed description text' }
                ]
            },
            {
                name: 'add',
                type: 1,
                description: 'Attach a reaction role to an existing panel',
                options: [
                    { name: 'channel', type: 7, required: true, description: 'Channel containing the panel' },
                    { name: 'message_id', type: 3, required: true, description: 'Message ID of the panel embed' },
                    { name: 'role', type: 8, required: true, description: 'Role to grant on reaction' },
                    { name: 'emoji', type: 3, required: true, description: 'Emoji to use for reaction' }
                ]
            },
            {
                name: 'remove',
                type: 1,
                description: 'Remove a reaction role from a panel',
                options: [
                    { name: 'channel', type: 7, required: true, description: 'Channel containing the panel' },
                    { name: 'message_id', type: 3, required: true, description: 'Message ID of the panel embed' },
                    { name: 'emoji', type: 3, required: true, description: 'Emoji to remove' }
                ]
            },
            {
                name: 'list',
                type: 1,
                description: 'List all active reaction roles in this server'
            }
        ]
    },

    { name: 'setlogs', description: 'Set server log channel', default_member_permissions: ADMIN, options: [{ name: 'channel', type: 7, required: true, description: 'Channel' }] },
    { name: 'setupvc', description: 'Configure join-to-create voice channel', default_member_permissions: MANAGE_CHANNELS, options: [{ name: 'channel', type: 7, required: true, description: 'Voice channel' }] },
    { name: 'help', description: 'Show bot command list with 100+ commands' },
    { name: 'ping', description: 'Check bot latency and multi-bot cluster status' },
    { name: 'activatepremium', description: 'Activate Premium', options: [{ name: 'server_id', type: 3, required: false, description: 'Server/User ID' }] },
    { name: 'avatar', description: '🖼️ Display user profile avatar in high resolution', options: [{ name: 'user', type: 6, required: false, description: 'Target user' }] },
    { name: 'banner', description: '🎨 Display user or server profile banner', options: [{ name: 'user', type: 6, required: false, description: 'Target user' }] },
    { name: 'rank', description: '👑 Check user level and XP ranking', options: [{ name: 'user', type: 6, required: false, description: 'Target user' }] },
    { name: 'leaderboard', description: '🏆 Display top server members by level and wealth' },
    { name: 'balance', description: '💰 View your cash wallet and bank balance' },
    { name: 'daily', description: '🎁 Claim daily bonus credits ($500)' },
    { name: 'work', description: '💼 Work and earn money' },
    { name: 'inventory', description: '🎒 View items and treasures stored in your backpack', options: [{ name: 'user', type: 6, required: false, description: 'Target user' }] },
    { name: 'profile', description: '👤 View complete anime profile card, marriage, badges, and wealth', options: [{ name: 'user', type: 6, required: false, description: 'Target member' }] },
    { name: 'marry', description: '💍 Propose marriage to another member', options: [{ name: 'user', type: 6, required: true, description: 'Member to marry' }] },
    { name: 'divorce', description: '💔 End your current marriage' },
    { name: 'ship', description: '💘 Calculate love compatibility between two members', options: [{ name: 'user', type: 6, required: true, description: 'First user' }, { name: 'user2', type: 6, required: false, description: 'Second user' }] },
    { name: 'pet', description: '🐾 Manage, adopt, feed, and play with your companion pet', options: [{ name: 'action', type: 3, required: false, description: 'Action (adopt, feed, play)' }, { name: 'name', type: 3, required: false, description: 'Pet name or species' }] },
    { name: 'anime', description: '📺 Search anime synopsis, scores, and episodes on AniList', options: [{ name: 'title', type: 3, required: true, description: 'Anime title' }] },
    {
        name: 'setlanguage',
        description: '🌐 Change the server language or view the active language across 14 languages',
        default_member_permissions: ADMIN,
        options: [
            {
                name: 'language',
                type: 3,
                required: false,
                description: 'Select server language',
                choices: [
                    { name: '🇬🇧 English', value: 'en' },
                    { name: '🇪🇸 Español (Spanish)', value: 'es' },
                    { name: '🇧🇷 Português (Portuguese)', value: 'pt' },
                    { name: '🇯🇵 日本語 (Japanese)', value: 'ja' },
                    { name: '🇮🇳 हिन्दी (Hindi)', value: 'hi' },
                    { name: '🇫🇷 Français (French)', value: 'fr' },
                    { name: '🇩🇪 Deutsch (German)', value: 'de' },
                    { name: '🇷🇺 Русский (Russian)', value: 'ru' },
                    { name: '🇮🇩 Bahasa Indonesia', value: 'id' },
                    { name: '🇮🇹 Italiano (Italian)', value: 'it' },
                    { name: '🇻🇳 Tiếng Việt (Vietnamese)', value: 'vi' },
                    { name: '🇹🇷 Türkçe (Turkish)', value: 'tr' },
                    { name: '🇸🇦 العربية (Arabic)', value: 'ar' },
                    { name: '🇰🇷 한국어 (Korean)', value: 'ko' }
                ]
            }
        ]
    },
    {
        name: 'ticketsetup',
        description: '🎫 Setup and deploy the interactive support ticket panel in your server',
        default_member_permissions: ADMIN,
        options: [
            {
                name: 'channel',
                type: 7,
                channel_types: [0],
                required: false,
                description: 'Target channel to post the ticket panel (default: current channel)'
            },
            {
                name: 'role',
                type: 8,
                required: false,
                description: 'Support/Staff role with permission to view and claim tickets'
            },
            {
                name: 'category',
                type: 7,
                channel_types: [4],
                required: false,
                description: 'Category where newly created tickets will be opened'
            },
            {
                name: 'title',
                type: 3,
                required: false,
                description: 'Custom title for the ticket embed'
            },
            {
                name: 'description',
                type: 3,
                required: false,
                description: 'Custom description text for the ticket panel'
            }
        ]
    },
    {
        name: 'ticket',
        description: '🎫 Comprehensive ticket management system',
        options: [
            {
                name: 'setup',
                type: 1,
                description: 'Setup and deploy the interactive ticket panel',
                options: [
                    { name: 'channel', type: 7, channel_types: [0], required: false, description: 'Target channel' },
                    { name: 'role', type: 8, required: false, description: 'Support/Staff role' },
                    { name: 'category', type: 7, channel_types: [4], required: false, description: 'Ticket category' },
                    { name: 'title', type: 3, required: false, description: 'Panel title' },
                    { name: 'description', type: 3, required: false, description: 'Panel description' }
                ]
            },
            {
                name: 'close',
                type: 1,
                description: 'Close the current ticket channel',
                options: [
                    { name: 'reason', type: 3, required: false, description: 'Reason for closing ticket' }
                ]
            },
            {
                name: 'add',
                type: 1,
                description: 'Add a user to the current ticket',
                options: [
                    { name: 'user', type: 6, required: true, description: 'User to add' }
                ]
            },
            {
                name: 'remove',
                type: 1,
                description: 'Remove a user from the current ticket',
                options: [
                    { name: 'user', type: 6, required: true, description: 'User to remove' }
                ]
            },
            {
                name: 'claim',
                type: 1,
                description: 'Claim the current ticket as staff'
            },
            {
                name: 'transcript',
                type: 1,
                description: 'Generate and save a transcript of this ticket'
            },
            {
                name: 'delete',
                type: 1,
                description: 'Permanently delete this closed ticket channel'
            }
        ]
    },
    {
        name: 'applysetup',
        description: '📋 Spawn the server staff & partner application panel',
        default_member_permissions: ADMIN,
        options: [
            {
                name: 'channel',
                type: 7,
                channel_types: [0],
                required: false,
                description: 'Target channel for the application panel'
            }
        ]
    }
);

// 3. STRICT DEDUPLICATION ENGINE & DISCORD 100-COMMAND LIMIT ENFORCER
const commandMap = new Map();
commands.forEach(cmd => { 
    if (cmd) {
        const jsonCmd = typeof cmd.toJSON === 'function' ? cmd.toJSON() : cmd;
        if (jsonCmd.name) {
            // Enable User Install (0 = Guild, 1 = User) and all Contexts (0 = Guild, 1 = Bot DM, 2 = Private Channel)
            if (!jsonCmd.integration_types) {
                jsonCmd.integration_types = [0, 1];
            }
            if (!jsonCmd.contexts) {
                jsonCmd.contexts = [0, 1, 2];
            }
            commandMap.set(jsonCmd.name, jsonCmd);
        }
    }
});

// 🛡️ DISCORD OFFICIAL LIMITS:
// 1. Chat Input (Slash Commands): 100 maximum per application
// 2. User Context Menus: 5 maximum per application
// 3. Message Context Menus: 5 maximum per application
const MAX_CHAT_INPUT_LIMIT = 100;
const MAX_CONTEXT_LIMIT = 5;

const allCommands = Array.from(commandMap.values());
const chatInputList = allCommands.filter(c => !c.type || c.type === 1);
const userContextList = allCommands.filter(c => c.type === 2);
const msgContextList = allCommands.filter(c => c.type === 3);

if (chatInputList.length > MAX_CHAT_INPUT_LIMIT) {
    console.warn(`⚠️ [LIMIT GUARD] Chat input commands (${chatInputList.length}) exceed Discord hard limit of ${MAX_CHAT_INPUT_LIMIT}! Auto-capping to ${MAX_CHAT_INPUT_LIMIT} to prevent DiscordAPIError[30032]...`);
}

const safeChatInputs = chatInputList.slice(0, MAX_CHAT_INPUT_LIMIT);
const safeUserContext = userContextList.slice(0, MAX_CONTEXT_LIMIT);
const safeMsgContext = msgContextList.slice(0, MAX_CONTEXT_LIMIT);

const finalPayload = [...safeChatInputs, ...safeUserContext, ...safeMsgContext];
console.log(`📊 [COMMAND AUDIT] Prepared ${finalPayload.length} application commands (${safeChatInputs.length}/100 chat inputs, ${safeUserContext.length}/5 user context, ${safeMsgContext.length}/5 msg context).`);

// 4. GLOBAL DEPLOYMENT FUNCTION
async function deployCommands(client) {
    let cleanTokenFn = (t) => {
        if (!t) return '';
        let s = String(t).trim();
        if (s.includes('=')) s = s.split('=').slice(1).join('=').trim();
        return s.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').replace(/[\r\n\t]/g, '').trim().replace(/^["'`\u201C\u201D\u2018\u2019]+|["'`\u201C\u201D\u2018\u2019]+$/g, '').replace(/^Bot\s+/i, '');
    };
    try {
        const sanitizer = require('./src/utils/tokenSanitizer') || require('./utils/tokenSanitizer');
        if (sanitizer && sanitizer.cleanToken) cleanTokenFn = sanitizer.cleanToken;
    } catch (e) {}

    const token = cleanTokenFn(process.env.DISCORD_TOKEN || process.env.BOT_TOKEN || process.env.TOKEN || '');
    let clientId = process.env.CLIENT_ID || process.env.APPLICATION_ID;

    if (!token) throw new Error('🛑 CRITICAL: DISCORD_TOKEN, BOT_TOKEN, or TOKEN environment variable must be set.');

    if (!clientId) {
        try { 
            clientId = Buffer.from(token.split('.')[0], 'base64').toString('utf-8'); 
        } catch (e) {
            throw new Error('🛑 Could not parse CLIENT_ID from TOKEN.');
        }
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log(`🌍 [GLOBAL SYNC] Registering ${finalPayload.length} application commands globally across all servers...`);

        const result = await rest.put(Routes.applicationCommands(clientId), { body: finalPayload });
        console.log(`✅ Successfully deployed ${result.length} commands globally!`);

        return result;
    } catch (error) {
        console.error('❌ Discord API Rejected Command Payload:', error);
        throw error;
    }
}

if (require.main === module) {
    deployCommands()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('❌ Command deployment failed:', err);
            process.exit(1);
        });
}

module.exports = { commands: finalPayload, deployCommands };
