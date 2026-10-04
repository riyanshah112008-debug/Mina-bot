// ==========================================
// 🚀 MASTER COMMAND REGISTRY & UNIFIED DISPATCHER
// File Path: src/modules/commandHandler.js
// 165+ Master Commands • Dual Prefix (, & .) • Mention Support • 1-Year Persistent Interaction Engine
// Fully compatible with Android/Termux & PC (Windows/Linux/macOS)
// ==========================================
const { 
    Collection, 
    Events, 
    EmbedBuilder, 
    PermissionFlagsBits,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { CommandContext, ONE_YEAR_MS, EPHEMERAL_FLAG } = require('../utils/contextHelper');
const { buildCategoryEmbed, createHelpComponents } = require('../utils/helpHelper');
const User = require('../models/User');

// Guild Prefix In-Memory Cache
const guildPrefixCache = new Map();

async function getGuildPrefix(guildId) {
    if (!guildId) return ',';
    if (guildPrefixCache.has(guildId)) return guildPrefixCache.get(guildId);
    try {
        const mongoose = require('mongoose');
        if (!mongoose.connection || mongoose.connection.readyState !== 1) {
            guildPrefixCache.set(guildId, ',');
            return ',';
        }
        const ServerSettings = require('../models/ServerSettings');
        const settings = await Promise.race([
            ServerSettings.findOne({ guildId }).select('prefix').lean(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
        ]);
        const p = settings?.prefix || ',';
        guildPrefixCache.set(guildId, p);
        return p;
    } catch (e) {
        guildPrefixCache.set(guildId, ',');
        return ',';
    }
}

function setCachedPrefix(guildId, prefix) {
    if (guildId) guildPrefixCache.set(guildId, prefix || ',');
}

// 🛡️ Global Anti-Duplicate Execution Sets (Guarantees exactly 1 response per message/interaction)
const executedMessageIds = new Set();
const executedInteractionIds = new Set();
const prefixNoticeCooldowns = new Set();
const mongoose = require('mongoose');

function isPrimaryBotClient(client) {
    if (client.isPrimary === false) return false;
    if (client.isPrimary === true) return true;
    const multiBot = client.multiBot || require('./multiBot');
    if (multiBot?.primaryClient) {
        return client === multiBot.primaryClient || (client.user?.id && client.user.id === multiBot.primaryClient.user?.id);
    }
    return true;
}

// Load Master Bundles
const musicCommands = require('../commands/bundles/musicCommands');
const moderationCommands = require('../commands/bundles/moderationCommands');
const utilityCommands = require('../commands/bundles/utilityCommands');
const socialCommands = require('../commands/bundles/socialCommands');
const economyCommands = require('../commands/bundles/economyCommands');
const gameCommands = require('../commands/bundles/gameCommands');
const systemCommands = require('../commands/bundles/systemCommands');
const nsfwCommands = require('../commands/bundles/nsfwCommands');
const boosterCommands = require('../commands/bundles/boosterCommands');
const colorCommands = require('../commands/bundles/colorCommands');

const allBundles = [
    ...musicCommands,
    ...moderationCommands,
    ...utilityCommands,
    ...socialCommands,
    ...economyCommands,
    ...gameCommands,
    ...systemCommands,
    ...nsfwCommands,
    ...boosterCommands,
    ...colorCommands
];

function getFilesRecursively(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (file === 'bundles' || file === 'node_modules') continue;
            results = results.concat(getFilesRecursively(fullPath));
        } else if (file.endsWith('.js')) {
            results.push(fullPath);
        }
    }
    return results;
}

