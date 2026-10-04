// ==========================================
// 🚀 MINA & STARRY SUPREME GLOBAL DEPLOY ENGINE
// File Path: deploy-commands.js
// Complete Global Slash Command Suite (Guaranteed Under 100 Discord Hard Limit)
// Restores all 47 original commands + Leveling + Socials + AI + Music + Economy
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

const commands = [];

// ==========================================
// 1. ORIGINAL CORE COMMANDS (47 COMMANDS)
// Preserves all original Moderation, Music, Utility, Tickets & Verification
// ==========================================
const ORIGINAL_COMMAND_FILES = [
    'moderation/automod.js',
    'moderation/ban.js',
    'moderation/clearwarns.js',
    'moderation/delwarn.js',
    'moderation/kick.js',
    'moderation/lock.js',
    'moderation/modlogs.js',
    'moderation/nuke.js',
    'moderation/purge.js',
    'moderation/slowmode.js',
    'moderation/timeout.js',
    'moderation/unban.js',
    'moderation/unlock.js',
    'moderation/untimeout.js',
    'moderation/warn.js',
    'moderation/warnings.js',
    'music/autoplay.js',
    'music/djpanel.js',
    'music/loop.js',
    'music/nowplaying.js',
    'music/pause.js',
    'music/play.js',
    'music/queue.js',
    'music/resume.js',
    'music/skip.js',
    'music/stop.js',
    'music/summon.js',
    'music/volume.js',
    'tickets/ticketsetup.js',
    'utility/afk.js',
    'utility/announce.js',
    'utility/avatar.js',
    'utility/banner.js',
    'utility/botavatar.js',
    'utility/botbanner.js',
    'utility/botinfo.js',
    'utility/botprofile.js',
    'utility/devpanel.js',
    'utility/help.js',
    'utility/leaveserver.js',
    'utility/ping.js',
    'utility/poll.js',
    'utility/prefix.js',
    'utility/serverinfo.js',
    'utility/userinfo.js',
    'verification/verifysetup.js',
    'verification/videoverifysetup.js'
];

for (const rel of ORIGINAL_COMMAND_FILES) {
    const mod = safeRequire([`./src/commands/${rel}`, `./commands/${rel}`]);
    if (mod && mod.data) {
        const json = typeof mod.data.toJSON === 'function' ? mod.data.toJSON() : mod.data;
        if (json && json.name) {
            commands.push(json);
        }
    }
}

// ==========================================
// 2. LEVELING SUITE (4 COMMANDS)
// Server-wide controls, toggle, rank card, leaderboard
// ==========================================
commands.push(
    new SlashCommandBuilder()
        .setName('leveling')
        .setDescription('⚙️ Manage and toggle server-wide leveling system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub.setName('toggle').setDescription('Toggle leveling system on or off'))
        .addSubcommand(sub => sub.setName('panel').setDescription('Open interactive leveling control panel'))
        .addSubcommand(sub => 
            sub.setName('channel')
                .setDescription('Set or clear level-up announcement channel')
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel for notifications (leave empty to reset to active)').setRequired(false))
        )
        .addSubcommand(sub => sub.setName('preview').setDescription('Live preview of level-up card'))
        .toJSON(),

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

    new SlashCommandBuilder()
        .setName('rank')
        .setDescription('👑 Check user level and XP ranking')
        .addUserOption(opt => opt.setName('user').setDescription('Target user to check rank for').setRequired(false))
        .toJSON(),

    new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('🏆 Display top server members by level and wealth')
        .toJSON()
);

// ==========================================
// 3. ANIME SOCIAL SUITE (6 COMMANDS)
// Universal /social hub + top 5 direct anime action slash commands
// Direct actions execute immediately without showing the menu!
// ==========================================
const socialModule = safeRequire(['./src/modules/socialActions', './modules/socialActions']);
if (socialModule && socialModule.socialCommandPayload) {
    commands.push(socialModule.socialCommandPayload);
} else {
    commands.push(
        new SlashCommandBuilder()
            .setName('social')
            .setDescription('✨ Anime Social Actions: Interact with members using animated anime GIFs')
            .addSubcommand(sub => sub.setName('menu').setDescription('Open the interactive anime social actions menu'))
            .toJSON()
    );
}

const TOP_DIRECT_SOCIAL_ACTIONS = ['hug', 'kiss', 'pat', 'slap', 'cuddle'];
for (const act of TOP_DIRECT_SOCIAL_ACTIONS) {
    commands.push(
        new SlashCommandBuilder()
            .setName(act)
            .setDescription(`${act.charAt(0).toUpperCase() + act.slice(1)} a member with an animated anime GIF!`)
            .setContexts([0, 1, 2])
            .setIntegrationTypes([0, 1])
            .addUserOption(opt => 
                opt.setName('target')
                   .setDescription('Target member')
                   .setRequired(true)
            )
            .toJSON()
    );
}

// ==========================================
// 4. AI & CREATIVE SUITE (5 COMMANDS)
// ==========================================
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
        .toJSON()
);

// ==========================================
// 5. SERVER MANAGEMENT & ECONOMY SUITE (18 COMMANDS)
// ==========================================
const autoroleOptions = [
    { name: 'sticky_roles', type: 5, required: false, description: 'Enable or disable restoring previous roles on rejoin' }
];
for (let i = 1; i <= 10; i++) {
    autoroleOptions.push({ name: `role${i}`, type: 8, required: false, description: `Select role #${i} to add to the autorole list` });
}

commands.push(
    {
        name: 'autorole',
        description: 'Set up multiple autoroles for when members join',
        default_member_permissions: ADMIN,
        options: autoroleOptions
    },
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

    {
        name: 'ticket',
        description: '🎫 Comprehensive ticket management system',
        options: [
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
            }
        ]
    },

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

// ==========================================
// 6. MESSAGE CONTEXT MENUS (2 COMMANDS)
// ==========================================
commands.push(
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
);

const translatorModule = safeRequire(['./src/modules/translator', './modules/translator']);
if (translatorModule && translatorModule.translateContextPayload) {
    commands.push(translatorModule.translateContextPayload);
}

// ==========================================
// 7. STRICT DEDUPLICATION ENGINE & DISCORD 100-COMMAND LIMIT ENFORCER
// ==========================================
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

// ==========================================
// 8. GLOBAL DEPLOYMENT FUNCTION
// ==========================================
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