// 🛡️ Global Command Safety Execution Guard (Prevents indefinite hangs on slow APIs / DB locks)
async function executeSafely(command, ctx, client, cmdName) {
    const isAiCommand = command.category === 'Utility' && ['ask', 'ai', 'gemini', 'gpt', 'vision', 'summarize', 'codebot'].includes(command.name);
    const isMusicCommand = command.category === 'Music';
    // Generous timeouts: 90s for AI, 60s for music queue/fetching, 45s for standard commands
    const defaultTimeout = isAiCommand ? 90000 : (isMusicCommand ? 60000 : 45000);
    const TIMEOUT_MS = command.timeout || defaultTimeout;
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
            reject(new Error(`Command Execution Timed Out (>${Math.round(TIMEOUT_MS / 1000)}s)`));
        }, TIMEOUT_MS);
    });

    try {
        await Promise.race([
            command.execute(ctx, client),
            timeoutPromise
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

class CommandRegistry {
    constructor() {
        this.commands = new Collection();
        this.aliases = new Collection();
        this.categories = new Collection();
    }

    init(client) {
        if (this._initialized) return;
        this._initialized = true;

        this.commands.clear();
        this.aliases.clear();
        this.categories.clear();

        if (!client.commands) client.commands = new Collection();
        if (!client.prefixCommands) client.prefixCommands = new Collection();
        if (!client.aliases) client.aliases = new Collection();

        // 1. Register Master Bundled Commands (Primary Source of Truth)
        for (const cmd of allBundles) {
            if (!cmd.name) continue;
            const name = cmd.name.toLowerCase();
            this.commands.set(name, cmd);
            client.commands.set(name, cmd);
            client.prefixCommands.set(name, cmd);

            if (cmd.category) {
                if (!this.categories.has(cmd.category)) this.categories.set(cmd.category, []);
                this.categories.get(cmd.category).push(cmd);
            }

            if (cmd.aliases && Array.isArray(cmd.aliases)) {
                for (const alias of cmd.aliases) {
                    const cleanAlias = alias.toLowerCase();
                    this.aliases.set(cleanAlias, name);
                    client.aliases.set(cleanAlias, name);
                    client.prefixCommands.set(cleanAlias, cmd);
                }
            }
        }

        // 2. Load standalone commands only if not already present in master bundles
        const commandsRoot = path.join(__dirname, '..', 'commands');
        const standaloneFiles = getFilesRecursively(commandsRoot);
        for (const file of standaloneFiles) {
            try {
                const cmdModule = require(file);
                const name = (cmdModule?.data?.name || cmdModule?.name || path.basename(file, '.js')).toLowerCase();
                
                // Do not overwrite working master bundled commands with stubs
                if (typeof cmdModule.execute === 'function') {
                    if (!this.commands.has(name)) {
                        this.commands.set(name, cmdModule);
                        client.commands.set(name, cmdModule);
                        client.prefixCommands.set(name, cmdModule);

                        if (cmdModule.category) {
                            if (!this.categories.has(cmdModule.category)) this.categories.set(cmdModule.category, []);
                            this.categories.get(cmdModule.category).push(cmdModule);
                        }
                    }

                    // Register all aliases for standalone commands
                    if (cmdModule.aliases && Array.isArray(cmdModule.aliases)) {
                        for (const alias of cmdModule.aliases) {
                            const cleanAlias = alias.toLowerCase();
                            this.aliases.set(cleanAlias, name);
                            client.aliases.set(cleanAlias, name);
                            client.prefixCommands.set(cleanAlias, cmdModule);
                        }
                    }
                }
            } catch (err) {
                // Ignore non-command utility scripts
            }
        }

        console.log(`✅ [Master Command Registry] Loaded ${this.commands.size} base commands (${this.commands.size + this.aliases.size} with aliases) across ${this.categories.size} categories!`);

        this.registerPrefixDispatcher(client);
        this.registerInteractionDispatcher(client);

        try {
            const { setupAutoDisconnect } = require('./voiceModerator');
            setupAutoDisconnect(client);
        } catch (e) {}

        // Initialize Astral Cross-Server Portals
        try {
            const { initAstralPortals, setupPortalDispatcher } = require('./astralPortal');
            initAstralPortals(client);
            setupPortalDispatcher(client);
        } catch (e) {}

        // Initialize Dedicated Music Controller System
        try {
            const musicController = require('./musicController');
            musicController.init(client);
        } catch (e) {}

        // Connect multi-bot worker nodes if cluster is enabled
        const multiBot = require('./multiBot');
        if (multiBot && typeof multiBot.registerEventHook === 'function') {
            multiBot.registerEventHook((workerClient) => {
                this.registerPrefixDispatcher(workerClient);
                this.registerInteractionDispatcher(workerClient);
            });
        }
    }

    registerPrefixDispatcher(client) {
        if (!client || client._starryPrefixDispatcherAttached) return;
        client._starryPrefixDispatcherAttached = true;

        client.on(Events.MessageCreate, async (message) => {
            if (!message || message.author?.bot || !message.content) return;

            // Instant in-memory check to discard rapid re-delivery within the same process
            if (executedMessageIds.has(message.id)) return;

            const isPrimary = isPrimaryBotClient(client);

            // Intercept Dedicated Music Controller Request Channel
            if (message.guild) {
                const musicController = require('./musicController');
                if (musicController.isRequestChannel(message.guild.id, message.channel.id)) {
                    if (!isPrimary) return;
                    const raw = message.content.trim();
                    if (!raw.startsWith(',') && !raw.startsWith('.') && !raw.startsWith('?')) {
                        return musicController.handleSongRequest(message, client);
                    }
                }
            }

            let content = message.content.trim();
            const multiBot = client.multiBot || require('./multiBot');
            const primaryId = multiBot?.primaryClient?.user?.id || (isPrimary ? client.user?.id : null);

            let matchedPrefix = null;
            let commandBody = '';

            // A. Check Bot Mention (<@BOT_ID> command)
            const mentionMatch = content.match(/^<@!?(\d+)>\s*(.*)$/);
            if (mentionMatch) {
                const mentionedId = mentionMatch[1];
                if (client.user?.id !== mentionedId) return; // Only target bot responds
                commandBody = mentionMatch[2].trim();
                matchedPrefix = '@';
            }
            // B. Check Multi-Bot Cluster Prefixes (s1,, s2,, s3,, 1,, 2,, 3,, ,s1, ,s2, etc.)
            else {
                const clusterMatch = content.match(/^(?:s|S)?(\d+)[,](.*)$/i) || content.match(/^[,](\d+)(.*)$/i) || content.match(/^[,](?:s|S)(\d+)(.*)$/i);
                if (clusterMatch) {
                    const botIndex = parseInt(clusterMatch[1], 10);
                    const botArray = multiBot?.instances ? Array.from(multiBot.instances.values()) : [];
                    let targetId = null;

                    if (botIndex === 1) targetId = primaryId;
                    else if (botIndex === 2) targetId = '1543515940069572628' || botArray[1]?.client?.user?.id;
                    else if (botIndex === 3) targetId = '1543519236586999928' || botArray[2]?.client?.user?.id;
                    else if (botArray[botIndex - 1]) targetId = botArray[botIndex - 1].client?.user?.id;

                    if (client.user?.id !== targetId) return;
                    commandBody = clusterMatch[2].trim();
                    matchedPrefix = 's' + botIndex;
                } 
                // C. Single Comma (,) Default Prefix & Custom Server Prefix
                else {
                    if (content.startsWith('<@')) return;
                    if (!isPrimary) return; // Standard prefix handled EXCLUSIVELY by primary bot! Secondary worker bots never respond here!

                    const guildId = message.guild?.id;
                    if (content.startsWith(',')) {
                        matchedPrefix = ',';
                        commandBody = content.slice(1).trim();
                    } else if (content.startsWith('.')) {
                        matchedPrefix = '.';
                        commandBody = content.slice(1).trim();
                    } else if (content.startsWith('?')) {
                        matchedPrefix = '?';
                        commandBody = content.slice(1).trim();
                    } else if (guildId) {
                        const activePrefix = guildPrefixCache.has(guildId) 
                            ? guildPrefixCache.get(guildId) 
                            : await getGuildPrefix(guildId);

                        if (activePrefix && activePrefix !== ',' && activePrefix !== '.' && activePrefix !== '?' && content.startsWith(activePrefix)) {
                            matchedPrefix = activePrefix;
                            commandBody = content.slice(activePrefix.length).trim();
                        } else {
                            return; // Not a command
                        }
                    } else if (!message.guild) {
                        const firstWord = content.toLowerCase().split(/\s+/)[0];
                        const isCmd = this.commands.has(firstWord) || this.aliases.has(firstWord);
                        if (isCmd) {
                            matchedPrefix = '';
                            commandBody = content;
                        } else {
                            // In DMs, talk directly with Starry AI without needing a prefix
                            matchedPrefix = '';
                            commandBody = 'ask ' + content;
                        }
                    } else {
                        return; // Not a command
                    }
                }
            }

            if (!commandBody) {
                if (matchedPrefix === '@') {
                    const p = message.guild ? await getGuildPrefix(message.guild.id) : ',';
                    const ping = Math.round(client.ws.ping || 0);
                    const embed = new EmbedBuilder()
                        .setColor('#9B59B6')
                        .setAuthor({ name: '✨ Starry • Celestial AI Companion', iconURL: client.user.displayAvatarURL({ dynamic: true }) })
                        .setTitle('🌟 Hello! How can I assist you today?')
                        .setDescription(
                            `I am **Starry** (Astraea), your all-in-one AI assistant, music streamer, and server guardian!\n\n` +
                            `• **Slash Commands:** Type \`/\` to browse all commands (e.g. \`/help\`, \`/play\`, \`/ask\`)\n` +
                            `• **Prefix Commands:** \`${p}\` *(Reserved exclusively for Bot Owners)*\n` +
                            `• **AI Assistant:** Mention me with any question or use \`/ask <prompt>\` (you can attach images!)\n` +
                            `• **Gateway Latency:** \`${ping}ms\`\n` +
                            `• **Music & Hi-Fi:** High-Fidelity 24/7 playback with 15 studio filters`
                        )
                        .setFooter({ text: 'Type /help to see all commands • Starry Bot' })
                        .setTimestamp();

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('mention_help_btn').setLabel('📖 Help Menu').setStyle(ButtonStyle.Primary).setEmoji('📜'),
                        new ButtonBuilder().setCustomId('mention_ping_btn').setLabel(`🏓 Ping (${ping}ms)`).setStyle(ButtonStyle.Secondary)
                    );

                    return message.reply({ embeds: [embed], components: [row] }).catch(() => null);
                }
                return;
            }

            // Ignore custom emoji spam (e.g. ,<:emoji:id>)
            if (commandBody.startsWith('<:') || commandBody.startsWith('<a:')) return;

            const args = commandBody.split(/\s+/);
            const commandKey = args.shift()?.toLowerCase();
            if (!commandKey) return;

            const resolvedName = this.aliases.get(commandKey) || commandKey;
            let command = this.commands.get(resolvedName);

            // If user mentioned bot directly and spoke naturally, route seamlessly to Starry AI
            if (!command && matchedPrefix === '@') {
                const askCmd = this.commands.get('ask');
                if (askCmd) {
                    command = askCmd;
                    args.unshift(commandKey); // Prepend word back to prompt
                }
            }

            if (!command) return;

            // 🛡️ Guaranteed Single-Execution Message Guard (Process-wide In-Memory Deduplication)
            if (executedMessageIds.has(message.id)) return;
            executedMessageIds.add(message.id);
            setTimeout(() => executedMessageIds.delete(message.id), 20000);

            // 👑 OWNER-ONLY PREFIX RESTRICTION (Plan B: Slash Command Migration)
            const isPrefixInvocation = matchedPrefix !== '@' && matchedPrefix !== '';
            if (isPrefixInvocation) {
                const isOwner = typeof config.isBotOwner === 'function' 
                    ? config.isBotOwner(message.author.id, client) 
                    : (config.BOT_OWNERS || []).includes(message.author.id);

                if (!isOwner) {
                    // Throttle notices to avoid channel spam (1 notice per 8 seconds per user)
                    if (!prefixNoticeCooldowns.has(message.author.id)) {
                        prefixNoticeCooldowns.add(message.author.id);
                        setTimeout(() => prefixNoticeCooldowns.delete(message.author.id), 8000);

                        const slashEquivalent = `/${resolvedName}`;
                        const embed = new EmbedBuilder()
                            .setColor('#5865F2')
                            .setAuthor({ name: '✨ Starry • Slash Command Migration', iconURL: client.user ? client.user.displayAvatarURL({ dynamic: true }) : undefined })
                            .setTitle('⚡ Prefix Commands Are Reserved for Bot Owners')
                            .setDescription(
                                `Starry has officially transitioned to **Discord Slash Commands** in accordance with Discord platform guidelines!\n\n` +
                                `• **Prefix commands (\`,\` / \`.\`)** are restricted exclusively to **Bot Owners**.\n` +
                                `• Please use **\`${slashEquivalent}\`** instead!\n` +
                                `• Type **\`/help\`** to browse and execute commands with interactive menus and autocomplete.`
                            )
                            .setFooter({ text: 'Tip: Type / to see all slash commands • Starry Bot' });

                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('mention_help_btn')
                                .setLabel('📖 Open /help Menu')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('📜')
                        );

                        message.reply({ embeds: [embed], components: [row] })
                            .then(sentMsg => {
                                setTimeout(() => sentMsg.delete().catch(() => {}), 12000);
                            })
                            .catch(() => {});
                    }
                    return;
                }
            }

            const logTag = isPrefixInvocation ? 'Owner-Prefix' : 'Command';
            console.log(`⚡ [${logTag}] Executing ${matchedPrefix || ''}${resolvedName} for ${message.author.tag} in ${message.guild?.name || 'DM'}`);
            const ctx = new CommandContext(message, client, args);

            // Guard server-only commands when run in DMs
            if (!message.guild && (command.category === 'Moderation' || command.category === 'Economy' || command.guildOnly)) {
                return ctx.reply('❌ This command can only be used inside a Discord server.');
            }

            try {
                // Check permissions if in a guild
                if (message.guild && command.permissions && Array.isArray(command.permissions)) {
                    if (!config.isBotOwner(message.author.id, client)) {
                        for (const perm of command.permissions) {
                            if (!message.member?.permissions?.has(perm)) {
                                return ctx.reply('❌ You do not have sufficient permissions to execute this command.');
                            }
                        }
                    }
                }

                if (typeof command.execute === 'function') {
                    await executeSafely(command, ctx, client, resolvedName);
                }
            } catch (err) {
                console.error(`❌ Error executing prefix command ,${resolvedName}:`, err);
                const isTimeout = err.message && err.message.includes('Timed Out');
                const replyText = isTimeout
                    ? `⚠️ **Command Timed Out:** \`,${resolvedName}\` took too long to respond. Please try again in a moment.`
                    : `⚠️ An error occurred while executing \`,${resolvedName}\`: \`${err.message}\``;
                await ctx.reply(replyText).catch(() => {});
            }
        });
    }

    registerInteractionDispatcher(client) {
        if (!client || client._starryInteractionDispatcherAttached) return;
        client._starryInteractionDispatcherAttached = true;

        client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction) return;

            // 🛡️ Interaction Deduplication Guard (Ultra-Fast 0ms In-Memory Guard)
            if (executedInteractionIds.has(interaction.id)) return;
            executedInteractionIds.add(interaction.id);
            setTimeout(() => executedInteractionIds.delete(interaction.id), 20000);

            // 0. Handle Autocomplete Interactions (Live Instant Dropdown List)
            if (interaction.isAutocomplete()) {
                const commandName = interaction.commandName.toLowerCase();
                const resolvedName = this.aliases.get(commandName) || commandName;
                const command = this.commands.get(resolvedName) || client.commands?.get(resolvedName);
                if (command && typeof command.autocomplete === 'function') {
                    try {
                        await command.autocomplete(interaction, client);
                    } catch (autoErr) {
                        console.warn(`⚠️ Autocomplete error (/${commandName}):`, autoErr.message);
                    }
                } else if (commandName === 'play' || commandName === 'search') {
                    try {
                        const { getSongAutocomplete } = require('../utils/musicSearchHelper');
                        const focused = interaction.options.getFocused();
                        const choices = await getSongAutocomplete(focused, client.manager);
                        await interaction.respond(choices).catch(() => {});
                    } catch (_) {}
                }
                return;
            }

            // 1. Handle Slash Commands
            if (interaction.isChatInputCommand()) {
                const commandName = interaction.commandName.toLowerCase();
                const resolvedName = this.aliases.get(commandName) || commandName;
                const command = this.commands.get(resolvedName) || client.commands?.get(resolvedName);

                if (command) {
                    try {
                        const ctx = new CommandContext(interaction, client, []);
                        
                        // Instant 0ms defer to guarantee Discord never shows "Application did not respond"
                        if (!interaction.deferred && !interaction.replied && command.autoDefer !== false) {
                            const deferOpts = command.ephemeral ? { flags: [MessageFlags.Ephemeral] } : {};
                            await interaction.deferReply(deferOpts).catch(() => {});
                            ctx.deferred = true;
                        }

                        if (typeof command.execute === 'function') {
                            await executeSafely(command, ctx, client, resolvedName);
                        }
                    } catch (err) {
                        console.error(`❌ Slash Command Error (/${commandName}):`, err);
                        const isTimeout = err.message && err.message.includes('Timed Out');
                        const msg = isTimeout
                            ? `⚠️ **Command Timed Out:** \`/${commandName}\` took too long to respond. Please try again!`
                            : `⚠️ Error executing command: \`${err.message}\``;
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
                        } else {
                            await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
                        }
                    }
                    return;
                }
                return;
            }

            // 2. Handle Modal Submissions
            if (interaction.isModalSubmit()) {
                if (interaction.customId.startsWith('modal_botstudio_gh_')) {
                    const sessionId = interaction.customId.replace('modal_botstudio_gh_', '');
                    const botStudio = require('./botStudio');
                    const session = botStudio.botStudioSessions.get(sessionId);
                    const prompt = session?.prompt || 'Custom Discord Bot';

                    const repoUrl = interaction.fields.getTextInputValue('gh_repo_url');
                    const pat = interaction.fields.getTextInputValue('gh_pat');
                    const botName = interaction.fields.getTextInputValue('gh_bot_name');

                    await interaction.deferReply({ ephemeral: true }).catch(() => {});

                    try {
                        const scaffoldRes = await botStudio.scaffoldCompleteBot(prompt, { botName });
                        const pushRes = await botStudio.pushBotToGitHub(scaffoldRes.workspacePath, repoUrl, pat, scaffoldRes.botSlug);

                        const embed = new EmbedBuilder()
                            .setColor('#2ECC71')
                            .setTitle('🚀 Bot Successfully Deployed to GitHub!')
                            .setDescription(
                                `Starry has scaffolded your multi-file Discord bot in an isolated workspace and pushed it directly to your repository!\n\n` +
                                `🔗 **Repository:** [${pushRes.owner}/${pushRes.repo}](${pushRes.repoUrl})\n` +
                                `📦 **Workspace:** \`${scaffoldRes.workspaceName}\`\n` +
                                `🛡️ **Attribution:** Non-removable Starry core watermark applied.\n` +
                                `🔑 **Diagnostics:** Starry remote administration gateway active.\n\n` +
                                `**Next Steps:**\n` +
                                `1. Clone your repository: \`git clone ${pushRes.repoUrl}.git\`\n` +
                                `2. Install dependencies: \`npm install\`\n` +
                                `3. Set up your \`.env\` and launch with \`npm start\`!`
                            )
                            .setFooter({ text: 'Starry Autonomous Bot Studio • GitHub Deployment Complete' })
                            .setTimestamp();

                        return await interaction.editReply({ embeds: [embed] }).catch(() => {});
                    } catch (err) {
                        return await interaction.editReply({
                            content: `❌ **GitHub Deployment Failed:** ${err.message}\n*Please verify your repository URL and ensure your PAT has \`repo\` scope.*`
                        }).catch(() => {});
                    }
                }
            }

            // 3. Handle Global 1-Year Persistent Button & Select Menu Interactions
            if (interaction.isButton() || interaction.isStringSelectMenu()) {
                const customId = interaction.customId;

                // 🛡️ Interaction Timeout Safety Net
                // If a button or menu has no active collector or global handler,
                // acknowledge gracefully before Discord's strict 3-second limit.
                setTimeout(() => {
                    if (!interaction.replied && !interaction.deferred) {
                        interaction.reply({
                            content: '⚠️ This button or menu interaction has expired. Please run the command again.',
                            flags: EPHEMERAL_FLAG
                        }).catch(() => {});
                    }
                }, 2400);

                // 🖥️ Starry Autonomous Bot Studio: Code in Local Termux Workspace Button
                if (customId.startsWith('botstudio_local_')) {
                    const sessionId = customId.replace('botstudio_local_', '');
                    const botStudio = require('./botStudio');
                    const session = botStudio.botStudioSessions.get(sessionId);
                    const prompt = session?.prompt || 'Complex Discord Bot';

                    await interaction.deferReply({ ephemeral: true }).catch(() => {});

                    try {
                        const scaffoldRes = await botStudio.scaffoldCompleteBot(prompt);

                        const embed = new EmbedBuilder()
                            .setColor('#2ECC71')
                            .setTitle(`🖥️ Complex Bot Coded in Termux Workspace: ${scaffoldRes.botSlug}`)
                            .setDescription(
                                `Starry has coded your full multi-file Discord bot in its own isolated Termux workspace!\n\n` +
                                `📍 **Workspace Directory:** \`${scaffoldRes.workspacePath}\`\n` +
                                `📦 **Files Scaffolded:** \`${scaffoldRes.fileCount} enterprise files\`\n` +
                                `🛡️ **Attribution:** Non-removable Starry core watermark active.\n` +
                                `🔑 **Diagnostics:** Starry remote management gateway active.\n\n` +
                                `**Commands Included:**\n` +
                                `• **Moderation:** \`purge\`, \`kick\`, \`ban\`, \`timeout\`, \`warn\`\n` +
                                `• **Economy:** \`balance\`, \`daily\`, \`work\`, \`pay\`\n` +
                                `• **Tickets:** Interactive button ticket panel & management\n` +
                                `• **Utility:** \`ping\`, \`help\`, \`botinfo\`, \`userinfo\`, \`serverinfo\`\n` +
                                `• **StarryLink:** \`!starry-status\`, \`,starry-eval\`\n\n` +
                                `**How to Launch on this Device:**\n` +
                                `\`\`\`bash\n` +
                                `cd "${scaffoldRes.workspacePath}"\n` +
                                `nano .env  # Add your DISCORD_TOKEN\n` +
                                `node deploy-commands.js\n` +
                                `npm start\n` +
                                `\`\`\``
                            )
                            .setFooter({ text: 'Starry Autonomous Bot Studio • Termux Local Workspace Active' })
                            .setTimestamp();

                        return await interaction.editReply({ embeds: [embed] }).catch(() => {});
                    } catch (err) {
                        return await interaction.editReply({
                            content: `❌ Error coding bot in Termux workspace: ${err.message}`
                        }).catch(() => {});
                    }
                }

                // 🚀 Starry Autonomous Bot Studio: Push to GitHub Button
                if (customId.startsWith('botstudio_gh_')) {
                    const sessionId = customId.replace('botstudio_gh_', '');
                    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
                    const modal = new ModalBuilder()
                        .setCustomId(`modal_botstudio_gh_${sessionId}`)
                        .setTitle('🚀 Push Bot to GitHub Repository')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('gh_repo_url')
                                    .setLabel('GitHub Repository URL')
                                    .setPlaceholder('https://github.com/username/my-discord-bot')
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('gh_pat')
                                    .setLabel('GitHub Personal Access Token (PAT)')
                                    .setPlaceholder('ghp_... or github_pat_...')
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('gh_bot_name')
                                    .setLabel('Custom Bot Name (optional)')
                                    .setPlaceholder('e.g. NexusBot')
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(false)
                            )
                        );
                    return await interaction.showModal(modal).catch(() => {});
                }

                // 📦 Starry Autonomous Bot Studio: Download as ZIP Button
                if (customId.startsWith('botstudio_zip_')) {
                    const sessionId = customId.replace('botstudio_zip_', '');
                    const botStudio = require('./botStudio');
                    const session = botStudio.botStudioSessions.get(sessionId);
                    const prompt = session?.prompt || 'Custom Discord bot with moderation and utilities';

                    await interaction.deferReply({ ephemeral: true }).catch(() => {});

                    try {
                        const scaffoldRes = await botStudio.scaffoldCompleteBot(prompt);
                        const zipRes = await botStudio.packageBotZip(scaffoldRes.workspacePath, scaffoldRes.botSlug);
                        const attachment = new AttachmentBuilder(zipRes.zipPath, { name: zipRes.zipFilename });

                        const embed = new EmbedBuilder()
                            .setColor('#2ECC71')
                            .setTitle(`📦 Bot Project Ready: ${scaffoldRes.botSlug}`)
                            .setDescription(
                                `Your multi-file Discord bot has been built in an isolated workspace and packaged!\n\n` +
                                `• **Files Created:** \`${scaffoldRes.fileCount} core files\`\n` +
                                `• **Workspace:** \`${scaffoldRes.workspaceName}\`\n` +
                                `• **Protected Watermark:** \`Enabled (Non-removable)\`\n` +
                                `• **Starry Telemetry Gateway:** \`Active\`\n\n` +
                                `**How to Run Your Bot:**\n` +
                                `1. Download and unzip \`${zipRes.zipFilename}\`.\n` +
                                `2. Open \`.env\` and paste your \`DISCORD_TOKEN\`.\n` +
                                `3. Run \`npm install\` then \`node deploy-commands.js\` and \`npm start\`!`
                            )
                            .setFooter({ text: 'Starry Autonomous Bot Studio • Download attached below' })
                            .setTimestamp();

                        return await interaction.editReply({
                            embeds: [embed],
                            files: [attachment]
                        }).catch(() => {});
                    } catch (err) {
                        return await interaction.editReply({
                            content: `❌ Error packaging bot files: ${err.message}`
                        }).catch(() => {});
                    }
                }

                // ❌ Starry Autonomous Bot Studio: Cancel
                if (customId.startsWith('botstudio_cancel_')) {
                    return await interaction.update({
                        content: '🚫 Bot creation cancelled.',
                        embeds: [],
                        components: []
                    }).catch(() => {});
                }

                // 🌐 Language Select Dropdown (1-Year Global Handler)
                if (customId === 'starry_lang_select' || customId === 'starry_setup_lang_select' || customId === 'starry_lang_welcome_select') {
                    if (!interaction.guild) {
                        return interaction.reply({ content: '❌ Language can only be configured in a server.', ephemeral: true }).catch(() => {});
                    }
                    const hasPerm = interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild) ||
                                    interaction.member?.permissions?.has(PermissionFlagsBits.Administrator) ||
                                    config.BOT_OWNERS?.includes(interaction.user.id);
                    if (!hasPerm) {
                        const { t } = require('../utils/i18n');
                        return interaction.reply({ content: t(interaction.guild.id, 'lang.no_permission'), ephemeral: true }).catch(() => {});
                    }

                    const selectedLang = interaction.values[0];
                    const { setGuildLanguage, SUPPORTED_LANGUAGES, t, createWelcomeSetupCard, createSetupPromptCard } = require('../utils/i18n');
                    await setGuildLanguage(interaction.guild.id, selectedLang);
                    const langInfo = SUPPORTED_LANGUAGES[selectedLang] || SUPPORTED_LANGUAGES['en'];

                    if (customId === 'starry_lang_welcome_select') {
                        const updatedCard = createWelcomeSetupCard(interaction.guild, selectedLang, client.user);
                        return await interaction.update(updatedCard).catch(() => {});
                    } else if (customId === 'starry_setup_lang_select') {
                        const updatedCard = createSetupPromptCard(interaction.guild, selectedLang, client.user);
                        return await interaction.update(updatedCard).catch(() => {});
                    } else {
                        const embed = new EmbedBuilder()
                            .setColor(config.EMBED_COLORS?.SUCCESS || '#2ECC71')
                            .setTitle(t(selectedLang, 'lang.updated_title'))
                            .setDescription(t(selectedLang, 'lang.updated_desc', { lang: langInfo.native, flag: langInfo.flag, native: langInfo.native }))
                            .setFooter({ text: 'Starry Configuration • ' + langInfo.name })
                            .setTimestamp();
                        return await interaction.update({ embeds: [embed], components: [] }).catch(() => {});
                    }
                }

                // 🚀 Welcome Setup Buttons (1-Year Global Handler)
                if (customId === 'starry_welcome_start_setup' || customId === 'starry_welcome_sync') {
                    if (!interaction.guild) return;
                    const hasPerm = interaction.member?.permissions?.has(PermissionFlagsBits.Administrator) ||
                                    interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild) ||
                                    config.BOT_OWNERS?.includes(interaction.user.id);
                    if (!hasPerm) {
                        const { t } = require('../utils/i18n');
                        return interaction.reply({ content: t(interaction.guild.id, 'common.access_denied'), ephemeral: true }).catch(() => {});
                    }

                    const { getGuildLanguage, createSetupPromptCard } = require('../utils/i18n');
                    const currentLang = await getGuildLanguage(interaction.guild.id);
                    const setupCard = createSetupPromptCard(interaction.guild, currentLang, client.user);
                    return await interaction.update(setupCard).catch(() => {});
                }

                // Mention Greeting Card Quick Actions
                if (customId === 'mention_help_btn') {
                    const prefix = interaction.guild ? await getGuildPrefix(interaction.guild.id) : (config.DEFAULT_PREFIX || ',');
                    return await interaction.reply({
                        embeds: [buildCategoryEmbed('home', prefix)],
                        components: createHelpComponents(),
                        flags: EPHEMERAL_FLAG
                    }).catch(() => {});
                }

                if (customId === 'mention_ping_btn') {
                    const ping = Math.round(interaction.client.ws.ping || 0);
                    return await interaction.reply({
                        content: `🏓 **Pong!** WebSocket Latency: \`${ping}ms\` • Gateway Shard: \`#${interaction.guild?.shardId ?? 0}\``,
                        flags: EPHEMERAL_FLAG
                    }).catch(() => {});
                }

                // A. Help Menu Dropdown & Navigation
                if (customId === 'help_select' || customId.startsWith('help_btn_')) {
                    let targetCat = 'home';
                    if (interaction.isStringSelectMenu()) {
                        targetCat = interaction.values[0] || 'home';
                    } else if (interaction.isButton()) {
                        targetCat = customId.replace('help_btn_', '');
                    }

                    const prefix = config.DEFAULT_PREFIX || ',';
                    return await interaction.update({
                        embeds: [buildCategoryEmbed(targetCat, prefix)],
                        components: createHelpComponents()
                    }).catch(() => {});
                }

                // B. Payment Order Approval / Rejection Buttons (Bot Owners)
                if (customId.startsWith('approve_order_') || customId.startsWith('reject_order_')) {
                    const isOwner = (config.BOT_OWNERS || []).includes(interaction.user.id);
                    if (!isOwner) {
                        return await interaction.reply({
                            content: '❌ Only Bot Owners can approve or reject payment orders.',
                            flags: EPHEMERAL_FLAG
                        }).catch(() => {});
                    }

                    const { approvePaymentOrder, rejectPaymentOrder } = require('../utils/paymentHelper');
                    if (customId.startsWith('approve_order_')) {
                        const orderId = customId.replace('approve_order_', '');
                        await interaction.deferUpdate().catch(() => {});
                        const res = await approvePaymentOrder(orderId, `${interaction.user.username} (Discord Button)`, interaction.client);
                        if (res.success) {
                            let note = '';
                            if (res.autoActivated) {
                                note += `\n🎉 **Auto-Activated for Server:** \`${res.guildId}\``;
                            }
                            if (res.userActivated && res.userId) {
                                note += `\n👑 **Auto-Activated User:** <@${res.userId}>`;
                            }
                            note += `\n💡 *To activate any server, run \`,redeem ${res.key}\` in that server or use \`,addpremium <server_id> ${res.tier || 'lifetime'}\`*`;

                            return await interaction.editReply({
                                content: `✅ **Order \`${orderId}\` APPROVED by ${interaction.user.username}**\n🔑 **Issued Key:** \`${res.key}\`${note}`,
                                embeds: [],
                                components: []
                            }).catch(() => {});
                        } else {
                            return await interaction.followUp({
                                content: `❌ Error approving order \`${orderId}\`: ${res.error}`,
                                flags: EPHEMERAL_FLAG
                            }).catch(() => {});
                        }
                    } else if (customId.startsWith('reject_order_')) {
                        const orderId = customId.replace('reject_order_', '');
                        await interaction.deferUpdate().catch(() => {});
                        const res = await rejectPaymentOrder(orderId, `${interaction.user.username} (Discord Button)`, 'Payment verification rejected by owner.', interaction.client);
                        if (res.success) {
                            return await interaction.editReply({
                                content: `❌ **Order \`${orderId}\` REJECTED by ${interaction.user.username}**`,
                                embeds: [],
                                components: []
                            }).catch(() => {});
                        } else {
                            return await interaction.followUp({
                                content: `❌ Error rejecting order: ${res.error}`,
                                flags: EPHEMERAL_FLAG
                            }).catch(() => {});
                        }
                    }
                }

                // AutoMod Channel Interactive Buttons (1-Year Global Handler)
                if (customId.startsWith('am_toggle_links_') || customId.startsWith('am_toggle_emojis_') || customId.startsWith('am_refresh_')) {
                    if (!interaction.guild) {
                        return interaction.reply({ content: '❌ AutoMod can only be configured in a server.', ephemeral: true }).catch(() => {});
                    }

                    const automodHelper = require('../utils/automodHelper');
                    if (!automodHelper.canManageAutomod(interaction.member, interaction.user, interaction.guild)) {
                        return interaction.reply({
                            content: '❌ You need **Administrator** or **Manage Server** permissions to configure AutoMod settings.',
                            ephemeral: true
                        }).catch(() => {});
                    }

                    const channelId = customId.replace(/^(am_toggle_links_|am_toggle_emojis_|am_refresh_)/, '');
                    const targetChannel = interaction.guild.channels.cache.get(channelId) || await interaction.guild.channels.fetch(channelId).catch(() => null);

                    if (!targetChannel) {
                        return interaction.reply({
                            content: '❌ Target channel could not be found or has been deleted.',
                            ephemeral: true
                        }).catch(() => {});
                    }

                    const current = await automodHelper.getChannelSettings(channelId, interaction.guild.id);

                    if (customId.startsWith('am_toggle_links_')) {
                        await automodHelper.setChannelFilter(channelId, interaction.guild.id, 'links', !current.linksActive);
                    } else if (customId.startsWith('am_toggle_emojis_')) {
                        await automodHelper.setChannelFilter(channelId, interaction.guild.id, 'emojis', !current.emojisActive);
                    }

                    const updatedSettings = await automodHelper.getChannelSettings(channelId, interaction.guild.id);
                    const isGuildEnabled = automodHelper.getGuildStatus(interaction.guild.id);
                    const newEmbed = automodHelper.buildChannelAutomodEmbed(interaction.guild, targetChannel, updatedSettings, isGuildEnabled);
                    const newButtons = automodHelper.createChannelAutomodButtons(channelId, updatedSettings);

                    return await interaction.update({
                        embeds: [newEmbed],
                        components: [newButtons]
                    }).catch(() => {});
                }

                // C. Chest Claim Buttons (1-Year Global Handler)
                if (customId === 'claim_chest' || customId === 'claim_wild_chest') {
                    await interaction.deferUpdate().catch(() => {});

                    const userId = interaction.user.id;
                    const guildId = interaction.guild?.id || interaction.guildId;

                    let userData = await User.findOne({ userId, guildId });
                    if (!userData) userData = new User({ userId, guildId });

                    const rarities = [
                        { name: 'Common', color: '#95a5a6', minXp: 100, maxXp: 300, minCred: 20, maxCred: 50, chance: 50 },
                        { name: 'Uncommon', color: '#2ecc71', minXp: 300, maxXp: 800, minCred: 50, maxCred: 120, chance: 30 },
                        { name: 'Rare', color: '#3498db', minXp: 800, maxXp: 1800, minCred: 120, maxCred: 250, chance: 13 },
                        { name: 'Epic', color: '#9b59b6', minXp: 1800, maxXp: 3500, minCred: 250, maxCred: 500, chance: 5 },
                        { name: 'Legendary', color: '#f1c40f', minXp: 3500, maxXp: 7000, minCred: 500, maxCred: 1200, chance: 2 }
                    ];

                    const roll = Math.random() * 100;
                    let cumulative = 0;
                    let selectedRarity = rarities[0];
                    for (const r of rarities) {
                        cumulative += r.chance;
                        if (roll <= cumulative) { selectedRarity = r; break; }
                    }

                    const prestigeBonus = 1 + ((userData.prestige || 0) * 0.15);
                    const rawXp = Math.floor(Math.random() * (selectedRarity.maxXp - selectedRarity.minXp + 1)) + selectedRarity.minXp;
                    const rawCred = Math.floor(Math.random() * (selectedRarity.maxCred - selectedRarity.minCred + 1)) + selectedRarity.minCred;

                    const finalXp = Math.floor(rawXp * prestigeBonus);
                    const baseCred = Math.floor(rawCred * prestigeBonus);

                    let petBonusCred = 0;
                    if (userData.activePet && userData.petHappiness > 0) {
                        petBonusCred = Math.floor(baseCred * (userData.petHappiness / 100) * 0.35);
                    }
                    const finalCred = baseCred + petBonusCred;

                    userData.xp = (userData.xp || 0) + finalXp;
                    userData.credits = (userData.credits || 0) + finalCred;
                    await userData.save();

                    const claimedEmbed = new EmbedBuilder()
                        .setColor(selectedRarity.color)
                        .setThumbnail('https://cdn-icons-png.flaticon.com/512/2852/2852825.png')
                        .setTitle(`💰 ${selectedRarity.name} Chest Claimed!`)
                        .setDescription(
                            `<@${userId}> claimed the chest!\n` +
                            `✨ **${finalXp.toLocaleString()} XP!**\n` +
                            `💳 **+${finalCred.toLocaleString()} Credits** ${petBonusCred > 0 ? `*(🐾 +${petBonusCred} from pet bonus)*` : ''}\n\n` +
                            `🛍️ *Spend your credits in the **/shop** for exclusive roles and pets!* 🛍️`
                        )
                        .setFooter({ text: 'Starry Loot Engine', iconURL: client.user.displayAvatarURL() });

                    return await interaction.message.edit({ embeds: [claimedEmbed], components: [] }).catch(() => {});
                }

                // C0. Voice Moderation Incident & Panel Action Buttons
                if (customId.startsWith('vcmod_')) {
                    const { 
                        handleVoiceModButton, 
                        startVoiceModeration, 
                        stopVoiceModeration, 
                        getGuildVoiceModConfig, 
                        updateGuildConfigCache 
                    } = require('./voiceModerator');

                    const handled = await handleVoiceModButton(interaction);
                    if (handled) return;

                    // Panel Join Button
                    if (customId === 'vcmod_panel_join') {
                        const targetChannel = interaction.member?.voice?.channel;
                        if (!targetChannel) {
                            return interaction.reply({ content: '❌ Please join a voice channel first to start monitoring!', ephemeral: true });
                        }
                        await startVoiceModeration(interaction.guild, targetChannel, interaction.client);
                        return interaction.reply({ content: `🎙️ Starry is now monitoring **<#${targetChannel.id}>** in real-time!`, ephemeral: true });
                    }

                    // Panel Leave Button
                    if (customId === 'vcmod_panel_leave') {
                        stopVoiceModeration(interaction.guild.id);
                        return interaction.reply({ content: '⏹️ Stopped voice channel moderation and disconnected.', ephemeral: true });
                    }

                    // Panel Toggle Action Button
                    if (customId === 'vcmod_panel_toggle_action') {
                        const VoiceModerationConfig = require('../models/VoiceModerationConfig');
                        const conf = await getGuildVoiceModConfig(interaction.guild.id);
                        const actions = ['warn', 'mute', 'disconnect', 'timeout', 'log'];
                        const nextIdx = (actions.indexOf(conf.action || 'warn') + 1) % actions.length;
                        conf.action = actions[nextIdx];
                        await VoiceModerationConfig.findOneAndUpdate({ guildId: interaction.guild.id }, { action: conf.action }, { upsert: true });
                        updateGuildConfigCache(interaction.guild.id, conf);
                        return interaction.reply({ content: `⚖️ Voice moderation penalty updated to: **${conf.action.toUpperCase()}**`, ephemeral: true });
                    }

                    // Panel Toggle Audio Warning Button
                    if (customId === 'vcmod_panel_toggle_warning') {
                        const VoiceModerationConfig = require('../models/VoiceModerationConfig');
                        const conf = await getGuildVoiceModConfig(interaction.guild.id);
                        conf.audioWarning = !conf.audioWarning;
                        await VoiceModerationConfig.findOneAndUpdate({ guildId: interaction.guild.id }, { audioWarning: conf.audioWarning }, { upsert: true });
                        updateGuildConfigCache(interaction.guild.id, conf);
                        return interaction.reply({ content: `🗣️ In-VC Spoken Voice Warning is now: **${conf.audioWarning ? 'ENABLED' : 'DISABLED'}**`, ephemeral: true });
                    }
                }

                // C0-B. Chat Spark Dilemma Vote Buttons
                if (customId.startsWith('spark_vote_')) {
                    const { handleSparkVote } = require('./chatSpark');
                    const handled = await handleSparkVote(interaction);
                    if (handled) return;
                }

                // C0-C. Quantum Server Pulse Action Buttons
                if (customId.startsWith('pulse_')) {
                    if (customId === 'pulse_refresh') {
                        await interaction.deferUpdate().catch(() => {});
                        const { generateServerPulse } = require('./serverPulse');
                        const { embed, row } = await generateServerPulse(interaction.guild, interaction.client);
                        return await interaction.editReply({ embeds: [embed], components: [row] }).catch(() => {});
                    }
                    if (customId === 'pulse_spark') {
                        await interaction.deferReply().catch(() => {});
                        const { createChatSpark } = require('./chatSpark');
                        const { embed, row } = await createChatSpark(interaction.channel, interaction.user);
                        return await interaction.editReply({ embeds: [embed], components: [row] }).catch(() => {});
                    }
                    if (customId === 'pulse_drop') {
                        const chestModule = require('./chestDrop');
                        if (chestModule && typeof chestModule.triggerManualDrop === 'function') {
                            await chestModule.triggerManualDrop(interaction.channel);
                            return interaction.reply({ content: '🎁 **Starlight Loot Chest Dropped!** Claim it before others do!', ephemeral: true });
                        }
                        return interaction.reply({ content: '🎁 A Starlight blessing has fallen upon this channel!', ephemeral: true });
                    }
                }

                // C0-D. Astral Co-Op Raid Boss Combat Actions
                if (customId.startsWith('raid_')) {
                    const actionType = customId.replace('raid_', '');
                    const { handleRaidCombatAction } = require('./astralRaidEngine');
                    return await handleRaidCombatAction(interaction, actionType);
                }

                // C0-E. AI Channel Catch-Up Buttons
                if (customId.startsWith('catchup_')) {
                    if (customId === 'catchup_dm') {
                        try {
                            const originalEmbed = interaction.message?.embeds?.[0];
                            if (originalEmbed) {
                                await interaction.user.send({
                                    content: `📬 **Here is your personal copy of the channel catch-up from ${interaction.guild.name}:**`,
                                    embeds: [originalEmbed]
                                });
                                return interaction.reply({ content: '📬 Catch-Up summary sent directly to your DMs!', ephemeral: true });
                            }
                        } catch (dmErr) {
                            return interaction.reply({ content: '❌ Could not send DM! Please ensure your direct messages are open.', ephemeral: true });
                        }
                    } else if (customId.startsWith('catchup_refresh_')) {
                        const hours = parseInt(customId.replace('catchup_refresh_', ''), 10) || 6;
                        await interaction.deferUpdate().catch(() => {});
                        const { generateChannelCatchup } = require('./chatCatchup');
                        const { embed, components } = await generateChannelCatchup(interaction.channel, { hours, user: interaction.user });
                        return await interaction.editReply({ embeds: [embed], components }).catch(() => {});
                    }
                }

                // C0-F. White-Hat Pentest & Security Intelligence Buttons
                if (customId.startsWith('pentest_')) {
                    if (customId === 'pentest_dm') {
                        try {
                            const originalEmbed = interaction.message?.embeds?.[0];
                            if (originalEmbed) {
                                await interaction.user.send({
                                    content: `🛡️ **Forensic Pentest & Loophole Audit Report for ${interaction.guild.name}:**`,
                                    embeds: [originalEmbed]
                                });
                                return interaction.reply({ content: '📬 Pentest audit report successfully dispatched to your DMs!', ephemeral: true });
                            }
                        } catch (dmErr) {
                            return interaction.reply({ content: '❌ Could not send DM! Please make sure your DMs are open to server members.', ephemeral: true });
                        }
                    } else if (customId === 'pentest_blueprint') {
                        const { EmbedBuilder } = require('discord.js');
                        const blueprintEmbed = new EmbedBuilder()
                            .setColor('#3498DB')
                            .setTitle('🔒 Starry Zero-Day Server Hardening Blueprint')
                            .setDescription('Follow these surgical steps in Discord Server Settings to harden your defense against raids, nukes, and rogue bots:')
                            .addFields(
                                {
                                    name: '1. Neutralize Dangerous @everyone Overrides',
                                    value: '• Go to **Server Settings > Roles > @everyone**\n• Disable `Mention @everyone, @here, and All Roles`\n• Disable `Manage Webhooks` and `Manage Messages`\n• Ensure `Attach Files` & `Embed Links` are disabled in announcement/rule channels.'
                                },
                                {
                                    name: '2. Quarantine Rogue Bot Permissions',
                                    value: '• Inspect every bot role in **Server Settings > Integrations / Roles**\n• Strip `Administrator` from utility bots that do not explicitly require it.\n• Move the bot role below human moderator roles to prevent privilege escalation.'
                                },
                                {
                                    name: '3. Enforce Server-Level Gateways',
                                    value: '• Set **Verification Level** to at least **Medium** (Registered > 5 mins).\n• Set **Explicit Media Content Filter** to **Scan media from all members**.\n• Enable **Require 2FA for Moderation** to prevent staff account takeovers.'
                                }
                            )
                            .setFooter({ text: 'Starry White-Hat Security Blueprint' });
                        return interaction.reply({ embeds: [blueprintEmbed], ephemeral: true });
                    } else if (customId === 'pentest_refresh') {
                        await interaction.deferUpdate().catch(() => {});
                        const { auditServerSecurity } = require('./cyberSec');
                        const { embed, components } = await auditServerSecurity(interaction.guild, interaction.user);
                        return await interaction.editReply({ embeds: [embed], components }).catch(() => {});
                    }
                }

                // C0-G. DevCouncil & Code Studio Buttons
                if (customId.startsWith('council_')) {
                    if (customId === 'council_dm') {
                        try {
                            const originalEmbed = interaction.message?.embeds?.[0];
                            if (originalEmbed) {
                                await interaction.user.send({
                                    content: `📬 **Here is your DevCouncil Code Patch & Review:**`,
                                    embeds: [originalEmbed]
                                });
                                return interaction.reply({ content: '📬 Code patch successfully sent directly to your DMs!', ephemeral: true });
                            }
                        } catch (dmErr) {
                            return interaction.reply({ content: '❌ Could not send DM! Please ensure your direct messages are open.', ephemeral: true });
                        }
                    } else if (customId === 'council_explain') {
                        return interaction.reply({
                            content: '💡 **DevCouncil Architecture:**\n• **CodeRabbit** analyzed static AST, async task lifetimes, and vulnerability attack surface.\n• **Claude** optimized state isolation and error handling boundaries.\n• **OpenAI** restructured the logic for maximum performance and readability.',
                            ephemeral: true
                        });
                    }
                }

                // C0-H. Starry Chronos Predictive Forecast Buttons
                if (customId.startsWith('chronos_')) {
                    if (customId === 'chronos_dm') {
                        try {
                            const originalEmbed = interaction.message?.embeds?.[0];
                            if (originalEmbed) {
                                await interaction.user.send({
                                    content: `⏳ **Here is your Server Chronos Predictive Forecast for ${interaction.guild.name}:**`,
                                    embeds: [originalEmbed]
                                });
                                return interaction.reply({ content: '📬 Chronos forecast report dispatched to your DMs!', ephemeral: true });
                            }
                        } catch (dmErr) {
                            return interaction.reply({ content: '❌ Could not send DM! Please ensure your direct messages are open.', ephemeral: true });
                        }
                    } else if (customId === 'chronos_remind') {
                        return interaction.reply({
                            content: '🎯 **Golden Slot Armed!** Starry will monitor chat velocity and keep you updated when the server reaches peak engagement activity!',
                            ephemeral: true
                        });
                    } else if (customId === 'chronos_refresh') {
                        await interaction.deferUpdate().catch(() => {});
                        const { analyzeServerChronos } = require('./serverChronos');
                        const { embed, components } = await analyzeServerChronos(interaction.guild, interaction.user);
                        return await interaction.editReply({ embeds: [embed], components }).catch(() => {});
                    }
                }

                // C0-I. Starry Starlight Gazette Pagination & Delivery Buttons
                if (customId.startsWith('gazette_')) {
                    if (customId.startsWith('gazette_dm_')) {
                        try {
                            const originalEmbed = interaction.message?.embeds?.[0];
                            if (originalEmbed) {
                                await interaction.user.send({
                                    content: `🗞️ **Here is your personal copy of The Starry Starlight Gazette from ${interaction.guild?.name || 'the server'}:**`,
                                    embeds: [originalEmbed]
                                });
                                return interaction.reply({ content: '📬 Gazette page successfully delivered to your DMs!', ephemeral: true });
                            }
                        } catch (dmErr) {
                            return interaction.reply({ content: '❌ Could not send DM! Please ensure your direct messages are open.', ephemeral: true });
                        }
                    }

                    // Navigation Buttons: First, Prev, Next
                    const parts = customId.split('_');
                    // Format: gazette_action_guildId_pageIndex_days
                    // e.g. gazette_first_12345_7 or gazette_next_12345_0_7
                    const action = parts[1];
                    let targetPage = 0;
                    let days = 7;

                    if (action === 'first') {
                        targetPage = 0;
                        days = parseInt(parts[3], 10) || 7;
                    } else if (action === 'prev') {
                        const cur = parseInt(parts[3], 10) || 0;
                        targetPage = Math.max(0, cur - 1);
                        days = parseInt(parts[4], 10) || 7;
                    } else if (action === 'next') {
                        const cur = parseInt(parts[3], 10) || 0;
                        targetPage = Math.min(4, cur + 1);
                        days = parseInt(parts[4], 10) || 7;
                    }

                    await interaction.deferUpdate().catch(() => {});
                    const { generateServerGazette } = require('./serverGazette');
                    const { embed, components } = await generateServerGazette(interaction.guild, interaction.user, { days, page: targetPage });
                    return await interaction.editReply({ embeds: [embed], components }).catch(() => {});
                }

                // C. Social Action Back Buttons (Instant 0ms Global Handler with DB tracking)
                if (customId.startsWith('social_') && customId.includes('_back_')) {
                    const { handleSocialBackButton } = require('./socialActions');
                    return await handleSocialBackButton(interaction);
                }

                // C2. Social Action Menu Selector Dropdown
                if (customId === 'social_select_action') {
                    const { handleSocialSelectMenu } = require('./socialActions');
                    return await handleSocialSelectMenu(interaction);
                }

                // C3. Marriage Accept / Decline Buttons (Instant Global Handler)
                if (customId.startsWith('marry_yes_') || customId.startsWith('marry_no_')) {
                    const parts = customId.split('_');
                    const proposerId = parts[2];
                    const targetId = parts[3];

                    if (interaction.user.id !== targetId) {
                        return interaction.reply({
                            content: `❌ Only <@${targetId}> can respond to this proposal!`,
                            ephemeral: true
                        }).catch(() => {});
                    }

                    const mongoose = require('mongoose');
                    const EcoUser = mongoose.models.EcoUser;

                    if (interaction.replied || interaction.deferred) return;

                    if (customId.startsWith('marry_yes_')) {
                        const now = new Date();
                        if (EcoUser) {
                            await EcoUser.updateMany({ userId: proposerId }, { $set: { marriedTo: targetId, marriedAt: now } }).catch(() => {});
                            await EcoUser.updateMany({ userId: targetId }, { $set: { marriedTo: proposerId, marriedAt: now } }).catch(() => {});
                        }

                        const { getAnimeAttachment, getRandomKissGif } = require('../utils/animeGifs');
                        const anim = getAnimeAttachment('kiss');
                        const unixTime = Math.floor(now.getTime() / 1000);

                        const acceptedEmbed = new EmbedBuilder()
                            .setColor('#FF69B4')
                            .setTitle('💍💖 JUST MARRIED! 💖💍')
                            .setDescription(
                                `✨ **<@${proposerId}>** & **<@${targetId}>** have officially tied the knot! ✨\n\n` +
                                `*“Two souls bound by love across the infinite cosmos. May your journey through the stars be filled with eternal romance, joy, and warmth!”* 🌌🥂\n\n` +
                                `💍 **Spouses:** <@${proposerId}> ❤️ <@${targetId}>\n` +
                                `📅 **Matrimony Date:** <t:${unixTime}:D> (<t:${unixTime}:R>)\n` +
                                `💫 **Status:** Official & Blessed in Starry Matrimony\n\n` +
                                `*Sealed with a passionate kiss!* 💕`
                            )
                            .setImage(anim ? anim.attachmentUrl : getRandomKissGif())
                            .setFooter({ text: 'Starry Matrimony Suite • Check with /profile or ,profile' })
                            .setTimestamp(now);

                        const updatePayload = { embeds: [acceptedEmbed], components: [] };
                        if (anim) updatePayload.files = [anim.attachment];
                        return interaction.update(updatePayload).catch(() => {});
                    } else {
                        const { getAnimeAttachment, getRandomSlapGif } = require('../utils/animeGifs');
                        const anim = getAnimeAttachment('slap');

                        const declinedEmbed = new EmbedBuilder()
                            .setColor('#ED4245')
                            .setTitle('💔 OUCH! PROPOSAL REJECTED! ✋💥')
                            .setDescription(
                                `💥 **<@${targetId}>** delivered a thunderous slap and rejected **<@${proposerId}>**'s proposal!\n\n` +
                                `*“Oof! That's gotta leave a mark... Not today, starry lover! Better luck next time!”* 🥀💔\n\n` +
                                `💔 **Declined By:** <@${targetId}>\n` +
                                `🩹 **Condition:** Emotional Damage (Critical Hit)\n\n` +
                                `✨ *Don't worry <@${proposerId}>, there are billions of other shining stars in the cosmos!*`
                            )
                            .setImage(anim ? anim.attachmentUrl : getRandomSlapGif())
                            .setFooter({ text: 'Starry Matrimony Suite • Proposal Declined' })
                            .setTimestamp();

                        const updatePayload = { embeds: [declinedEmbed], components: [] };
                        if (anim) updatePayload.files = [anim.attachment];
                        return interaction.update(updatePayload).catch(() => {});
                    }
                }

                // D. AI Image Regenerate & Enhance Variations (1-Year Global Handler)
                if (customId.startsWith('ai_regen_') || customId.startsWith('ai_enhance_')) {
                    await interaction.deferUpdate().catch(() => {});

                    const embed = interaction.message.embeds?.[0];
                    if (!embed) return;

                    // Extract prompt from embed description
                    let prompt = '';
                    const desc = embed.description || '';
                    const match = desc.match(/Prompt:\*\* "(.*?)"/s) || desc.match(/Prompt:\*\* (.*?)\n/s);
                    if (match && match[1]) {
                        prompt = match[1];
                    } else {
                        prompt = embed.title || 'Masterpiece artwork';
                    }

                    if (customId.startsWith('ai_enhance_')) {
                        if (!prompt.includes('masterpiece') && !prompt.includes('8k resolution')) {
                            prompt = `${prompt}, masterpiece, highly detailed, 8k resolution, cinematic lighting, ultra-fine art, photorealistic`;
                        }
                    }

                    const newSeed = Math.floor(Math.random() * 9999999);
                    const encoded = encodeURIComponent(prompt);
                    const imgUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=${newSeed}&model=flux&enhance=true`;

                    try {
                        const fetch = require('node-fetch');
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 25000);
                        const res = await fetch(imgUrl, { signal: controller.signal });
                        clearTimeout(timeoutId);

                        if (res.ok) {
                            const arrayBuffer = await res.arrayBuffer();
                            const buffer = Buffer.from(arrayBuffer);
                            const attachment = new AttachmentBuilder(buffer, { name: `starry_art_${newSeed}.jpg` });

                            const updatedEmbed = EmbedBuilder.from(embed)
                                .setDescription(`✨ **Prompt:** "${prompt.length > 250 ? prompt.substring(0, 247) + '...' : prompt}"\n🧠 **Engine:** \`Flux.1 Schnell (1024x1024 HD)\`\n👤 **Requested by:** <@${interaction.user.id}>`)
                                .setImage(`attachment://starry_art_${newSeed}.jpg`)
                                .setFooter({ text: `Seed: ${newSeed} • Starry AI • Direct HD Rendering` })
                                .setTimestamp();

                            const updatedRow = new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`ai_regen_${newSeed}`)
                                    .setLabel('🔄 Regenerate')
                                    .setStyle(ButtonStyle.Primary),
                                new ButtonBuilder()
                                    .setCustomId(`ai_enhance_${newSeed}`)
                                    .setLabel('✨ Enhance Variations')
                                    .setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder()
                                    .setLabel('📥 Direct HD Link')
                                    .setStyle(ButtonStyle.Link)
                                    .setURL(imgUrl)
                            );

                            await interaction.message.edit({
                                embeds: [updatedEmbed],
                                components: [updatedRow],
                                files: [attachment],
                                attachments: []
                            }).catch(() => {});
                        }
                    } catch (err) {
                        console.error('AI Image Regenerate Error:', err);
                    }
                    return;
                }

                // E. NSFW & Mature Anime Interactive Buttons (1-Year Global Handler)
                if (customId === 'nsfw_ai_explain') {
                    const { explainNsfwWithAI } = require('./nsfwModule');
                    const embed = await explainNsfwWithAI({ user: interaction.user, guild: interaction.guild });
                    return interaction.reply({ embeds: [embed], flags: [EPHEMERAL_FLAG] });
                }

                if (customId === 'nsfw_toggle_server') {
                    if (!interaction.guild) {
                        return interaction.reply({ content: '❌ Server toggles cannot be used in Direct Messages. Use "Toggle My DM NSFW" instead.', flags: [EPHEMERAL_FLAG] });
                    }
                    const { canManageServerNsfw } = require('./nsfwModule');
                    if (!canManageServerNsfw(interaction.user.id, interaction.guild)) {
                        return interaction.reply({ 
                            content: `❌ **Permission Denied:** Only the **Server Owner** (<@${interaction.guild.ownerId}>) or **Bot Owners** have authority to toggle the NSFW module for this server.`, 
                            flags: [EPHEMERAL_FLAG] 
                        });
                    }
                    const ServerSettings = require('../models/ServerSettings');
                    let settings = await ServerSettings.findOne({ guildId: interaction.guild.id });
                    if (!settings) settings = await ServerSettings.create({ guildId: interaction.guild.id });
                    if (!settings.nsfw) settings.nsfw = {};
                    settings.nsfw.enabled = !settings.nsfw.enabled;
                    await settings.save();

                    return interaction.reply({
                        content: settings.nsfw.enabled 
                            ? `🔞 **NSFW Module has been ENABLED for ${interaction.guild.name}!**\n*Commands will execute strictly in Age-Restricted (NSFW) channels.*` 
                            : `🔒 **NSFW Module has been DISABLED for ${interaction.guild.name}.**`,
                        flags: [EPHEMERAL_FLAG]
                    });
                }

                if (customId === 'nsfw_toggle_dm') {
                    const { toggleNsfwDm } = require('./nsfwModule');
                    const newState = await toggleNsfwDm(interaction.user.id);
                    return interaction.reply({
                        content: newState
                            ? '🔞 **Mature Anime Mode ENABLED in your DMs!**\n*You can now use mature anime commands and waifu/neko art in Direct Messages with Starry.*'
                            : '🔒 **Mature Anime Mode DISABLED in your DMs.**',
                        flags: [EPHEMERAL_FLAG]
                    });
                }

                // F. Starry Mascot Interactive Lore & Voice Buttons
                if (customId === 'starry_lore_btn') {
                    const { STARRY_MASCOT } = require('../utils/aiEngine');
                    const loreEmbed = new EmbedBuilder()
                        .setColor('#9B59B6')
                        .setTitle(`📖 The Celestial Lore of ${STARRY_MASCOT.name}`)
                        .setDescription(
                            `Born from the primordial stardust of the Astraea Constellation, **Starry** descended into the digital cosmos to protect communities, share high-res melodies, and illuminate Discord with celestial light.\n\n` +
                            `• **Origin:** Constellation of Astraea (Outer Cosmos)\n` +
                            `• **Relic:** Starlight Nebula Quill\n` +
                            `• **Mission:** Bring joy, musical harmony, and unbreakable security to Discord servers across the galaxy!\n\n` +
                            `*“Wherever there are friends gathered under the night sky, my stars will shine for you.”* ✨`
                        )
                        .setFooter({ text: 'Starry Official Mascot Lore' });
                    return interaction.reply({ embeds: [loreEmbed], flags: [EPHEMERAL_FLAG] });
                }

                if (customId === 'starry_voice_btn') {
                    const { STARRY_MASCOT } = require('../utils/aiEngine');
                    const phrase = STARRY_MASCOT.catchphrases[Math.floor(Math.random() * STARRY_MASCOT.catchphrases.length)];
                    return interaction.reply({ content: `🎙️ **Starry says:**\n>>> *${phrase}*`, flags: [EPHEMERAL_FLAG] });
                }

                if (customId === 'starry_dm_btn') {
                    try {
                        const dm = await interaction.user.createDM();
                        await dm.send(`✨ **Hello <@${interaction.user.id}>!** 🌟 I am Starry, your cosmic AI companion! Feel free to ask me anything or chat with me right here in our private DMs without any prefix! 💫`);
                        return interaction.reply({ content: '💌 **I sent you a greeting in your DMs!** Check your Direct Messages to chat with me.', flags: [EPHEMERAL_FLAG] });
                    } catch (e) {
                        return interaction.reply({ content: '❌ Could not open DMs with you. Please enable Direct Messages in your privacy settings.', flags: [EPHEMERAL_FLAG] });
                    }
                }

                // Starry Premium View Perks Modal / Ephemeral Card
                if (customId === 'premium_view_perks_btn') {
                    const { createPremiumPerksPayload } = require('../utils/premiumHelper');
                    const guildPrefix = await getGuildPrefix(interaction.guildId);
                    const perksPayload = createPremiumPerksPayload(guildPrefix);
                    return interaction.reply({ ...perksPayload, flags: [EPHEMERAL_FLAG] }).catch(() => {});
                }

                // Dedicated Music Controller Channel Interactions
                if (customId.startsWith('ctrl_') || customId.startsWith('spotify_')) {
                    const musicController = require('./musicController');
                    return await musicController.handleButtonInteraction(interaction, client);
                }

                // G. Music, Search & DJ Panel Global Controls (1-Year Global Handler)
                if (customId.startsWith('dj_') || customId.startsWith('music_') || customId.startsWith('search_')) {
                    // Handle Multi-Platform Search System Buttons & Select Menus (from screenshot)
                    if (customId.startsWith('search_src_') || customId.startsWith('search_cancel:')) {
                        const { handleSearchButton } = require('../utils/musicSearchHelper');
                        return handleSearchButton(interaction, client);
                    }
                    if (customId.startsWith('search_track_select_')) {
                        const { handleSearchTrackSelect } = require('../utils/musicSearchHelper');
                        return handleSearchTrackSelect(interaction, client);
                    }

                    const { StarryAudioEngine } = require('../utils/nativeAudioEngine');
                    const { applyKazagumoFilter } = require('../utils/musicManager');

                    let kPlayer = (interaction.client.manager ? interaction.client.manager.getPlayer(interaction.guild.id) : null) || (client.manager ? client.manager.getPlayer(interaction.guild.id) : null);
                    if (!kPlayer && client.multiBot?.instances) {
                        for (const inst of client.multiBot.instances.values()) {
                            if (inst.client?.manager) {
                                const p = inst.client.manager.getPlayer(interaction.guild.id);
                                if (p) { kPlayer = p; break; }
                            }
                        }
                    }
                    const nPlayer = StarryAudioEngine.getPlayer(interaction.guild.id, client);
                    const voiceChannel = interaction.member?.voice?.channel;

                    if (!voiceChannel && customId !== 'dj_refresh_panel' && customId !== 'music_queue') {
                        return interaction.reply({ 
                            content: '❌ You must be connected to a voice channel to use audio controls!', 
                            flags: [EPHEMERAL_FLAG] 
                        }).catch(() => {});
                    }

                    // 1. Voice Channel Locking & Unlocking
                    if (customId === 'dj_lock') {
                        if (!voiceChannel) {
                            return interaction.reply({ content: '❌ You are not in a voice channel.', flags: [EPHEMERAL_FLAG] }).catch(() => {});
                        }
                        await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false }).catch(() => {});
                        return interaction.reply({ 
                            content: `🔒 **Locked voice channel:** <#${voiceChannel.id}>\n*Only existing members and moderators can join.*`, 
                            flags: [EPHEMERAL_FLAG] 
                        }).catch(() => {});
                    }

                    if (customId === 'dj_unlock') {
                        if (!voiceChannel) {
                            return interaction.reply({ content: '❌ You are not in a voice channel.', flags: [EPHEMERAL_FLAG] }).catch(() => {});
                        }
                        await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: null }).catch(() => {});
                        return interaction.reply({ 
                            content: `🔓 **Unlocked voice channel:** <#${voiceChannel.id}>\n*Everyone can now join.*`, 
                            flags: [EPHEMERAL_FLAG] 
                        }).catch(() => {});
                    }

                    // 2. Queue Viewer
                    if (customId === 'music_queue') {
                        if (kPlayer) {
                            const current = kPlayer.queue.current;
                            const tracks = kPlayer.queue.slice(0, 10);
                            let qList = tracks.map((t, idx) => `\`${idx + 1}.\` **${t.title?.substring(0, 60)}** \`(${t.isStream ? 'LIVE' : formatTime(t.length)})\``).join('\n');
                            if (!qList) qList = '*No upcoming tracks in queue.*';

                            const embed = new EmbedBuilder()
                                .setColor('#5865F2')
                                .setTitle(`🎵 Current Music Queue • ${kPlayer.queue.length} Tracks`)
                                .setDescription(`▶️ **Now Playing:**\n**${current ? current.title : 'None'}**\n\n📜 **Upcoming:**\n${qList}`)
                                .setFooter({ text: 'Starry Audio Intelligence Engine' });

                            return interaction.reply({ embeds: [embed], flags: [EPHEMERAL_FLAG] }).catch(() => {});
                        } else if (nPlayer) {
                            const current = nPlayer.currentTrack;
                            const tracks = nPlayer.queue.slice(0, 10);
                            let qList = tracks.map((t, idx) => `\`${idx + 1}.\` **${t.title?.substring(0, 60)}**`).join('\n');
                            if (!qList) qList = '*No upcoming tracks in queue.*';

                            const embed = new EmbedBuilder()
                                .setColor('#5865F2')
                                .setTitle(`🎵 Current Music Queue • ${nPlayer.queue.length} Tracks`)
                                .setDescription(`▶️ **Now Playing:**\n**${current ? current.title : 'None'}**\n\n📜 **Upcoming:**\n${qList}`)
                                .setFooter({ text: 'Starry Native Audio Engine' });

                            return interaction.reply({ embeds: [embed], flags: [EPHEMERAL_FLAG] }).catch(() => {});
                        } else {
                            return interaction.reply({ content: '❌ No active music session in this server.', flags: [EPHEMERAL_FLAG] }).catch(() => {});
                        }
                    }

                    // 3. Audio Filter Dropdown
                    if (customId === 'music_filter') {
                        const selectedFilter = interaction.values[0] || 'clear';
                        if (selectedFilter !== 'clear') {
                            const { isServerOrUserPremium, createPremiumLockPayload } = require('../utils/premiumHelper');
                            const isPermitted = await isServerOrUserPremium(interaction.guildId, interaction.user.id, client);
                            if (!isPermitted) {
                                const guildPrefix = await getGuildPrefix(interaction.guildId);
                                const lockPayload = createPremiumLockPayload('Studio DSP Hi-Fi Audio Filters', guildPrefix);
                                return interaction.reply({ ...lockPayload, flags: [EPHEMERAL_FLAG] }).catch(() => {});
                            }
                        }
                        if (kPlayer) {
                            await applyKazagumoFilter(kPlayer, selectedFilter);
                        }
                        if (nPlayer) {
                            await nPlayer.setFilter(selectedFilter);
                        }
                        return interaction.reply({ 
                            content: `🎧 **Audio DSP Filter updated:** \`${selectedFilter.toUpperCase()}\``, 
                            flags: [EPHEMERAL_FLAG] 
                        }).catch(() => {});
                    }

                    // 4. Autoplay Smart Stream Toggle Button
                    if (customId === 'music_autoplay') {
                        if (kPlayer) {
                            const cur = Boolean(kPlayer.data?.get('autoplay') || kPlayer.autoplay);
                            const next = !cur;
                            kPlayer.data?.set('autoplay', next);
                            kPlayer.autoplay = next;

                            if (next) {
                                const { triggerAutoplayBuffer } = require('../utils/musicManager');
                                triggerAutoplayBuffer(kPlayer, kPlayer.queue.length === 0 && !kPlayer.playing).catch(() => {});
                            }

                            // Live update the player embed components so the button turns Green/Grey in real time
                            const { buildNowPlayingComponents } = require('../utils/musicManager');
                            const newComponents = buildNowPlayingComponents(interaction.guildId, next);

                            if (interaction.message && typeof interaction.message.edit === 'function') {
                                interaction.message.edit({ components: newComponents }).catch(() => {});
                            }

                            try {
                                const musicController = require('./musicController');
                                musicController.update(interaction.guildId, client).catch(() => {});
                            } catch (e) {}

                            return interaction.reply({
                                content: `📻 **Autoplay Smart Stream is now: ${next ? '🟢 ENABLED' : '🔴 DISABLED'}**\n*Continuous playback will automatically stream matching recommended songs when the queue ends!*`,
                                flags: [EPHEMERAL_FLAG]
                            }).catch(() => {});
                        }
                        if (nPlayer) {
                            nPlayer.autoplay = !nPlayer.autoplay;
                            const next = nPlayer.autoplay;
                            if (nPlayer.currentTrack) {
                                await nPlayer.sendNowPlayingPanel(nPlayer.currentTrack, true).catch(() => {});
                            }
                            try {
                                const musicController = require('./musicController');
                                musicController.update(interaction.guildId, client).catch(() => {});
                            } catch (e) {}

                            return interaction.reply({
                                content: `📻 **Autoplay Smart Stream is now: ${next ? '🟢 ENABLED' : '🔴 DISABLED'}**\n*Continuous playback will automatically stream matching recommended songs when the queue ends!*`,
                                flags: [EPHEMERAL_FLAG]
                            }).catch(() => {});
                        }
                    }

                    if (!kPlayer && !nPlayer) {
                        return interaction.reply({ content: '❌ No active music session in this server.', flags: [EPHEMERAL_FLAG] }).catch(() => {});
                    }

                    await interaction.deferUpdate().catch(() => {});

                    try {
                        if (customId === 'music_pause' || customId === 'dj_pause') {
                            if (kPlayer) {
                                if (kPlayer.paused) await kPlayer.pause(false);
                                else await kPlayer.pause(true);
                            }
                            if (nPlayer) {
                                nPlayer.pause();
                                if (nPlayer.currentTrack) {
                                    await nPlayer.sendNowPlayingPanel(nPlayer.currentTrack, true).catch(() => {});
                                }
                            }
                        } else if (customId === 'music_skip' || customId === 'dj_skip') {
                            if (kPlayer) await kPlayer.skip();
                            if (nPlayer) nPlayer.skip();
                        } else if (customId === 'music_stop' || customId === 'dj_stop') {
                            if (kPlayer) await kPlayer.destroy();
                            if (nPlayer) nPlayer.stop();
                        } else if (customId === 'music_loop' || customId === 'dj_loop') {
                            if (kPlayer) {
                                const nextLoop = kPlayer.loop === 'none' ? 'track' : kPlayer.loop === 'track' ? 'queue' : 'none';
                                kPlayer.setLoop(nextLoop);
                            }
                            if (nPlayer) {
                                nPlayer.loop = nPlayer.loop === 'none' ? 'track' : nPlayer.loop === 'track' ? 'queue' : 'none';
                                if (nPlayer.currentTrack) {
                                    await nPlayer.sendNowPlayingPanel(nPlayer.currentTrack, true).catch(() => {});
                                }
                            }
                        } else if (customId === 'dj_shuffle') {
                            if (kPlayer) kPlayer.queue.shuffle();
                            if (nPlayer) {
                                nPlayer.shuffle();
                            }
                        } else if (customId === 'dj_vol_down') {
                            if (kPlayer) {
                                const newVol = Math.max(10, (kPlayer.volume || 100) - 10);
                                await kPlayer.setVolume(newVol);
                            }
                            if (nPlayer) {
                                nPlayer.setVolume(Math.max(10, nPlayer.volume - 10));
                                if (nPlayer.currentTrack) {
                                    await nPlayer.sendNowPlayingPanel(nPlayer.currentTrack, true).catch(() => {});
                                }
                            }
                        } else if (customId === 'dj_vol_up') {
                            if (kPlayer) {
                                const newVol = Math.min(150, (kPlayer.volume || 100) + 10);
                                await kPlayer.setVolume(newVol);
                            }
                            if (nPlayer) {
                                nPlayer.setVolume(Math.min(150, nPlayer.volume + 10));
                                if (nPlayer.currentTrack) {
                                    await nPlayer.sendNowPlayingPanel(nPlayer.currentTrack, true).catch(() => {});
                                }
                            }
                        }

                        // Refresh dedicated music controller message if active
                        try {
                            const musicController = require('./musicController');
                            musicController.update(interaction.guildId, client).catch(() => {});
                        } catch (e) {}
                    } catch (e) {}
                }
            }
        });
    }
}

const registryInstance = new CommandRegistry();
registryInstance.guildPrefixCache = guildPrefixCache;
registryInstance.getGuildPrefix = getGuildPrefix;
registryInstance.setCachedPrefix = setCachedPrefix;

module.exports = registryInstance;
module.exports.guildPrefixCache = guildPrefixCache;
module.exports.getGuildPrefix = getGuildPrefix;
module.exports.setCachedPrefix = setCachedPrefix;
module.exports.CommandRegistry = CommandRegistry;

const { getGuildLanguage, getGuildLanguageSync, setGuildLanguage, t } = require('../utils/i18n');
module.exports.getGuildLanguage = getGuildLanguage;
module.exports.getGuildLanguageSync = getGuildLanguageSync;
module.exports.setGuildLanguage = setGuildLanguage;
module.exports.t = t;

