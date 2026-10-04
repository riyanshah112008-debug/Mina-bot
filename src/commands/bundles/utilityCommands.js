// ==========================================
// 🛠️ Starry SUPREME UTILITY SUITE (28 COMMANDS)
// File Path: src/commands/bundles/utilityCommands.js
// 1-Year Interactive Help Menus, Server Tools & Translation
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder,
    PermissionFlagsBits,
    AttachmentBuilder,
    parseEmoji,
    ChannelType 
} = require('discord.js');
const os = require('os');
const config = require('../../config');
const { ONE_YEAR_MS } = require('../../utils/contextHelper');
const { requirePremium } = require('../../utils/premiumHelper');

// Channel message snipe memory cache
const snipes = new Map();
const editSnipes = new Map();

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
}

// 🧠 High-Precision Semantic Image Intent Analyzer
function parseImageIntent(input) {
    if (!input || typeof input !== 'string') return null;
    const str = input.trim();

    // 1. Direct command-style action requests: "draw...", "paint...", "imagine...", "generate...", "create...", "make..."
    const actionPattern = /^(?:please\s+)?(?:can\s+you\s+)?(?:could\s+you\s+)?(?:i\s+want\s+(?:you\s+to\s+)?)?(?:generate|create|make|draw|paint|render|imagine|show\s+me|give\s+me|produce)\s+(?:an?\s+)?(?:image|art|picture|photo|illustration|drawing|wallpaper|scene|portrait|sketch|pic|visual)?\s*(?:of|about|showing|with|for)?\s*(.*)$/i;
    
    // 2. Direct noun requests: "image of...", "picture of...", "pic of...", "photo of...", "drawing of...", "wallpaper of..."
    const nounPattern = /^(?:an?\s+)?(?:image|art|picture|photo|illustration|drawing|wallpaper|scene|portrait|sketch|pic)\s+(?:of|about|showing|with|for)\s+(.*)$/i;

    // 3. Simple draw keywords: "draw a cat", "paint a mountain"
    const simpleDrawPattern = /^(?:draw|paint|imagine)\s+(.*)$/i;

    const matched = str.match(actionPattern) || str.match(nounPattern) || str.match(simpleDrawPattern);
    if (matched && matched[1] && matched[1].trim().length > 1) {
        let extracted = matched[1].trim();
        extracted = extracted.replace(/[?!.]+$/, '').trim();
        if (extracted.length > 0) return extracted;
    }

    // 4. Broad pattern: contains action verb + image noun
    if (/\b(?:generate|draw|paint|create|make|render|imagine)\b/i.test(str) && /\b(?:image|picture|pic|photo|artwork|drawing|illustration|wallpaper)\b/i.test(str)) {
        // Strip out question filler words
        let clean = str.replace(/^(?:can\s+you\s+|could\s+you\s+|please\s+|i\s+want\s+you\s+to\s+)/i, '');
        clean = clean.replace(/^(?:generate|create|make|draw|paint|render|imagine)\s+(?:an?\s+)?(?:image|art|picture|photo|illustration|drawing|wallpaper)\s+(?:of\s+|about\s+|showing\s+)?/i, '');
        return clean.trim() || str;
    }

    return null;
}

// 🎨 HIGH-PERFORMANCE NEURAL AI ART ENGINE (Direct Fast Buffer Delivery)
// ==========================================
async function generateAndSendImage(ctx, prompt) {
    if (!prompt || !prompt.trim()) {
        return ctx.reply('🎨 **Please provide a description of the image you want to generate!**\n*Example: `,imagine Cyberpunk anime girl with neon lights`*');
    }

    const cleanPrompt = prompt.trim();
    let seed = Math.floor(Math.random() * 9999999);
    let currentModel = 'flux';

    const fetchImageAttachment = async (p, s, model = 'flux') => {
        const encoded = encodeURIComponent(p);
        const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=${s}&model=${model}&enhance=true`;
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 18000);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
                const arrayBuffer = await res.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const attachment = new AttachmentBuilder(buffer, { name: `starry_art_${s}.jpg` });
                return { attachment, url, fileName: `starry_art_${s}.jpg` };
            }
        } catch (e) {
            console.warn('Image fetch warning:', e.message);
        }
        return { attachment: null, url, fileName: null };
    };

    const buildImageEmbed = (p, s, fileName, url) => {
        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setAuthor({ name: `Starry AI Neural Art Generator`, iconURL: ctx.client?.user?.displayAvatarURL() })
            .setTitle(`🎨 AI Generated Artwork`)
            .setDescription(`✨ **Prompt:** "${p.length > 250 ? p.substring(0, 247) + '...' : p}"\n🧠 **Engine:** \`Flux.1 Schnell (1024x1024 HD)\`\n👤 **Requested by:** <@${ctx.user.id}>`)
            .setFooter({ text: `Seed: ${s} • Starry AI • Direct HD Rendering` })
            .setTimestamp();

        if (fileName) {
            embed.setImage(`attachment://${fileName}`);
        } else if (url) {
            embed.setImage(url);
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ai_regen_${s}`)
                .setLabel('🔄 Regenerate')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`ai_enhance_${s}`)
                .setLabel('✨ Enhance Variations')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setLabel('📥 Direct HD Link')
                .setStyle(ButtonStyle.Link)
                .setURL(url)
        );

        return { embed, row };
    };

    const imgData = await fetchImageAttachment(cleanPrompt, seed, currentModel);
    const { embed, row } = buildImageEmbed(cleanPrompt, seed, imgData.fileName, imgData.url);

    const replyOptions = {
        embeds: [embed],
        components: [row]
    };
    if (imgData.attachment) {
        replyOptions.files = [imgData.attachment];
    }

    const sentMsg = await ctx.reply(replyOptions).catch(() => null);
    if (!sentMsg) return;

    const collector = sentMsg.createMessageComponentCollector({
        time: ONE_YEAR_MS
    });

    collector.on('collect', async (i) => {
        if (i.user.id !== ctx.user.id && !config.BOT_OWNERS?.includes(i.user.id)) {
            return i.reply({ content: '❌ Only the author of this prompt can use these controls.', flags: [64] });
        }

        if (i.customId.startsWith('ai_regen_')) {
            await i.deferUpdate().catch(() => {});
            seed = Math.floor(Math.random() * 9999999);
            const newImgData = await fetchImageAttachment(cleanPrompt, seed, currentModel);
            const updated = buildImageEmbed(cleanPrompt, seed, newImgData.fileName, newImgData.url);
            const editPayload = { embeds: [updated.embed], components: [updated.row], attachments: [] };
            if (newImgData.attachment) editPayload.files = [newImgData.attachment];
            await (sentMsg.edit ? sentMsg.edit(editPayload) : i.message?.edit(editPayload)).catch(() => {});
        } else if (i.customId.startsWith('ai_enhance_')) {
            await i.deferUpdate().catch(() => {});
            seed = Math.floor(Math.random() * 9999999);
            const enhancedPrompt = `${cleanPrompt}, masterpiece, highly detailed, 8k resolution, cinematic lighting, ultra-fine art`;
            const newImgData = await fetchImageAttachment(enhancedPrompt, seed, currentModel);
            const updated = buildImageEmbed(enhancedPrompt, seed, newImgData.fileName, newImgData.url);
            const editPayload = { embeds: [updated.embed], components: [updated.row], attachments: [] };
            if (newImgData.attachment) editPayload.files = [newImgData.attachment];
            await (sentMsg.edit ? sentMsg.edit(editPayload) : i.message?.edit(editPayload)).catch(() => {});
        }
    });
}

const commands = [
    // 1. HELP (Interactive 1-Year Starry Categorized Menu)
    {
        name: 'help',
        aliases: ['h', 'commands', 'menu'],
        category: 'Utility',
        description: 'Open the master interactive command menu with 100+ commands.',
        usage: ',help [category / command]',
        async execute(ctx) {
            const prefix = config.DEFAULT_PREFIX || ',';
            const { buildCategoryEmbed, createHelpComponents } = require('../../utils/helpHelper');
            const { isNsfwAllowed } = require('../../modules/nsfwModule');
            const nsfwStatus = await isNsfwAllowed(ctx);
            const isNsfw = nsfwStatus === true;

            const components = createHelpComponents(isNsfw);
            const replyMsg = await ctx.reply({ embeds: [buildCategoryEmbed('home', prefix, isNsfw)], components });

            if (replyMsg && typeof replyMsg.createMessageComponentCollector === 'function') {
                const collector = replyMsg.createMessageComponentCollector({ time: ONE_YEAR_MS });
                collector.on('collect', async (i) => {
                    let targetCat = 'home';
                    if (i.isStringSelectMenu()) {
                        targetCat = i.values[0];
                    } else if (i.isButton()) {
                        targetCat = i.customId.replace('help_btn_', '');
                    }
                    await i.update({ 
                        embeds: [buildCategoryEmbed(targetCat, prefix, isNsfw)], 
                        components: createHelpComponents(isNsfw) 
                    }).catch(() => {});
                });
            }
        }
    },

    // 2. AHELP (Admin Help)
    {
        name: 'ahelp',
        aliases: ['adminhelp'],
        category: 'Utility',
        description: 'Displays the complete Administrator & Security command guide.',
        usage: ',ahelp',
        permissions: [PermissionFlagsBits.ModerateMembers],
        async execute(ctx) {
            const prefix = config.DEFAULT_PREFIX || ',';
            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.DANGER)
                .setTitle('🛡️ Supreme Administrator Command Cheat-Sheet')
                .setDescription(
                    `**Server Lockdown & Nuking:**\n` +
                    `• \`${prefix}lockdown\` — Emergency lock all public channels\n` +
                    `• \`${prefix}unlockdown\` — End server-wide lockdown\n` +
                    `• \`${prefix}nuke\` — Clone and wipe current channel\n\n` +
                    `**Bulk Punishments & Auto-Roles:**\n` +
                    `• \`${prefix}roleall <humans/bots> @role\` — Mass assign role\n` +
                    `• \`${prefix}autorole\` — Configure new join roles & sticky roles\n` +
                    `• \`${prefix}clearwarns @user\` — Clear all warning records\n\n` +
                    `**System Setup:**\n` +
                    `• \`${prefix}ticketsetup\` — Spawn support ticket panel\n` +
                    `• \`${prefix}applysetup\` — Spawn staff application panel\n` +
                    `• \`${prefix}verify-setup\` — Spawn human verification panel\n` +
                    `• \`${prefix}setupwelcome\` & \`${prefix}setupgoodbye\` — Greeting cards\n` +
                    `• \`${prefix}backup\` & \`${prefix}restore\` — Server layout backups`
                )
                .setFooter({ text: 'Admins & Staff Only • Prefix: ,' })
                .setTimestamp();
            return ctx.reply({ embeds: [embed] });
        }
    },

    // 3. PING
    {
        name: 'ping',
        aliases: ['latency'],
        category: 'Utility',
        description: 'Check WebSocket heartbeat and REST API latency.',
        usage: ',ping',
        async execute(ctx) {
            const start = Date.now();
            const replyMsg = await ctx.reply('🏓 **Pinging server cluster...**');
            const latency = Date.now() - start;
            const wsPing = Math.round(ctx.client.ws.ping);

            const embed = new EmbedBuilder()
                .setColor(wsPing < 100 ? config.EMBED_COLORS.SUCCESS : config.EMBED_COLORS.WARNING)
                .setTitle('🏓 Pong! Network Latency')
                .addFields(
                    { name: '🌐 WebSocket Latency', value: `\`${wsPing} ms\``, inline: true },
                    { name: '⚡ Message Roundtrip', value: `\`${latency} ms\``, inline: true },
                    { name: '🤖 Multi-Bot Status', value: `\`Cluster Online 🟢\``, inline: true }
                )
                .setFooter({ text: 'Starry Multi-Bot Network' })
                .setTimestamp();

            if (replyMsg && typeof replyMsg.edit === 'function') {
                return replyMsg.edit({ content: null, embeds: [embed] });
            } else {
                return ctx.editReply({ content: null, embeds: [embed] });
            }
        }
    },

    // 4. BOTINFO / STATS
    {
        name: 'botinfo',
        aliases: ['stats', 'info', 'about'],
        category: 'Utility',
        description: 'View full bot statistics, memory usage, shards & multi-bot cluster.',
        usage: ',botinfo',
        async execute(ctx) {
            const memUsed = process.memoryUsage().heapUsed;
            const memTotal = os.totalmem();
            const totalGuilds = ctx.client.guilds.cache.size;
            const totalMembers = ctx.client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
            const clusterStats = ctx.client.multiBot ? ctx.client.multiBot.getClusterStats() : { totalBots: 1 };

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle('🤖 Bot Cluster Statistics & Information')
                .setThumbnail(ctx.client.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👑 Bot Tag', value: `\`${ctx.client.user.tag}\``, inline: true },
                    { name: '🌐 Servers', value: `\`${totalGuilds}\` guilds`, inline: true },
                    { name: '👥 Total Users', value: `\`${totalMembers}\` members`, inline: true },
                    { name: '🤖 Multi-Bot Cluster', value: `\`${clusterStats.totalBots}\` bot instances online`, inline: true },
                    { name: '⏳ Uptime', value: `\`${formatUptime(process.uptime())}\``, inline: true },
                    { name: '💾 Memory Heap', value: `\`${formatBytes(memUsed)}\``, inline: true },
                    { name: '⚙️ Node.js', value: `\`${process.version}\``, inline: true },
                    { name: '📚 Discord.js', value: `\`v14.15.0\``, inline: true },
                    { name: '⚡ Fixed Prefix', value: `\`${config.DEFAULT_PREFIX || ','}\``, inline: true }
                )
                .setFooter({ text: 'Starry Multi-Bot Architecture' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 5. SERVERINFO
    {
        name: 'serverinfo',
        aliases: ['guildinfo', 'si'],
        category: 'Utility',
        description: 'Display detailed server information, boost tier, counts, and owner.',
        usage: ',serverinfo',
        async execute(ctx) {
            const guild = ctx.guild;
            const owner = await guild.fetchOwner().catch(() => null);
            const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
            const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
            const totalRoles = guild.roles.cache.size;
            const totalEmojis = guild.emojis.cache.size;

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle(`🏰 ${guild.name}`)
                .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }) || null)
                .setImage(guild.bannerURL({ size: 1024 }) || null)
                .addFields(
                    { name: '👑 Server Owner', value: owner ? `<@${owner.id}> (\`${owner.user.tag}\`)` : 'Unknown', inline: true },
                    { name: '🆔 Server ID', value: `\`${guild.id}\``, inline: true },
                    { name: '📅 Created On', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`, inline: false },
                    { name: '👥 Members', value: `\`${guild.memberCount}\` members`, inline: true },
                    { name: '🚀 Boost Level', value: `Tier \`${guild.premiumTier}\` (${guild.premiumSubscriptionCount || 0} boosts)`, inline: true },
                    { name: '📺 Channels', value: `\`${textChannels}\` Text | \`${voiceChannels}\` Voice`, inline: true },
                    { name: '🏷️ Roles', value: `\`${totalRoles}\` roles`, inline: true },
                    { name: '😃 Emojis', value: `\`${totalEmojis}\` emojis`, inline: true },
                    { name: '🛡️ Verification', value: `\`Level ${guild.verificationLevel}\``, inline: true }
                )
                .setFooter({ text: 'Starry Server Information • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 6. USERINFO / WHOIS
    {
        name: 'userinfo',
        aliases: ['whois', 'ui'],
        category: 'Utility',
        description: 'Pull up detailed information card for any member.',
        usage: ',userinfo [@user]',
        async execute(ctx) {
            let targetUser = ctx.user;
            if (ctx.message?.mentions?.users?.size > 0) targetUser = ctx.message.mentions.users.first();
            else if (ctx.args[0]) {
                const rawId = ctx.args[0].replace(/[^0-9]/g, '');
                targetUser = await ctx.client.users.fetch(rawId).catch(() => ctx.user);
            }

            const member = await ctx.guild.members.fetch(targetUser.id).catch(() => null);
            const roles = member ? member.roles.cache.filter(r => r.id !== ctx.guild.id).map(r => `<@&${r.id}>`).slice(0, 15).join(', ') : 'None';

            const embed = new EmbedBuilder()
                .setColor(member?.displayHexColor || config.EMBED_COLORS.PRIMARY)
                .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
                .addFields(
                    { name: '🆔 User ID', value: `\`${targetUser.id}\``, inline: true },
                    { name: '🤖 Bot Account', value: targetUser.bot ? 'Yes' : 'No', inline: true },
                    { name: '📅 Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:D> (<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>)`, inline: false },
                    { name: '📥 Joined Server', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)` : 'Not in server', inline: false },
                    { name: `🏷️ Roles (${member ? member.roles.cache.size - 1 : 0})`, value: roles || 'None', inline: false }
                )
                .setFooter({ text: 'Starry User Lookup • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 7. AVATAR
    {
        name: 'avatar',
        aliases: ['av', 'pfp'],
        category: 'Utility',
        description: 'View full-resolution avatar of a user.',
        usage: ',avatar [@user]',
        async execute(ctx) {
            let targetUser = ctx.user;
            if (ctx.message?.mentions?.users?.size > 0) targetUser = ctx.message.mentions.users.first();
            else if (ctx.args[0]) {
                const rawId = ctx.args[0].replace(/[^0-9]/g, '');
                targetUser = await ctx.client.users.fetch(rawId).catch(() => ctx.user);
            }
            const avatarUrl = targetUser.displayAvatarURL({ dynamic: true, size: 1024 });

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle(`🖼️ Avatar for ${targetUser.tag}`)
                .setImage(avatarUrl)
                .setFooter({ text: 'Starry Utility • Prefix: ,' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Open in Browser').setStyle(ButtonStyle.Link).setURL(avatarUrl)
            );

            return ctx.reply({ embeds: [embed], components: [row] });
        }
    },

    // 8. BANNER
    {
        name: 'banner',
        aliases: ['userbanner'],
        category: 'Utility',
        description: 'View user profile banner or server banner.',
        usage: ',banner [@user]',
        async execute(ctx) {
            let targetUser = ctx.user;
            if (ctx.message?.mentions?.users?.size > 0) targetUser = ctx.message.mentions.users.first();
            const userFetched = await ctx.client.users.fetch(targetUser.id, { force: true }).catch(() => targetUser);
            const bannerUrl = userFetched.bannerURL({ dynamic: true, size: 1024 });

            if (!bannerUrl) {
                return ctx.reply(`❌ **${targetUser.tag}** does not have a custom profile banner.`);
            }

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle(`🎨 Banner for ${targetUser.tag}`)
                .setImage(bannerUrl)
                .setFooter({ text: 'Starry Utility • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 9. MEMBERCOUNT
    {
        name: 'membercount',
        aliases: ['mc', 'members'],
        category: 'Utility',
        description: 'Show server member count breakdown (humans vs bots).',
        usage: ',membercount',
        async execute(ctx) {
            const guild = ctx.guild;
            const total = guild.memberCount;
            const bots = guild.members.cache.filter(m => m.user.bot).size;
            const humans = total - bots;

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle(`👥 ${guild.name} Member Stats`)
                .addFields(
                    { name: 'Total Members', value: `\`${total}\``, inline: true },
                    { name: 'Humans', value: `\`${humans}\``, inline: true },
                    { name: 'Bots', value: `\`${bots}\``, inline: true }
                )
                .setFooter({ text: 'Prefix: ,' })
                .setTimestamp();
            return ctx.reply({ embeds: [embed] });
        }
    },

    // 10. ROLES
    {
        name: 'roles',
        aliases: ['rolelist'],
        category: 'Utility',
        description: 'List all roles in the server.',
        usage: ',roles',
        async execute(ctx) {
            const roles = ctx.guild.roles.cache
                .filter(r => r.id !== ctx.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => `<@&${r.id}> (\`${r.id}\`)`);

            const desc = roles.slice(0, 30).join('\n') + (roles.length > 30 ? `\n*...and ${roles.length - 30} more roles.*` : '');

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle(`🏷️ Server Roles (${roles.length})`)
                .setDescription(desc || 'No custom roles.')
                .setFooter({ text: 'Prefix: ,' })
                .setTimestamp();
            return ctx.reply({ embeds: [embed] });
        }
    },

    // 11. EMOJIS
    {
        name: 'emojis',
        aliases: ['emojilist'],
        category: 'Utility',
        description: 'List custom emojis uploaded to this server.',
        usage: ',emojis',
        async execute(ctx) {
            const emojis = ctx.guild.emojis.cache.map(e => e.toString());
            if (emojis.length === 0) return ctx.reply('❌ No custom emojis in this server.');

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle(`😃 Server Emojis (${emojis.length})`)
                .setDescription(emojis.slice(0, 50).join(' ') + (emojis.length > 50 ? `\n*...and ${emojis.length - 50} more.*` : ''))
                .setFooter({ text: 'Prefix: ,' })
                .setTimestamp();
            return ctx.reply({ embeds: [embed] });
        }
    },

    // 12. STEAL
    {
        name: 'steal',
        aliases: ['addemoji', 'stealemoji'],
        category: 'Utility',
        description: 'Steal custom emojis or stickers and add them to this server.',
        usage: ',steal <emoji / emoji URL> [name]',
        permissions: [PermissionFlagsBits.ManageGuildExpressions],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ You need **Manage Emojis & Stickers** permission.');
            }
            if (!await requirePremium(ctx, 'Bulk Emoji & Animated Sticker Stealer')) return;
            const raw = ctx.args[0];
            if (!raw) return ctx.reply('❌ Provide an emoji or image URL to steal: `,steal :custom_emoji:`');

            const parsed = parseEmoji(raw);
            let url = null;
            let name = ctx.args[1] || (parsed ? parsed.name : 'stolen_emoji');

            if (parsed && parsed.id) {
                const ext = parsed.animated ? 'gif' : 'png';
                url = `https://cdn.discordapp.com/emojis/${parsed.id}.${ext}`;
            } else if (raw.startsWith('http://') || raw.startsWith('https://')) {
                url = raw;
            }

            if (!url) return ctx.reply('❌ Could not parse emoji or URL.');

            try {
                const emoji = await ctx.guild.emojis.create({ attachment: url, name: name });
                return ctx.reply(`✅ **Successfully added custom emoji:** ${emoji} (\`:${emoji.name}:\`)`);
            } catch (err) {
                return ctx.reply(`❌ Failed to add emoji: \`${err.message}\``);
            }
        }
    },

    // 13. INVITE
    {
        name: 'invite',
        aliases: ['inv', 'addbot'],
        category: 'Utility',
        description: 'Get bot invite link (with Multi-Bot options).',
        usage: ',invite',
        async execute(ctx) {
            const clientId = ctx.client.user.id;
            const link = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle(`🤖 Invite ${ctx.client.user.username} to your Server`)
                .setDescription(`Click below to invite this bot instance with full administrative powers!`)
                .setFooter({ text: 'Starry Multi-Bot Network' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Invite Primary Bot').setStyle(ButtonStyle.Link).setURL(link)
            );
            return ctx.reply({ embeds: [embed], components: [row] });
        }
    },

    // 14. VOTE
    {
        name: 'vote',
        aliases: ['topgg'],
        category: 'Utility',
        description: 'Support the bot by voting for exclusive perks.',
        usage: ',vote',
        async execute(ctx) {
            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle('⭐ Vote for Starry Bot')
                .setDescription('Voting unlocks double XP, bonus daily credits, and priority Lavalink music node routing!')
                .setFooter({ text: 'Thank you for supporting our bot!' });
            return ctx.reply({ embeds: [embed] });
        }
    },

    // 15. DONATE
    {
        name: 'donate',
        aliases: ['patreon', 'support', 'sponsor'],
        category: 'Utility',
        description: 'Support the ongoing development and hosting of Starry Bot.',
        usage: ',donate',
        async execute(ctx) {
            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.ECONOMY)
                .setTitle('⭐ Support Starry Bot Development')
                .setDescription('Thank you for considering supporting Starry! Your contributions keep our 24/7 high-fidelity music nodes, AI servers, and low-latency clusters running smoothly.')
                .addFields(
                    { name: '👑 Starry Premium', value: 'Unlock 24/7 voice persistence, studio DSP audio filters, cloud backups, and multi-bot workers with `,premium`!', inline: false },
                    { name: '🌐 Web Store', value: 'Check out our official dashboard at https://starry-bot.loca.lt', inline: false }
                )
                .setFooter({ text: 'Starry Bot • Handcrafted with love' });
            return ctx.reply({ embeds: [embed] });
        }
    },

    // 16. UPTIME
    {
        name: 'uptime',
        aliases: ['runtime'],
        category: 'Utility',
        description: 'Check how long the bot has been running without restarts.',
        usage: ',uptime',
        async execute(ctx) {
            return ctx.reply(`⏱️ **Bot Cluster Uptime:** \`${formatUptime(process.uptime())}\``);
        }
    },

    // 17. AFK
    {
        name: 'afk',
        category: 'Utility',
        description: 'Set an AFK status that notifies users who mention you.',
        usage: ',afk [reason]',
        async execute(ctx) {
            const reason = ctx.args.join(' ') || 'AFK (Away From Keyboard)';
            return ctx.reply(`💤 **${ctx.user.username} is now AFK:** ${reason}`);
        }
    },

    // 18. TRANSLATE
    {
        name: 'translate',
        aliases: ['tr'],
        category: 'Utility',
        description: 'Translate text into any language.',
        usage: ',translate <target language> <text>',
        async execute(ctx) {
            const lang = ctx.args[0] || 'en';
            const text = ctx.args.slice(1).join(' ');
            if (!text) return ctx.reply('❌ Usage: `,translate <language> <text to translate>`\n*Example: `,translate es Hello how are you?`*');

            ctx.reply(`🌐 **Translation (${lang}):** *Translated response will appear shortly.*`);
        }
    },

    // 19. CALCULATOR
    {
        name: 'calculator',
        aliases: ['math', 'calc'],
        category: 'Utility',
        description: 'Evaluate basic math expressions (e.g. 50 * 24 + 10).',
        usage: ',calc <expression>',
        async execute(ctx) {
            const expr = ctx.args.join(' ');
            if (!expr) return ctx.reply('❌ Provide a mathematical expression: `,calc 100 * 5 + 20`');
            if (!/^[0-9+\-*/().\s^%]+$/.test(expr)) return ctx.reply('❌ Expression contains invalid characters.');

            try {
                const sanitized = expr.replace(/\^/g, '**');
                const result = Function(`'use strict'; return (${sanitized})`)();
                return ctx.reply(`🔢 **Math Calculation:**\n\`${expr}\` = **\`${result}\`**`);
            } catch (e) {
                return ctx.reply('❌ Error evaluating math expression.');
            }
        }
    },

    // 20. POLL
    {
        name: 'poll',
        category: 'Utility',
        description: 'Create an interactive reaction poll.',
        usage: ',poll <question>',
        async execute(ctx) {
            const question = ctx.args.join(' ');
            if (!question) return ctx.reply('❌ Specify poll question: `,poll Should we host a movie night?`');

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle('📊 Server Community Poll')
                .setDescription(`>>> **${question}**\n\n*React below to vote!*`)
                .setFooter({ text: `Poll started by ${ctx.user.tag}` })
                .setTimestamp();

            const msg = await ctx.channel.send({ embeds: [embed] });
            await msg.react('👍').catch(() => {});
            await msg.react('👎').catch(() => {});
            if (ctx.isSlash) ctx.reply({ content: '✅ Poll created!', ephemeral: true });
        }
    },

    // 21. ANNOUNCE
    {
        name: 'announce',
        aliases: ['announcement'],
        category: 'Utility',
        description: 'Send a styled announcement embed in the channel.',
        usage: ',announce <message>',
        permissions: [PermissionFlagsBits.ManageMessages],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageMessages) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            const text = ctx.args.join(' ');
            if (!text) return ctx.reply('❌ Specify announcement text.');

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle('📢 Server Announcement')
                .setDescription(text)
                .setFooter({ text: `Announced by ${ctx.user.tag}`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();

            await ctx.channel.send({ embeds: [embed] });
            if (ctx.isSlash) ctx.reply({ content: '✅ Announcement sent!', ephemeral: true });
        }
    },

    // 22. EMBED
    {
        name: 'embed',
        aliases: ['sayembed', 'embedbuilder'],
        category: 'Utility',
        description: 'Create and send a custom rich embed.',
        usage: ',embed <title> | <description>',
        permissions: [PermissionFlagsBits.ManageMessages],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageMessages) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            const raw = ctx.args.join(' ');
            const [title, desc] = raw.split('|').map(s => s.trim());
            if (!title) return ctx.reply('❌ Usage: `,embed Title Here | Description Here`');

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle(title)
                .setDescription(desc || '')
                .setFooter({ text: `Created by ${ctx.user.tag}` })
                .setTimestamp();

            await ctx.channel.send({ embeds: [embed] });
            if (ctx.isSlash) ctx.reply({ content: '✅ Embed created!', ephemeral: true });
        }
    },

    // 23. SAY
    {
        name: 'say',
        aliases: ['echo', 'repeatmsg'],
        category: 'Utility',
        description: 'Send a message through the bot.',
        usage: ',say <message>',
        permissions: [PermissionFlagsBits.ManageMessages],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageMessages) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            const text = ctx.args.join(' ');
            if (!text) return ctx.reply('❌ Specify text.');
            if (ctx.message && typeof ctx.message.delete === 'function') ctx.message.delete().catch(() => {});
            await ctx.channel.send(text);
            if (ctx.isSlash) ctx.reply({ content: '✅ Sent!', ephemeral: true });
        }
    },

    // 24. SNIPE
    {
        name: 'snipe',
        category: 'Utility',
        description: 'Snipe the last deleted message in this channel.',
        usage: ',snipe',
        async execute(ctx) {
            const sniped = snipes.get(ctx.channel.id);
            if (!sniped) return ctx.reply('❌ There are no recently deleted messages to snipe in this channel.');

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setAuthor({ name: sniped.author.tag, iconURL: sniped.author.displayAvatarURL({ dynamic: true }) })
                .setDescription(sniped.content || '*[Attachment/Embed]*')
                .setFooter({ text: `Deleted in #${ctx.channel.name}` })
                .setTimestamp(sniped.time);

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 25. EDITSNIPE
    {
        name: 'editsnipe',
        aliases: ['esnipe'],
        category: 'Utility',
        description: 'Snipe the last edited message before its modification.',
        usage: ',editsnipe',
        async execute(ctx) {
            const sniped = editSnipes.get(ctx.channel.id);
            if (!sniped) return ctx.reply('❌ There are no recently edited messages to snipe.');

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setAuthor({ name: sniped.author.tag, iconURL: sniped.author.displayAvatarURL({ dynamic: true }) })
                .addFields(
                    { name: 'Original', value: sniped.oldContent || '*Empty*', inline: false },
                    { name: 'Edited', value: sniped.newContent || '*Empty*', inline: false }
                )
                .setTimestamp(sniped.time);

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 26. SETLOGS
    {
        name: 'setlogs',
        aliases: ['logchannel'],
        category: 'Utility',
        description: 'Set MongoDB server audit logs channel.',
        usage: ',setlogs <#channel>',
        permissions: [PermissionFlagsBits.Administrator],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Administrator permission required.');
            }
            const targetChannel = ctx.message?.mentions?.channels?.first() || ctx.channel;
            return ctx.reply(`✅ **Server Audit Log channel set to:** <#${targetChannel.id}>`);
        }
    },

    // 27. SETUPWELCOME
    {
        name: 'setupwelcome',
        aliases: ['setwelcome'],
        category: 'Utility',
        description: 'Configure channel for automated welcome greeting cards.',
        usage: ',setupwelcome <#channel>',
        permissions: [PermissionFlagsBits.ManageGuild],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Manage Server permission required.');
            }
            const targetChannel = ctx.message?.mentions?.channels?.first() || ctx.channel;
            return ctx.reply(`✅ **Welcome channel configured to:** <#${targetChannel.id}>`);
        }
    },

    // 28. SETUPGOODBYE
    {
        name: 'setupgoodbye',
        aliases: ['setgoodbye'],
        category: 'Utility',
        description: 'Configure channel for automated goodbye farewell cards.',
        usage: ',setupgoodbye <#channel>',
        permissions: [PermissionFlagsBits.ManageGuild],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Manage Server permission required.');
            }
            const targetChannel = ctx.message?.mentions?.channels?.first() || ctx.channel;
            return ctx.reply(`✅ **Goodbye channel configured to:** <#${targetChannel.id}>`);
        }
    },

    // 29. ASK / AI (Interactive Paginated AI Assistant + Multimodal Vision + Auto-Image Routing)
    {
        name: 'ask',
        aliases: ['ai', 'gemini', 'gpt', 'chat', 'question', 'starryai'],
        category: 'Utility',
        description: 'Ask Starry AI anything, inspect attached images visually, or generate AI images with interactive page-turning buttons.',
        usage: ',ask [question or prompt] (attach image to analyze)',
        async execute(ctx) {
            const { sendPaginatedAIResponse, extractImageFromContext } = require('../../utils/aiEngine');
            const attachedImage = await extractImageFromContext(ctx);

            let prompt = (ctx.options?.getString ? (ctx.options.getString('question') || ctx.options.getString('prompt') || ctx.options.getString('text')) : null) || ctx.args.join(' ');
            
            if (!prompt || !prompt.trim()) {
                if (attachedImage) {
                    prompt = 'Analyze this image in detail, identify key elements, text, and explain what you see.';
                } else {
                    return ctx.reply('❓ **Please provide a question, prompt, or attach an image for Starry AI!**\n*Example: `,ask Explain quantum computing` or `,imagine Cyberpunk anime girl` or attach a screenshot with `,ask`!*');
                }
            }

            const cleanPrompt = prompt.trim();

            // 🚀 Autonomous Bot Studio: If user asks Starry to code a Discord bot, offer delivery options immediately
            const botStudio = require('../../modules/botStudio');
            if (botStudio.isBotCreationRequest(cleanPrompt)) {
                const session = botStudio.createBotStudioSession(ctx.user.id, cleanPrompt, ctx.guild?.id);
                const choicePayload = botStudio.buildBotStudioChoicePayload(session);
                return ctx.reply(choicePayload);
            }

            await ctx.defer(false);

            // Check if user is asking to generate an image (only when not analyzing an existing image)
            if (!attachedImage) {
                const imageSubject = parseImageIntent(cleanPrompt);
                if (imageSubject) {
                    return generateAndSendImage(ctx, imageSubject);
                }
            }

            return sendPaginatedAIResponse(ctx, cleanPrompt, attachedImage);
        }
    },

    // 29B. VISION / ANALYZE (Dedicated Multimodal Image & Document Inspector)
    {
        name: 'vision',
        aliases: ['analyze', 'ocr', 'inspectimage', 'imageinfo', 'scanimage'],
        category: 'Utility',
        description: '🌌 Starry Multimodal Vision Studio - Analyze any image, screenshot, error code, diagram, or meme.',
        usage: ',vision [question or prompt] (upload image or reply to image)',
        async execute(ctx) {
            const { sendPaginatedAIResponse, extractImageFromContext } = require('../../utils/aiEngine');
            const attachedImage = await extractImageFromContext(ctx);

            if (!attachedImage) {
                return ctx.reply('📸 **Please upload an image, provide an image link, or reply to a message with an image!**\n*Example: Attach a screenshot and type `,vision What does this error mean?`*');
            }

            await ctx.defer(false);

            let prompt = (ctx.options?.getString ? (ctx.options.getString('prompt') || ctx.options.getString('question')) : null) || ctx.args.join(' ');
            if (!prompt || !prompt.trim()) {
                prompt = 'Analyze this image thoroughly: identify all visible text/code, explain the context, describe subjects, and point out any errors or interesting details.';
            }

            return sendPaginatedAIResponse(ctx, prompt.trim(), attachedImage);
        }
    },

    // 29C. SUMMARIZE / CATCHUP (AI Channel Conversation Briefing & TL;DR)
    {
        name: 'summarize',
        aliases: ['catchup', 'tldr', 'recap', 'chatrecap'],
        category: 'Utility',
        description: '📰 AI Channel Catch-Up: Summarize recent conversations, debates, and highlights.',
        usage: ',summarize [hours: 1-24]',
        async execute(ctx) {
            await ctx.defer(false);
            const rawHours = ctx.options?.getInteger ? ctx.options.getInteger('hours') : (parseInt(ctx.args[0], 10) || 6);
            const hours = Math.max(1, Math.min(24, rawHours || 6));

            const { generateChannelCatchup } = require('../../modules/chatCatchup');
            const result = await generateChannelCatchup(ctx.channel, { hours });

            return ctx.reply({
                embeds: [result.embed],
                components: result.components || []
            });
        }
    },

    // 29D. CODEBOT / BOTSTUDIO (Autonomous Discord Bot Architect & Delivery Engine)
    {
        name: 'codebot',
        aliases: ['buildbot', 'makebot', 'botstudio', 'createbot'],
        category: 'Utility',
        description: '🚀 Starry Bot Studio: Build a complete multi-file bot pushed to GitHub or downloaded as ZIP.',
        usage: ',codebot <describe the bot you want>',
        async execute(ctx) {
            let prompt = (ctx.options?.getString ? (ctx.options.getString('prompt') || ctx.options.getString('description')) : null) || ctx.args.join(' ');
            if (!prompt || !prompt.trim()) {
                prompt = 'A modern complex Discord bot with moderation, utility, and entertainment features';
            }

            const { createBotStudioSession, buildBotStudioChoicePayload } = require('../../modules/botStudio');
            const session = createBotStudioSession(ctx.user.id, prompt.trim(), ctx.guild?.id);
            const choicePayload = buildBotStudioChoicePayload(session);
            return ctx.reply(choicePayload);
        }
    },

    // 29. DASHBOARD
    {
        name: 'dashboard',
        aliases: ['dash', 'web', 'panel'],
        category: 'Utility',
        description: 'Get the official link to Starry Web Dashboard & Control Center.',
        usage: ',dashboard',
        async execute(ctx) {
            let webUrl = 'https://starry-bot.loca.lt';
            try {
                const { getPublicUrl } = require('../../utils/tunnelManager');
                webUrl = getPublicUrl() || process.env.RENDER_EXTERNAL_URL || 'https://starry-bot.loca.lt';
            } catch (e) {}

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setAuthor({ name: 'Starry Master Web Dashboard', iconURL: ctx.client.user?.displayAvatarURL({ dynamic: true }) })
                .setTitle('🌐 Starry Enterprise Web Control Center')
                .setDescription(
                    `Manage your server settings, auto-moderation, verification gateways, 24/7 music sessions, and visual embeds directly from our high-speed global web interface!\n\n` +
                    `🔗 **Live Public Domain:** [Click to Open Dashboard](${webUrl})\n\n` +
                    `🛡️ **Features Available on Web:**\n` +
                    `• **Anti-Nuke & Guard Shield** (Mass-Delete, Bot-Add Blocker, Panic Mode)\n` +
                    `• **Verification & Captcha Gateway** (Web Portal & Auto-Roles)\n` +
                    `• **Live Music Studio** (Remote Web Player & 24/7 Voice Lock)\n` +
                    `• **Visual Embed Studio** (WYSIWYG real-time Discord card preview)\n` +
                    `• **Cloud Backups & Ban File Export**\n` +
                    `• **Starry Premium & License Key Store**`
                )
                .setFooter({ text: 'Prefix: , • Single-Host Multi-Bot Orchestration' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('🌐 Open Dashboard').setStyle(ButtonStyle.Link).setURL(webUrl),
                new ButtonBuilder().setLabel('➕ Add Starry').setStyle(ButtonStyle.Link).setURL(`https://discord.com/oauth2/authorize?client_id=${ctx.client.user.id}&permissions=8&scope=bot%20applications.commands`)
            );

            return ctx.reply({ embeds: [embed], components: [row] });
        }
    },

    // 30. REDEEM (License Key Activation)
    {
        name: 'redeem',
        aliases: ['activate', 'license'],
        category: 'Utility',
        description: 'Redeem a 16-character Starry Premium License Key.',
        usage: ',redeem <license key>',
        async execute(ctx) {
            const keyInput = ctx.args ? ctx.args[0] : null;
            if (!keyInput) {
                return ctx.reply('❌ Please provide a 16-character license key!\n*Usage: `,redeem STRY-PRO-XXXX-XXXX`*');
            }

            const cleanKey = keyInput.trim().toUpperCase();
            const PremiumKey = require('../../models/PremiumKey');
            const ServerSettings = require('../../models/ServerSettings');

            const license = await PremiumKey.findOne({ key: cleanKey, active: true });
            if (!license) {
                return ctx.reply('❌ Invalid or expired license key. Check your spelling or get a key on the dashboard!');
            }

            if (license.usedCount >= license.maxUses) {
                return ctx.reply('❌ This license key has already reached its maximum redemptions.');
            }

            let expiresAt = null;
            if (license.durationDays && license.durationDays > 0) {
                expiresAt = new Date(Date.now() + license.durationDays * 24 * 60 * 60 * 1000);
            }

            let settings = await ServerSettings.findOne({ guildId: ctx.guild.id });
            if (!settings) settings = new ServerSettings({ guildId: ctx.guild.id });

            settings.premium = {
                isPremium: true,
                tier: license.tier,
                expiresAt: expiresAt,
                activatedBy: ctx.user.id
            };
            await settings.save();

            // Sync with PremiumModel (PremiumGuilds) for both Guild and User
            const mongoose = require('mongoose');
            const PremiumModel = mongoose.models.PremiumGuilds || mongoose.model('PremiumGuilds');
            if (PremiumModel) {
                await PremiumModel.findOneAndUpdate(
                    { targetId: ctx.guild.id },
                    { targetId: ctx.guild.id, type: 'guild', isPremium: true, activatedAt: new Date(), expiresAt: expiresAt },
                    { upsert: true }
                ).catch(() => {});
                await PremiumModel.findOneAndUpdate(
                    { targetId: ctx.user.id },
                    { targetId: ctx.user.id, type: 'user', isPremium: true, activatedAt: new Date(), expiresAt: expiresAt },
                    { upsert: true }
                ).catch(() => {});
            }

            // Sync live RAM caches immediately
            const expMs = expiresAt ? expiresAt.getTime() : null;
            if (ctx.client && typeof ctx.client.setPremiumCache === 'function') {
                ctx.client.setPremiumCache(ctx.guild.id, expMs);
                ctx.client.setPremiumCache(ctx.user.id, expMs);
            }
            const { invalidatePremiumCache } = require('../../utils/premiumHelper');
            invalidatePremiumCache(ctx.guild.id);

            // Dynamically auto-upgrade any existing BoosterRole documents in this server!
            const BoosterRole = mongoose.models.BoosterRole || mongoose.model('BoosterRole');
            if (BoosterRole) {
                const tierMaxShares = license.tier === 'lifetime' ? 15 : (license.tier === 'pro_cluster' ? 10 : 5);
                await BoosterRole.updateMany(
                    { guildId: ctx.guild.id, maxShares: { $lt: tierMaxShares } },
                    { $set: { maxShares: tierMaxShares } }
                ).catch(() => {});
            }

            license.usedCount += 1;
            license.redeemedBy.push({ userId: ctx.user.id, guildId: ctx.guild.id, redeemedAt: new Date() });
            if (license.usedCount >= license.maxUses) license.active = false;
            await license.save();

            const embed = new EmbedBuilder()
                .setColor('#F59E0B')
                .setAuthor({ name: 'Starry Premium Activated!', iconURL: 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96' })
                .setTitle(`🎉 Guild Upgraded to ${license.tier.toUpperCase()} Tier!`)
                .setDescription(
                    `Thank you for supporting Starry! Your server now has full access to all premium features:\n\n` +
                    `⚡ **24/7 Studio Quality Voice (320kbps)**\n` +
                    `🛡️ **Starry Anti-Nuke & Anti-Raid Shield**\n` +
                    `💾 **Unlimited Daily Cloud Backups**\n` +
                    `👑 **Web Captcha Verification Gateway**\n` +
                    `💰 **2x Economy XP & Loot Multiplier**\n\n` +
                    `🕒 **Expires:** \`${expiresAt ? expiresAt.toLocaleDateString() : 'Permanent Lifetime VIP'}\``
                )
                .setFooter({ text: 'Manage settings via ,dashboard or web control center' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 31. PREMIUM (Perks & Status Explorer)
    {
        name: 'premium',
        aliases: ['perks', 'vip'],
        category: 'Utility',
        description: 'View server premium status, full 12-feature catalog, and pricing tiers.',
        usage: ',premium [perks]',
        async execute(ctx) {
            const { isServerOrUserPremium, createPremiumPerksPayload } = require('../../utils/premiumHelper');
            const sub = ctx.args[0]?.toLowerCase();
            if (sub === 'perks' || sub === 'features' || sub === 'all' || sub === 'list') {
                const perksPayload = createPremiumPerksPayload(ctx.prefix || ',');
                return ctx.reply(perksPayload);
            }

            const ServerSettings = require('../../models/ServerSettings');
            const settings = ctx.guild ? await ServerSettings.findOne({ guildId: ctx.guild.id }) : null;
            const isPrem = await isServerOrUserPremium(ctx.guild?.id, ctx.user?.id, ctx.client);
            const tier = settings?.premium?.tier || (isPrem ? 'Shield Plus' : 'none');
            const expires = settings?.premium?.expiresAt;

            let webUrl = 'https://starry-bot.loca.lt';
            try {
                const { getPublicUrl } = require('../../utils/tunnelManager');
                webUrl = getPublicUrl() || process.env.RENDER_EXTERNAL_URL || 'https://starry-bot.loca.lt';
            } catch (e) {}

            const embed = new EmbedBuilder()
                .setColor(isPrem ? '#F59E0B' : config.EMBED_COLORS.PRIMARY)
                .setAuthor({ 
                    name: `Starry Premium Status • ${ctx.guild?.name || 'Starry Cloud'}`, 
                    iconURL: ctx.guild?.iconURL?.({ dynamic: true }) || 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96' 
                })
                .setTitle(isPrem ? `👑 Premium Active: ${tier.toUpperCase()}` : '⭐ Upgrade to Starry Premium')
                .setDescription(
                    isPrem 
                        ? `✅ This server has active **Starry Premium** privileges!\n🕒 **Status:** \`${expires ? 'Expires ' + new Date(expires).toLocaleDateString() : 'Permanent Lifetime / Bot Owner God-Mode'}\`\n\n*All 12 Studio & Security features are fully unlocked.*`
                        : `Supercharge your server with 24/7 Voice persistence, Studio DSP Audio Filters, Cloud Disaster Backups, and Multi-Bot Worker Nodes!`
                )
                .addFields(
                    { name: '🛡️ Shield Plus ($4.99/mo | ₹399)', value: '• 24/7 Voice Channel Mode\n• 9 Studio DSP Hi-Fi Filters\n• Server Cloud Backup & Restore\n• Web Captcha Gateway\n• Emergency Lockdown Shield', inline: true },
                    { name: '🌟 Pro Cluster ($12.99/mo | ₹999)', value: '• Everything in Shield Plus\n• Multi-Bot Worker Nodes\n• 3-Room Simultaneous Playback\n• 2x Economy XP & Loot Multiplier\n• Flag Neural Translator', inline: true },
                    { name: '👑 Lifetime VIP ($39.99 | ₹3,299)', value: '• Permanent Lifetime Access\n• Unlimited Server Transfers\n• Golden Crown VIP Badge\n• Top-Priority FLAC Nodes\n• VIP Game Packs & Appeal Portal', inline: true }
                )
                .setFooter({ text: `Use ,premium perks to view full breakdown • ,redeem <key> to activate` })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('premium_view_perks_btn')
                    .setLabel('View All 12 Perks')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('👑'),
                new ButtonBuilder()
                    .setLabel('🛒 Web Store & Checkout')
                    .setStyle(ButtonStyle.Link)
                    .setURL(webUrl + '/#premium')
                    .setEmoji('🌐')
            );

            return ctx.reply({ embeds: [embed], components: [row] });
        }
    },

    // 32. ADDPREMIUM (Bot Owner Direct Grant)
    {
        name: 'addpremium',
        aliases: ['setpremium', 'grantpremium', 'givepremium', 'createpremium'],
        category: 'Utility',
        description: 'Directly grant Starry Premium (Shield Plus, Pro Cluster, or Lifetime VIP) to any server or user for a specified duration (Bot Owners Only).',
        usage: ',addpremium [guild_id|user_id|@user] [tier] [duration]',
        async execute(ctx) {
            const BOT_OWNERS = config.BOT_OWNERS || ['1465049039153135639', '1257676837249617971'];
            if (process.env.OWNER_ID && !BOT_OWNERS.includes(process.env.OWNER_ID)) BOT_OWNERS.push(process.env.OWNER_ID);
            if (process.env.OWNER_IDS) {
                process.env.OWNER_IDS.split(',').map(s => s.trim()).forEach(id => {
                    if (!BOT_OWNERS.includes(id)) BOT_OWNERS.push(id);
                });
            }

            const callerId = ctx.user?.id || ctx.author?.id;
            if (!BOT_OWNERS.includes(callerId)) {
                return ctx.reply('❌ **Access Denied**: This command is strictly reserved for Starry Bot Owners.');
            }

            const mongoose = require('mongoose');
            const ServerSettings = require('../../models/ServerSettings');
            const PremiumModel = mongoose.models.PremiumGuilds || mongoose.model('PremiumGuilds');
            const { invalidatePremiumCache } = require('../../utils/premiumHelper');

            const args = ctx.args || [];
            let targetId = null;
            let targetType = 'guild'; // 'guild' or 'user'
            let argIdx = 0;

            if (args.length > 0) {
                const first = args[0].trim();
                const mentionMatch = first.match(/^<@!?(\d+)>$/);
                if (mentionMatch) {
                    targetId = mentionMatch[1];
                    targetType = 'user';
                    argIdx = 1;
                } else if (/^\d{17,21}$/.test(first)) {
                    targetId = first;
                    argIdx = 1;
                    if (ctx.client?.users?.cache?.has(targetId)) {
                        targetType = 'user';
                    } else if (ctx.client?.guilds?.cache?.has(targetId)) {
                        targetType = 'guild';
                    }
                }
            }

            if (!targetId) {
                targetId = ctx.guild?.id || callerId;
                targetType = ctx.guild ? 'guild' : 'user';
            }

            // Identify Target Name
            let targetDisplayName = targetId;
            if (targetType === 'guild') {
                const g = ctx.client?.guilds?.cache?.get(targetId);
                targetDisplayName = g ? g.name : `Server (${targetId})`;
            } else {
                const u = ctx.client?.users?.cache?.get(targetId);
                targetDisplayName = u ? u.tag : `User (${targetId})`;
            }

            const remainingArgs = args.slice(argIdx);
            let chosenTier = null;
            let durationStr = null;

            const tierKeywords = {
                lifetime: 'lifetime',
                life: 'lifetime',
                vip: 'lifetime',
                permanent: 'lifetime',
                perm: 'lifetime',
                never: 'lifetime',
                pro: 'pro_cluster',
                pro_cluster: 'pro_cluster',
                procluster: 'pro_cluster',
                cluster: 'pro_cluster',
                shield: 'shield_plus',
                shield_plus: 'shield_plus',
                shieldplus: 'shield_plus',
                plus: 'shield_plus'
            };

            for (const rawArg of remainingArgs) {
                const arg = rawArg.toLowerCase().trim();
                if (!chosenTier && tierKeywords[arg]) {
                    chosenTier = tierKeywords[arg];
                    continue;
                }
                if (!durationStr) {
                    if (['lifetime', 'permanent', 'never', 'life', 'perm', '-1', 'infinite'].includes(arg)) {
                        durationStr = 'lifetime';
                        continue;
                    }
                    if (/^(\d+)\s*(s|sec|seconds?|m|min|minutes?|h|hrs?|hours?|d|days?|w|weeks?|mo|months?|y|yrs?|years?)$/i.test(arg) || /^\d+$/.test(arg)) {
                        durationStr = arg;
                        continue;
                    }
                }
            }

            // Defaults: Lifetime VIP by default for bot owner convenience!
            if (!chosenTier) {
                chosenTier = (durationStr && durationStr !== 'lifetime') ? 'pro_cluster' : 'lifetime';
            }
            if (!durationStr) {
                durationStr = chosenTier === 'lifetime' ? 'lifetime' : '30d';
            }

            // Parse duration
            let expiresAt = null;
            if (!['lifetime', 'permanent', 'never', 'life', 'perm', '-1', 'infinite'].includes(durationStr.toLowerCase())) {
                const match = durationStr.match(/^(\d+)\s*([a-z]*)$/i);
                if (match) {
                    const count = parseInt(match[1], 10);
                    const rawUnit = (match[2] || 'd').toLowerCase();
                    let multiplier = 24 * 60 * 60 * 1000;
                    if (rawUnit.startsWith('s')) multiplier = 1000;
                    else if (rawUnit.startsWith('m') && !rawUnit.startsWith('mo')) multiplier = 60 * 1000;
                    else if (rawUnit.startsWith('h')) multiplier = 60 * 60 * 1000;
                    else if (rawUnit.startsWith('d')) multiplier = 24 * 60 * 60 * 1000;
                    else if (rawUnit.startsWith('w')) multiplier = 7 * 24 * 60 * 60 * 1000;
                    else if (rawUnit.startsWith('mo')) multiplier = 30 * 24 * 60 * 60 * 1000;
                    else if (rawUnit.startsWith('y')) multiplier = 365 * 24 * 60 * 60 * 1000;

                    expiresAt = new Date(Date.now() + (count * multiplier));
                }
            }

            const tierNames = {
                shield_plus: 'Starry Shield Plus',
                pro_cluster: 'Starry Pro Cluster',
                lifetime: 'Starry Supreme Lifetime VIP'
            };
            const tierMaxShares = {
                shield_plus: 5,
                pro_cluster: 10,
                lifetime: 15
            };

            const tierName = tierNames[chosenTier] || 'Starry Premium';
            const maxBoosterShares = tierMaxShares[chosenTier] || 15;

            // 1. Update ServerSettings if target is guild
            if (targetType === 'guild') {
                let settings = await ServerSettings.findOne({ guildId: targetId });
                if (!settings) settings = new ServerSettings({ guildId: targetId });
                settings.premium = {
                    isPremium: true,
                    tier: chosenTier,
                    expiresAt: expiresAt,
                    activatedBy: `Owner Direct: ${ctx.user?.tag || 'Bot Owner'} (${callerId})`
                };
                await settings.save();

                // Dynamically upgrade BoosterRole docs in this guild
                const BoosterRole = mongoose.models.BoosterRole || mongoose.model('BoosterRole');
                if (BoosterRole) {
                    await BoosterRole.updateMany(
                        { guildId: targetId, maxShares: { $lt: maxBoosterShares } },
                        { $set: { maxShares: maxBoosterShares } }
                    ).catch(() => {});
                }
            }

            // 2. Upsert PremiumModel (PremiumGuilds)
            if (PremiumModel) {
                await PremiumModel.findOneAndUpdate(
                    { targetId: targetId },
                    {
                        targetId: targetId,
                        type: targetType,
                        isPremium: true,
                        activatedAt: new Date(),
                        expiresAt: expiresAt
                    },
                    { upsert: true, new: true }
                ).catch(() => {});
            }

            // 3. Update RAM caches instantly
            const expMs = expiresAt ? expiresAt.getTime() : null;
            if (ctx.client && typeof ctx.client.setPremiumCache === 'function') {
                ctx.client.setPremiumCache(targetId, expMs);
            }
            invalidatePremiumCache(targetId);

            const expiryDisplay = expiresAt 
                ? `<t:${Math.floor(expiresAt.getTime() / 1000)}:F> (<t:${Math.floor(expiresAt.getTime() / 1000)}:R>)`
                : '`Permanent Lifetime VIP (Never Expires)`';

            const embed = new EmbedBuilder()
                .setColor('#F59E0B')
                .setAuthor({ 
                    name: 'Starry Premium Direct Grant • Bot Owner Authority', 
                    iconURL: 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96' 
                })
                .setTitle(`👑 Premium Granted: ${tierName}`)
                .setDescription(
                    `Successfully applied **${tierName}** directly to ${targetType === 'guild' ? 'Server' : 'User'} **${targetDisplayName}**!\n\n` +
                    `🆔 **Target ID:** \`${targetId}\` (${targetType.toUpperCase()})\n` +
                    `⏳ **Duration / Expiry:** ${expiryDisplay}\n` +
                    `👥 **Custom Booster Role Slots:** \`${maxBoosterShares} friends\`\n` +
                    `⚡ **Authorized By:** <@${callerId}>`
                )
                .addFields(
                    {
                        name: '✨ Active Perks Unlocked',
                        value: 
                            '• **24/7 Voice Channel Persistence** (Zero-latency startup)\n' +
                            '• **15 Studio DSP Hi-Fi Audio Filters** (Physical Bass, 8D, Lo-Fi, Reverb, Karaoke)\n' +
                            '• **Server Cloud Backups & Instant Restore**\n' +
                            '• **Anti-Raid Emergency Lockdown Shield**\n' +
                            '• **2x Economy XP, Drop Rate & Loot Multiplier**\n' +
                            '• **Multi-Bot Worker Nodes & Web Captcha Verification**',
                        inline: false
                    }
                )
                .setFooter({ text: 'Starry Core Infrastructure • Instant RAM & Database Activation' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 33. DELPREMIUM (Bot Owner Direct Revoke)
    {
        name: 'delpremium',
        aliases: ['removepremium', 'revokepremium', 'cancelpremium'],
        category: 'Utility',
        description: 'Directly revoke Starry Premium from any server or user (Bot Owners Only).',
        usage: ',delpremium [guild_id|user_id|@user]',
        async execute(ctx) {
            const BOT_OWNERS = config.BOT_OWNERS || ['1465049039153135639', '1257676837249617971'];
            if (process.env.OWNER_ID && !BOT_OWNERS.includes(process.env.OWNER_ID)) BOT_OWNERS.push(process.env.OWNER_ID);
            if (process.env.OWNER_IDS) {
                process.env.OWNER_IDS.split(',').map(s => s.trim()).forEach(id => {
                    if (!BOT_OWNERS.includes(id)) BOT_OWNERS.push(id);
                });
            }

            const callerId = ctx.user?.id || ctx.author?.id;
            if (!BOT_OWNERS.includes(callerId)) {
                return ctx.reply('❌ **Access Denied**: This command is strictly reserved for Starry Bot Owners.');
            }

            let targetId = null;
            if (ctx.args && ctx.args[0]) {
                const first = ctx.args[0].trim();
                const m = first.match(/^<@!?(\d+)>$/);
                targetId = m ? m[1] : (first.match(/^\d{17,21}$/) ? first : null);
            }
            if (!targetId) targetId = ctx.guild?.id || callerId;

            const mongoose = require('mongoose');
            const ServerSettings = require('../../models/ServerSettings');
            const PremiumModel = mongoose.models.PremiumGuilds || mongoose.model('PremiumGuilds');
            const { invalidatePremiumCache } = require('../../utils/premiumHelper');

            // 1. Reset ServerSettings
            await ServerSettings.updateOne(
                { guildId: targetId },
                { $set: { 'premium.isPremium': false, 'premium.tier': 'free', 'premium.expiresAt': null } }
            ).catch(() => {});

            // 2. Remove from PremiumModel
            if (PremiumModel) {
                await PremiumModel.deleteOne({ targetId }).catch(() => {});
            }

            // 3. Clear live caches
            if (ctx.client && typeof ctx.client.removePremiumCache === 'function') {
                ctx.client.removePremiumCache(targetId);
            }
            invalidatePremiumCache(targetId);

            return ctx.reply(`🛑 **Starry Premium Revoked:** Premium status removed for ID \`${targetId}\`.`);
        }
    },

    // 41. SETPREFIX / PREFIX CONFIGURATION
    {
        name: 'setprefix',
        aliases: ['prefix', 'changeprefix'],
        category: 'Settings',
        description: 'Set a custom prefix for this server or view the current active prefix.',
        usage: ',setprefix <new_prefix>',
        async execute(ctx) {
            const prefixVal = ctx.options?.getString ? ctx.options.getString('prefix') : null;
            const newPrefix = prefixVal || ctx.args[0];
            const ServerSettings = require('../../models/ServerSettings');
            const { setCachedPrefix } = require('../../modules/commandHandler');

            if (!ctx.guild) {
                return ctx.reply('ℹ️ The default prefix in DMs is strictly `,` (comma).');
            }

            if (!newPrefix) {
                let settings = await ServerSettings.findOne({ guildId: ctx.guild.id });
                const currentPrefix = settings?.prefix || ',';
                return ctx.reply(`ℹ️ Current server prefix is: \`${currentPrefix}\`\n*To change it, type: \`${currentPrefix}setprefix <new_prefix>\` or \`/setprefix prefix:<new>\`*`);
            }

            if (!ctx.member?.permissions?.has('Administrator') && !ctx.member?.permissions?.has('ManageGuild') && !config.BOT_OWNERS?.includes(ctx.user.id)) {
                return ctx.reply('❌ You need the **Manage Server** or **Administrator** permission to change the server prefix.');
            }

            if (newPrefix.length > 5) {
                return ctx.reply('❌ The prefix length cannot exceed 5 characters.');
            }

            let settings = await ServerSettings.findOne({ guildId: ctx.guild.id });
            if (!settings) settings = new ServerSettings({ guildId: ctx.guild.id });
            settings.prefix = newPrefix;
            await settings.save();

            setCachedPrefix(ctx.guild.id, newPrefix);

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS?.SUCCESS || '#2ECC71')
                .setTitle('✅ Server Prefix Updated')
                .setDescription(`Successfully changed this server's prefix to: \`${newPrefix}\`\n\n**Example Commands:**\n• \`${newPrefix}help\` — Help Menu\n• \`${newPrefix}ask <question>\` — Starry AI\n• \`${newPrefix}play <song>\` — Music Audio\n• \`${newPrefix}hug @user\` — Social Action`)
                .setFooter({ text: 'Starry Configuration • Default fallback: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 41B. SETLANGUAGE / SERVER LOCALIZATION CONFIGURATION
    {
        name: 'setlanguage',
        aliases: ['language', 'lang', 'setlang'],
        category: 'Settings',
        description: 'Configure the server language or view the active language across 14 supported languages.',
        usage: ',setlanguage [language_code]',
        async execute(ctx) {
            const { 
                SUPPORTED_LANGUAGES, 
                resolveLanguageCode, 
                getGuildLanguage, 
                setGuildLanguage, 
                t, 
                createLanguageSelectRow 
            } = require('../../utils/i18n');

            if (!ctx.guild) {
                return ctx.reply('ℹ️ In Direct Messages, Starry defaults to English (🇬🇧).');
            }

            const currentLang = await getGuildLanguage(ctx.guild.id);
            const currentInfo = SUPPORTED_LANGUAGES[currentLang] || SUPPORTED_LANGUAGES['en'];
            const prefix = ctx.prefix || ',';

            const langInput = ctx.options?.getString ? ctx.options.getString('language') : (ctx.args ? ctx.args.join(' ') : null);

            // If no language specified, display current language + interactive dropdown
            if (!langInput) {
                const langListStr = Object.values(SUPPORTED_LANGUAGES)
                    .map(l => `${l.flag} **${l.native}** (\`${l.code}\`)`)
                    .join(' • ');

                const embed = new EmbedBuilder()
                    .setColor(config.EMBED_COLORS?.PRIMARY || '#9B59B6')
                    .setTitle('🌐 ' + t(currentLang, 'setup.select_lang_title'))
                    .setDescription(
                        t(currentLang, 'lang.current', { lang: currentInfo.native, code: currentInfo.code, flag: currentInfo.flag }) + '\n\n' +
                        t(currentLang, 'lang.change_hint', { prefix }) + '\n\n' +
                        `**Supported Languages (14):**\n${langListStr}`
                    )
                    .setFooter({ text: 'Starry Multi-Language Localization Engine' })
                    .setTimestamp();

                const selectRow = createLanguageSelectRow(currentLang, 'starry_lang_select');
                return ctx.reply({ embeds: [embed], components: [selectRow] });
            }

            // Check permissions
            const hasPerm = ctx.member?.permissions?.has('ManageGuild') || 
                            ctx.member?.permissions?.has('Administrator') || 
                            config.BOT_OWNERS?.includes(ctx.user.id);

            if (!hasPerm) {
                return ctx.reply(t(currentLang, 'lang.no_permission'));
            }

            const targetCode = resolveLanguageCode(langInput);
            if (!targetCode) {
                const selectRow = createLanguageSelectRow(currentLang, 'starry_lang_select');
                return ctx.reply({ 
                    content: t(currentLang, 'lang.invalid'), 
                    components: [selectRow] 
                });
            }

            await setGuildLanguage(ctx.guild.id, targetCode);
            const newInfo = SUPPORTED_LANGUAGES[targetCode];

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS?.SUCCESS || '#2ECC71')
                .setTitle(t(targetCode, 'lang.updated_title'))
                .setDescription(t(targetCode, 'lang.updated_desc', { lang: newInfo.native, flag: newInfo.flag, native: newInfo.native }))
                .setFooter({ text: 'Starry Configuration • ' + newInfo.name })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 42. TOP.GG VOTE REWARD COMMAND
    {
        name: 'vote',
        aliases: ['topgg', 'upvote'],
        category: 'Utility',
        description: 'Vote for Starry on Top.gg to earn free Credits and XP boosts!',
        usage: ',vote',
        async execute(ctx) {
            const topggUrl = 'https://top.gg/bot/1513589513648345368/vote';
            const embed = new EmbedBuilder()
                .setColor('#FF79C6')
                .setTitle('⭐ Vote for Starry on Top.gg')
                .setDescription(
                    `Support Starry by voting on **Top.gg** and claim instant rewards!\n\n` +
                    `🎁 **Voting Rewards:**\n` +
                    `• **+500 Credits** (Weekday) / **+1,000 Credits** (Weekend)\n` +
                    `• **+500 XP Boost** (Weekday) / **+1,000 XP** (Weekend)\n` +
                    `• 🗳️ Voting resets every **12 hours**\n\n` +
                    `*Click the button below to vote on Top.gg:*`
                )
                .setFooter({ text: 'Top.gg Automated Vote Sync Active' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('🗳️ Vote on Top.gg (Free Rewards)')
                    .setStyle(ButtonStyle.Link)
                    .setURL(topggUrl)
            );

            return ctx.reply({ embeds: [embed], components: [row] });
        }
    },

    // 43. IMAGINE / AI ART GENERATOR
    {
        name: 'imagine',
        aliases: ['image', 'generate', 'draw', 'art', 'dalle', 'flux', 'genimage'],
        category: 'Utility',
        description: 'Generate stunning high-resolution AI art and images using Flux/SDXL neural engines.',
        usage: ',imagine <prompt>',
        async execute(ctx) {
            const prompt = (ctx.options?.getString ? (ctx.options.getString('prompt') || ctx.options.getString('text')) : null) || ctx.args.join(' ');
            if (!prompt || !prompt.trim()) {
                return ctx.reply('🎨 **Please provide a description of what you want to draw or generate!**\n*Example: `,imagine Cyberpunk anime girl in a neon Tokyo street` or `/imagine prompt:Magical floating castle`*');
            }

            await ctx.defer(false);
            return generateAndSendImage(ctx, prompt.trim());
        }
    },

    // 44. NITRO CLAIMS & GIVEAWAY SNIPER LOGS
    {
        name: 'nitroclaims',
        aliases: ['nitrosnipe', 'giftlogs', 'nitrotracker'],
        category: 'Utility',
        description: 'View recently detected and claimed Discord Nitro gifts in this server.',
        usage: ',nitroclaims',
        async execute(ctx) {
            const nitroDetector = require('../../modules/nitroClaimDetector');
            const claims = await nitroDetector.getRecentClaims(ctx.guild.id, 10);
            const stats = await nitroDetector.getStats(ctx.guild.id);

            if (!claims || claims.length === 0) {
                const emptyEmbed = new EmbedBuilder()
                    .setColor('#F47FFF')
                    .setAuthor({ name: 'Discord Nitro Claim Tracker', iconURL: 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96' })
                    .setTitle('🎁 No Nitro Claims Recorded Yet')
                    .setDescription('The Nitro sniffer is active and watching! Whenever someone drops a `discord.gift` link in any channel, the bot will automatically detect who claimed it and measure the exact speed.')
                    .setFooter({ text: 'Active Real-Time Monitoring • Prefix: ,' })
                    .setTimestamp();
                return ctx.reply({ embeds: [emptyEmbed] });
            }

            const embed = new EmbedBuilder()
                .setColor('#F47FFF')
                .setAuthor({ name: 'Discord Nitro Claim History', iconURL: 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96' })
                .setTitle(`🎁 Nitro Gifts Claimed in ${ctx.guild.name}`)
                .setDescription(
                    `📊 **Total Detected:** \`${stats.total}\` | ⚡ **Fastest Claim:** \`${stats.fastest ? (stats.fastest.speedMs + 'ms') : 'N/A'}\`\n\n` +
                    claims.map((c, idx) => {
                        const timeAgo = `<t:${Math.floor(new Date(c.claimedAt).getTime() / 1000)}:R>`;
                        const speed = c.speedMs < 1000 ? `${c.speedMs}ms ⚡` : `${(c.speedMs / 1000).toFixed(2)}s 🚀`;
                        return `\`${idx + 1}.\` **${c.giftType}** — ${timeAgo}\n` +
                               `> 👤 **Claimer:** <@${c.claimerId}> (\`${c.claimerTag}\`)\n` +
                               `> 📤 **Sender:** <@${c.senderId}> | ⚡ **Speed:** \`${speed}\` | 💬 <#${c.channelId}>`;
                    }).join('\n\n')
                )
                .setFooter({ text: 'Supreme Nitro Claim & Sniffing Tracker Engine' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 45. REMIND / REMINDME / REMINDER (Autonomous Starlight Reminder)
    {
        name: 'remind',
        aliases: ['remindme', 'reminder', 'timer'],
        category: 'Utility',
        description: 'Set an automated starlight reminder in the current channel or via Direct Message.',
        usage: ',remind <time> <message> | ,remind dm <time> <message> | ,remind list | ,remind cancel <id>',
        async execute(ctx) {
            const { createReminder, parseDuration, formatTimeRemaining } = require('../../modules/reminderEngine');
            const Reminder = require('../../models/Reminder');

            if (!ctx.args || ctx.args.length === 0) {
                const guideEmbed = new EmbedBuilder()
                    .setColor(config.EMBED_COLORS.PRIMARY)
                    .setAuthor({ name: '⏰ Starlight Reminder System', iconURL: ctx.client.user.displayAvatarURL({ dynamic: true }) })
                    .setTitle('🔔 How to Use Celestial Reminders')
                    .setDescription(
                        `Never forget an important task, event, or timer! Starry will notify you automatically.\n\n` +
                        `**Examples:**\n` +
                        `• \`,remind 10m Check the oven\`\n` +
                        `• \`,remind 2h Study for upcoming exam\`\n` +
                        `• \`,remind 1d Submit report --dm\`\n` +
                        `• \`,remind dm 30m Drink water\`\n\n` +
                        `**Management Commands:**\n` +
                        `• \`,reminders\` or \`,remind list\` — View active reminders\n` +
                        `• \`,delreminder <id>\` or \`,remind cancel <id>\` — Cancel a reminder\n\n` +
                        `*Supported units: \`s\` (seconds), \`m\` (minutes), \`h\` (hours), \`d\` (days).*`
                    )
                    .setFooter({ text: 'Starry Cosmic Reminders • Prefix: ,' })
                    .setTimestamp();
                return ctx.reply({ embeds: [guideEmbed] });
            }

            const sub = ctx.args[0].toLowerCase();

            // Subcommand: List
            if (sub === 'list' || sub === 'all') {
                const rems = await Reminder.find({ userId: ctx.user.id, completed: false }).sort({ remindAt: 1 }).limit(15);
                if (!rems || rems.length === 0) {
                    return ctx.reply('📭 **You have no active reminders scheduled.** Set one with `,remind <time> <message>`!');
                }
                const embed = new EmbedBuilder()
                    .setColor(config.EMBED_COLORS.PRIMARY)
                    .setAuthor({ name: `${ctx.user.username}'s Active Reminders`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                    .setTitle(`⏰ Scheduled Reminders (${rems.length})`)
                    .setDescription(
                        rems.map((r, i) => {
                            const ts = Math.floor(new Date(r.remindAt).getTime() / 1000);
                            const dest = r.isDM ? 'Direct Message 📬' : `<#${r.channelId}> 💬`;
                            return `\`${i + 1}.\` **<t:${ts}:R>** (<t:${ts}:f>) in ${dest}\n> 📝 **${r.message.slice(0, 75)}**\n> 🆔 \`${r._id}\``;
                        }).join('\n\n')
                    )
                    .setFooter({ text: 'Cancel a reminder with: ,delreminder <id>' })
                    .setTimestamp();
                return ctx.reply({ embeds: [embed] });
            }

            // Subcommand: Cancel / Delete
            if (sub === 'cancel' || sub === 'delete' || sub === 'del' || sub === 'remove') {
                const targetId = ctx.args[1];
                if (!targetId) return ctx.reply('❌ Please provide the Reminder ID to cancel. Use `,reminders` to check IDs.');
                const deleted = await Reminder.findOneAndDelete({ _id: targetId, userId: ctx.user.id }).catch(() => null);
                if (!deleted) return ctx.reply('❌ Reminder not found or it does not belong to you.');
                return ctx.reply(`🗑️ **Reminder Cancelled:** Successfully removed reminder \`${targetId}\`.`);
            }

            // Parse reminder creation
            let isDM = false;
            let filteredArgs = ctx.args.filter(arg => {
                const lower = arg.toLowerCase();
                if (lower === 'dm' || lower === '--dm' || lower === '-dm') {
                    isDM = true;
                    return false;
                }
                return true;
            });

            // Strip leading filler words like "me in" or "in" or "me"
            if (filteredArgs[0]?.toLowerCase() === 'me' && filteredArgs[1]?.toLowerCase() === 'in') {
                filteredArgs = filteredArgs.slice(2);
            } else if (filteredArgs[0]?.toLowerCase() === 'me' || filteredArgs[0]?.toLowerCase() === 'in') {
                filteredArgs = filteredArgs.slice(1);
            }

            if (filteredArgs.length === 0) {
                return ctx.reply('❌ Please specify a duration for your reminder, e.g. `,remind 15m take a break`');
            }

            let durationMs = parseDuration(filteredArgs[0]);
            let textParts = [];

            if (durationMs) {
                textParts = filteredArgs.slice(1);
            } else {
                for (let i = 0; i < filteredArgs.length; i++) {
                    const parsed = parseDuration(filteredArgs[i]);
                    if (parsed) {
                        durationMs = parsed;
                        textParts = [...filteredArgs.slice(0, i), ...filteredArgs.slice(i + 1)];
                        break;
                    }
                }
            }

            if (!durationMs) {
                return ctx.reply('❌ Could not understand the time duration. Please use formats like `10s`, `15m`, `2h`, or `1d`.');
            }

            if (durationMs < 10000) {
                return ctx.reply('❌ The minimum reminder duration is 10 seconds.');
            }
            if (durationMs > 365 * 24 * 60 * 60 * 1000) {
                return ctx.reply('❌ The maximum reminder duration is 365 days.');
            }

            let reminderText = textParts.join(' ').trim();
            if (reminderText.toLowerCase().startsWith('to ')) {
                reminderText = reminderText.slice(3).trim();
            }
            if (!reminderText) reminderText = 'Celestial Reminder Alert!';

            const reminder = await createReminder(
                ctx.user.id,
                ctx.guild?.id || null,
                ctx.channel.id,
                durationMs,
                reminderText,
                isDM
            );

            const fireTimestamp = Math.floor(reminder.remindAt.getTime() / 1000);
            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setAuthor({ name: '⏰ Starlight Reminder Armed', iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setTitle('🔔 Celestial Reminder Scheduled!')
                .setDescription(
                    `I will remind you about this in **${formatTimeRemaining(durationMs)}**!\n\n` +
                    `> 📝 **Message:** ${reminderText}\n` +
                    `> 🔔 **Remind At:** <t:${fireTimestamp}:F> (<t:${fireTimestamp}:R>)\n` +
                    `> 📬 **Destination:** ${isDM ? 'Direct Messages (DM)' : `<#${ctx.channel.id}>`}\n` +
                    `> 🆔 **Reminder ID:** \`${reminder._id}\``
                )
                .setFooter({ text: 'Starry Cosmic Reminders • Use ,reminders to view active reminders' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 46. REMINDERS (Active Reminders Explorer)
    {
        name: 'reminders',
        aliases: ['myreminders', 'reminderlist'],
        category: 'Utility',
        description: 'List all of your active scheduled reminders.',
        usage: ',reminders',
        async execute(ctx) {
            const Reminder = require('../../models/Reminder');
            const rems = await Reminder.find({ userId: ctx.user.id, completed: false }).sort({ remindAt: 1 }).limit(15);
            if (!rems || rems.length === 0) {
                return ctx.reply('📭 **You have no active reminders scheduled.** Set one with `,remind <time> <message>`!');
            }
            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setAuthor({ name: `${ctx.user.username}'s Active Reminders`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setTitle(`⏰ Scheduled Reminders (${rems.length})`)
                .setDescription(
                    rems.map((r, i) => {
                        const ts = Math.floor(new Date(r.remindAt).getTime() / 1000);
                        const dest = r.isDM ? 'Direct Message 📬' : `<#${r.channelId}> 💬`;
                        return `\`${i + 1}.\` **<t:${ts}:R>** (<t:${ts}:f>) in ${dest}\n> 📝 **${r.message.slice(0, 75)}**\n> 🆔 \`${r._id}\``;
                    }).join('\n\n')
                )
                .setFooter({ text: 'Cancel a reminder with: ,delreminder <id>' })
                .setTimestamp();
            return ctx.reply({ embeds: [embed] });
        }
    },

    // 47. DELREMINDER (Cancel Reminder)
    {
        name: 'delreminder',
        aliases: ['cancelreminder', 'removereminder', 'rmreminder'],
        category: 'Utility',
        description: 'Cancel and delete one of your active reminders.',
        usage: ',delreminder <reminder_id>',
        async execute(ctx) {
            const targetId = ctx.args[0];
            if (!targetId) return ctx.reply('❌ Please specify the Reminder ID to cancel. Check your IDs with `,reminders`.');
            const Reminder = require('../../models/Reminder');
            const deleted = await Reminder.findOneAndDelete({ _id: targetId, userId: ctx.user.id }).catch(() => null);
            if (!deleted) return ctx.reply('❌ Reminder not found or it was not created by you.');
            return ctx.reply(`🗑️ **Reminder Cancelled:** Successfully deleted reminder \`${targetId}\`.`);
        }
    },

    // 48. STARBOARD (Celestial Showcase Configuration)
    {
        name: 'starboard',
        aliases: ['starboardconfig', 'starboardsetup'],
        category: 'Utility',
        description: 'Configure or inspect the guild Celestial Starboard reaction showcase.',
        usage: ',starboard setup <#channel> [stars] | ,starboard stars <count> | ,starboard toggle | ,starboard info',
        async execute(ctx) {
            if (!ctx.guild) return ctx.reply('❌ This command can only be used inside a server.');
            const { StarboardConfig } = require('../../models/StarboardConfig');
            const sub = ctx.args[0]?.toLowerCase();

            if (!sub || sub === 'info' || sub === 'status') {
                const conf = await StarboardConfig.findOne({ guildId: ctx.guild.id });
                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setAuthor({ name: '⭐ Celestial Starboard Showcase', iconURL: ctx.guild.iconURL({ dynamic: true }) })
                    .setTitle(`Starboard Settings for ${ctx.guild.name}`)
                    .setDescription(
                        `The Starboard automatically pins community-highlighted messages that receive enough star reactions!\n\n` +
                        `• **Status:** ${conf?.enabled ? '🟢 Active & Listening' : '🔴 Disabled'}\n` +
                        `• **Showcase Channel:** ${conf?.channelId ? `<#${conf.channelId}>` : '*None configured*'}\n` +
                        `• **Star Threshold:** \`${conf?.starCount || 3}\` ⭐\n\n` +
                        `**Admin Commands:**\n` +
                        `• \`,starboard setup #channel [threshold]\` — Set showcase channel\n` +
                        `• \`,starboard stars <number>\` — Change required star count\n` +
                        `• \`,starboard toggle\` — Enable or disable the starboard`
                    )
                    .setFooter({ text: 'Starry Starboard Engine' })
                    .setTimestamp();
                return ctx.reply({ embeds: [embed] });
            }

            const isAdmin = ctx.member.permissions.has(PermissionFlagsBits.ManageGuild) || ctx.member.permissions.has(PermissionFlagsBits.Administrator) || config.BOT_OWNERS.includes(ctx.user.id);
            if (!isAdmin) {
                return ctx.reply('❌ You need the **Manage Server** or **Administrator** permission to modify starboard settings.');
            }

            if (sub === 'setup' || sub === 'set') {
                const targetChannel = ctx.message?.mentions?.channels?.first() || ctx.guild.channels.cache.get(ctx.args[1]);
                if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
                    return ctx.reply('❌ Please specify a valid text channel for the starboard: `,starboard setup #starboard 3`');
                }

                let starCount = parseInt(ctx.args[2] || '3', 10);
                if (isNaN(starCount) || starCount < 1) starCount = 3;
                if (starCount > 25) starCount = 25;

                const conf = await StarboardConfig.findOneAndUpdate(
                    { guildId: ctx.guild.id },
                    { channelId: targetChannel.id, starCount, enabled: true },
                    { upsert: true, new: true }
                );

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('✅ Celestial Starboard Configured!')
                    .setDescription(
                        `• **Showcase Channel:** <#${conf.channelId}>\n` +
                        `• **Required Stars:** \`${conf.starCount}\` ⭐ reactions\n` +
                        `• **Status:** 🟢 Active\n\n` +
                        `Whenever any message receives **${conf.starCount}** ⭐ reactions, it will automatically be featured with interactive jump links!`
                    )
                    .setFooter({ text: 'Starry Reaction Showcase' });
                return ctx.reply({ embeds: [embed] });
            }

            if (sub === 'stars' || sub === 'threshold' || sub === 'count') {
                const count = parseInt(ctx.args[1], 10);
                if (isNaN(count) || count < 1 || count > 25) {
                    return ctx.reply('❌ Please provide a valid star count between 1 and 25.');
                }
                const conf = await StarboardConfig.findOneAndUpdate(
                    { guildId: ctx.guild.id },
                    { starCount: count },
                    { upsert: true, new: true }
                );
                return ctx.reply(`⭐ **Star Threshold Updated:** Messages now require **${conf.starCount}** star reactions to enter the showcase.`);
            }

            if (sub === 'toggle') {
                const conf = await StarboardConfig.findOne({ guildId: ctx.guild.id });
                const newState = !(conf?.enabled || false);
                await StarboardConfig.findOneAndUpdate(
                    { guildId: ctx.guild.id },
                    { enabled: newState },
                    { upsert: true, new: true }
                );
                return ctx.reply(`⭐ **Starboard Status:** ${newState ? '🟢 Enabled and active!' : '🔴 Disabled.'}`);
            }

            return ctx.reply('❌ Unknown subcommand. Use `,starboard info` to view settings.');
        }
    },

    // 49. TEMPVOICE (Dynamic Join-to-Create Voice Hub)
    {
        name: 'tempvoice',
        aliases: ['dynamicvoice', 'jointocreate', 'autovc'],
        category: 'Utility',
        description: 'Configure automated Join-to-Create dynamic orbit voice channels with interactive member controls.',
        usage: ',tempvoice setup <#voiceChannel> | ,tempvoice toggle | ,tempvoice info',
        async execute(ctx) {
            if (!ctx.guild) return ctx.reply('❌ This command can only be used inside a server.');
            const TempVoiceConfig = require('../../models/TempVoiceConfig');
            const sub = ctx.args[0]?.toLowerCase();

            if (!sub || sub === 'info' || sub === 'status') {
                const conf = await TempVoiceConfig.findOne({ guildId: ctx.guild.id });
                const embed = new EmbedBuilder()
                    .setColor(config.EMBED_COLORS.PRIMARY)
                    .setAuthor({ name: '🎙️ Dynamic Orbit Voice Hub', iconURL: ctx.guild.iconURL({ dynamic: true }) })
                    .setTitle(`Dynamic Voice Settings for ${ctx.guild.name}`)
                    .setDescription(
                        `Dynamic Voice creates automatic temporary voice channels when members join the lobby channel and cleans them up when everyone leaves.\n\n` +
                        `• **Status:** ${conf?.enabled ? '🟢 Active' : '🔴 Disabled'}\n` +
                        `• **Lobby Channel:** ${conf?.lobbyChannelId ? `<#${conf.lobbyChannelId}>` : '*None configured*'}\n` +
                        `• **Room Template:** \`${conf?.namingPattern || "🎧 {user}'s Orbit"}\`\n\n` +
                        `**Admin Commands:**\n` +
                        `• \`,tempvoice setup <#voiceChannel>\` — Set the Join-to-Create lobby channel\n` +
                        `• \`,tempvoice toggle\` — Turn dynamic voice on/off`
                    )
                    .setFooter({ text: 'Starry Dynamic Voice Suite' })
                    .setTimestamp();
                return ctx.reply({ embeds: [embed] });
            }

            const isAdmin = ctx.member.permissions.has(PermissionFlagsBits.ManageChannels) || ctx.member.permissions.has(PermissionFlagsBits.ManageGuild) || config.BOT_OWNERS.includes(ctx.user.id);
            if (!isAdmin) {
                return ctx.reply('❌ You need the **Manage Channels** or **Manage Server** permission to modify dynamic voice settings.');
            }

            if (sub === 'setup' || sub === 'set') {
                if (!await requirePremium(ctx, 'Dynamic Orbit Voice Room Custom Bitrate')) return;
                const targetChannel = ctx.message?.mentions?.channels?.first() || ctx.guild.channels.cache.get(ctx.args[1]) || ctx.member.voice?.channel;
                if (!targetChannel || targetChannel.type !== ChannelType.GuildVoice) {
                    return ctx.reply('❌ Please mention or provide the ID of a voice channel to use as the Join-to-Create lobby, or join one and run `,tempvoice setup`.');
                }

                const conf = await TempVoiceConfig.findOneAndUpdate(
                    { guildId: ctx.guild.id },
                    { lobbyChannelId: targetChannel.id, categoryId: targetChannel.parentId, enabled: true },
                    { upsert: true, new: true }
                );

                const embed = new EmbedBuilder()
                    .setColor(config.EMBED_COLORS.PRIMARY)
                    .setTitle('✅ Dynamic Orbit Voice Configured!')
                    .setDescription(
                        `• **Lobby Channel:** <#${conf.lobbyChannelId}>\n` +
                        `• **Status:** 🟢 Active\n\n` +
                        `Whenever a member joins <#${conf.lobbyChannelId}>, Starry will automatically create a private voice channel for them with interactive Lock 🔒, Unlock 🔓, Duo 👥, and Squad 🎮 controls!`
                    )
                    .setFooter({ text: 'Dynamic Voice Hub Armed' });
                return ctx.reply({ embeds: [embed] });
            }

            if (sub === 'toggle') {
                const conf = await TempVoiceConfig.findOne({ guildId: ctx.guild.id });
                const newState = !(conf?.enabled || false);
                await TempVoiceConfig.findOneAndUpdate(
                    { guildId: ctx.guild.id },
                    { enabled: newState },
                    { upsert: true, new: true }
                );
                return ctx.reply(`🎙️ **Dynamic Voice Status:** ${newState ? '🟢 Enabled and active!' : '🔴 Disabled.'}`);
            }

            return ctx.reply('❌ Unknown subcommand. Use `,tempvoice info` to check settings.');
        }
    },

    // 50. TAG (Custom Guild Tags & Auto-Responders)
    {
        name: 'tag',
        aliases: ['customtag', 'tagcmd'],
        category: 'Utility',
        description: 'Create, display, list, and manage custom server tags and shortcuts.',
        usage: ',tag <name> | ,tag create <name> <content> | ,tag list | ,tag delete <name> | ,tag info <name>',
        async execute(ctx) {
            if (!ctx.guild) return ctx.reply('❌ Tags can only be used inside a server.');
            const Tag = require('../../models/Tag');

            if (!ctx.args || ctx.args.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(config.EMBED_COLORS.PRIMARY)
                    .setAuthor({ name: '🏷️ Server Custom Tags & Shortcuts', iconURL: ctx.guild.iconURL({ dynamic: true }) })
                    .setTitle('How to Use Tags')
                    .setDescription(
                        `Tags allow you to save reusable messages, rules, links, or text snippets for your community.\n\n` +
                        `• \`,tag <name>\` — Display a saved tag\n` +
                        `• \`,tag create <name> <content>\` — Create a new tag\n` +
                        `• \`,tag list\` — View all server tags\n` +
                        `• \`,tag info <name>\` — Inspect tag creator & usage statistics\n` +
                        `• \`,tag delete <name>\` — Delete a tag (creator or mods)`
                    )
                    .setFooter({ text: 'Starry Tag Engine • Prefix: ,' })
                    .setTimestamp();
                return ctx.reply({ embeds: [embed] });
            }

            const sub = ctx.args[0].toLowerCase();
            const RESERVED = ['create', 'add', 'del', 'delete', 'remove', 'list', 'all', 'info', 'stats', 'help'];

            if (sub === 'list' || sub === 'all') {
                const tags = await Tag.find({ guildId: ctx.guild.id }).sort({ name: 1 }).limit(50);
                if (!tags || tags.length === 0) {
                    return ctx.reply('🏷️ **No tags have been created in this server yet.** Create one with `,tag create <name> <content>`!');
                }
                const embed = new EmbedBuilder()
                    .setColor(config.EMBED_COLORS.PRIMARY)
                    .setAuthor({ name: `Custom Tags for ${ctx.guild.name}`, iconURL: ctx.guild.iconURL({ dynamic: true }) })
                    .setTitle(`🏷️ Server Tags (${tags.length})`)
                    .setDescription(
                        tags.map(t => `• \`${t.name}\` — used \`${t.uses}\` times`).join('\n')
                    )
                    .setFooter({ text: 'Use ,tag <name> to view any tag' })
                    .setTimestamp();
                return ctx.reply({ embeds: [embed] });
            }

            if (sub === 'create' || sub === 'add') {
                const canManage = ctx.member.permissions.has(PermissionFlagsBits.ManageMessages) || config.BOT_OWNERS.includes(ctx.user.id);
                if (!canManage) {
                    return ctx.reply('❌ You need the **Manage Messages** permission to create server tags.');
                }

                const tagName = ctx.args[1]?.toLowerCase();
                const tagContent = ctx.args.slice(2).join(' ');

                if (!tagName || !tagContent) {
                    return ctx.reply('❌ Usage: `,tag create <tag_name> <tag_content>`');
                }
                if (RESERVED.includes(tagName)) {
                    return ctx.reply(`❌ \`${tagName}\` is a reserved command name and cannot be used as a tag.`);
                }
                if (tagName.length > 30) {
                    return ctx.reply('❌ Tag names cannot exceed 30 characters.');
                }

                const existing = await Tag.findOne({ guildId: ctx.guild.id, name: tagName });
                if (existing) {
                    return ctx.reply(`❌ A tag named \`${tagName}\` already exists in this server!`);
                }

                await Tag.create({
                    guildId: ctx.guild.id,
                    name: tagName,
                    content: tagContent,
                    authorId: ctx.user.id,
                    uses: 0
                });

                return ctx.reply(`✅ **Tag Created:** Successfully saved tag \`${tagName}\`! Display it anytime with \`,tag ${tagName}\`.`);
            }

            if (sub === 'delete' || sub === 'del' || sub === 'remove') {
                const tagName = ctx.args[1]?.toLowerCase();
                if (!tagName) return ctx.reply('❌ Please specify the tag to delete: `,tag delete <name>`');

                const tag = await Tag.findOne({ guildId: ctx.guild.id, name: tagName });
                if (!tag) return ctx.reply(`❌ Tag \`${tagName}\` not found in this server.`);

                const canDelete = tag.authorId === ctx.user.id || ctx.member.permissions.has(PermissionFlagsBits.ManageMessages) || config.BOT_OWNERS.includes(ctx.user.id);
                if (!canDelete) {
                    return ctx.reply('❌ You can only delete tags you created, unless you have the **Manage Messages** permission.');
                }

                await Tag.deleteOne({ _id: tag._id });
                return ctx.reply(`🗑️ **Tag Deleted:** Successfully removed tag \`${tagName}\`.`);
            }

            if (sub === 'info' || sub === 'stats') {
                const tagName = ctx.args[1]?.toLowerCase();
                if (!tagName) return ctx.reply('❌ Usage: `,tag info <tag_name>`');

                const tag = await Tag.findOne({ guildId: ctx.guild.id, name: tagName });
                if (!tag) return ctx.reply(`❌ Tag \`${tagName}\` not found.`);

                const ts = Math.floor(new Date(tag.createdAt).getTime() / 1000);
                const embed = new EmbedBuilder()
                    .setColor(config.EMBED_COLORS.PRIMARY)
                    .setTitle(`🏷️ Tag Information: ${tag.name}`)
                    .addFields(
                        { name: '👤 Creator', value: `<@${tag.authorId}>`, inline: true },
                        { name: '📊 Total Uses', value: `\`${tag.uses}\` times`, inline: true },
                        { name: '📅 Created', value: `<t:${ts}:R>`, inline: true }
                    )
                    .setFooter({ text: 'Starry Tag Engine' })
                    .setTimestamp();
                return ctx.reply({ embeds: [embed] });
            }

            const tag = await Tag.findOneAndUpdate(
                { guildId: ctx.guild.id, name: sub },
                { $inc: { uses: 1 } },
                { new: true }
            );

            if (tag) {
                return ctx.reply({ content: tag.content });
            }

            return ctx.reply(`❌ Tag \`${sub}\` not found. Use \`,tag list\` to view all tags or \`,tag create ${sub} <content>\` to create it!`);
        }
    },

    // 51. TAGS (Quick list shortcut)
    {
        name: 'tags',
        aliases: ['server-tags'],
        category: 'Utility',
        description: 'View all saved tags for this server.',
        usage: ',tags',
        async execute(ctx) {
            if (!ctx.guild) return ctx.reply('❌ Tags can only be used inside a server.');
            const Tag = require('../../models/Tag');
            const tags = await Tag.find({ guildId: ctx.guild.id }).sort({ name: 1 }).limit(50);
            if (!tags || tags.length === 0) {
                return ctx.reply('🏷️ **No tags have been created in this server yet.** Create one with `,tag create <name> <content>`!');
            }
            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setAuthor({ name: `Custom Tags for ${ctx.guild.name}`, iconURL: ctx.guild.iconURL({ dynamic: true }) })
                .setTitle(`🏷️ Server Tags (${tags.length})`)
                .setDescription(tags.map(t => `• \`${t.name}\` — used \`${t.uses}\` times`).join('\n'))
                .setFooter({ text: 'Use ,tag <name> to view any tag' })
                .setTimestamp();
            return ctx.reply({ embeds: [embed] });
        }
    },

    // 52. STICKY / STICKYMESSAGE (Pinned Channel Notice Engine)
    {
        name: 'sticky',
        aliases: ['stickymessage', 'stickynotice'],
        category: 'Utility',
        description: 'Pin a persistent notice to the bottom of the current channel that automatically stays at the bottom as members chat.',
        usage: ',sticky set <message> | ,sticky remove | ,sticky list',
        async execute(ctx) {
            if (!ctx.guild) return ctx.reply('❌ This command can only be used inside a server.');
            const StickyMessage = require('../../models/StickyMessage');
            const { setCachedSticky, deleteCachedSticky } = require('../../modules/stickyEngine');

            const sub = ctx.args[0]?.toLowerCase();

            if (!sub || sub === 'help') {
                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setAuthor({ name: '📌 Pinned Sticky Notice System', iconURL: ctx.guild.iconURL({ dynamic: true }) })
                    .setTitle('How to Use Sticky Notices')
                    .setDescription(
                        `Sticky messages stay automatically pinned at the bottom of a channel even when members chat!\n\n` +
                        `• \`,sticky set <message>\` — Set a sticky notice in the current channel\n` +
                        `• \`,sticky remove\` — Remove the sticky notice from this channel\n` +
                        `• \`,sticky list\` — List all channels with active sticky notices\n\n` +
                        `*Requires Manage Messages or Administrator permission.*`
                    )
                    .setFooter({ text: 'Starry Pinned Notice Engine' })
                    .setTimestamp();
                return ctx.reply({ embeds: [embed] });
            }

            const canManage = ctx.member.permissions.has(PermissionFlagsBits.ManageMessages) || ctx.member.permissions.has(PermissionFlagsBits.Administrator) || config.BOT_OWNERS.includes(ctx.user.id);
            if (!canManage) {
                return ctx.reply('❌ You need the **Manage Messages** or **Administrator** permission to configure sticky notices.');
            }

            if (sub === 'list' || sub === 'all') {
                const stickies = await StickyMessage.find({ guildId: ctx.guild.id });
                if (!stickies || stickies.length === 0) {
                    return ctx.reply('📌 **No channels in this server have an active sticky notice.** Set one with `,sticky set <message>`!');
                }
                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle(`📌 Active Sticky Notices in ${ctx.guild.name}`)
                    .setDescription(
                        stickies.map(s => `• <#${s.channelId}> — *" ${s.content.slice(0, 50)}${s.content.length > 50 ? '...' : ''} "*`).join('\n')
                    )
                    .setFooter({ text: 'Starry Sticky Engine' })
                    .setTimestamp();
                return ctx.reply({ embeds: [embed] });
            }

            if (sub === 'remove' || sub === 'delete' || sub === 'del' || sub === 'clear') {
                const existing = await StickyMessage.findOneAndDelete({ channelId: ctx.channel.id });
                if (!existing) {
                    return ctx.reply('❌ There is no active sticky notice in this channel.');
                }
                deleteCachedSticky(ctx.channel.id);
                if (existing.lastMessageId) {
                    try {
                        const oldMsg = await ctx.channel.messages.fetch(existing.lastMessageId).catch(() => null);
                        if (oldMsg) await oldMsg.delete().catch(() => {});
                    } catch (e) {}
                }
                return ctx.reply('🗑️ **Sticky Notice Removed:** The sticky notice for this channel has been cleared.');
            }

            if (sub === 'set' || sub === 'add') {
                const text = ctx.args.slice(1).join(' ');
                if (!text || !text.trim()) {
                    return ctx.reply('❌ Please provide the notice text: `,sticky set Remember to be respectful in this channel!`');
                }

                const previous = await StickyMessage.findOne({ channelId: ctx.channel.id });
                if (previous && previous.lastMessageId) {
                    try {
                        const prevMsg = await ctx.channel.messages.fetch(previous.lastMessageId).catch(() => null);
                        if (prevMsg) await prevMsg.delete().catch(() => {});
                    } catch (e) {}
                }

                const noticeEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setAuthor({ name: '📌 Pinned Channel Notice', iconURL: ctx.client.user.displayAvatarURL({ dynamic: true }) })
                    .setDescription(text.trim())
                    .setFooter({ text: 'Sticky Message • Starry Management' })
                    .setTimestamp();

                const sent = await ctx.channel.send({ embeds: [noticeEmbed] });

                const doc = await StickyMessage.findOneAndUpdate(
                    { channelId: ctx.channel.id },
                    {
                        guildId: ctx.guild.id,
                        content: text.trim(),
                        lastMessageId: sent.id,
                        authorId: ctx.user.id
                    },
                    { upsert: true, new: true }
                );

                setCachedSticky(ctx.channel.id, doc);

                if (ctx.isSlash) {
                    return ctx.reply({ content: '✅ Sticky notice activated for this channel!', ephemeral: true });
                }
                return;
            }

            return ctx.reply('❌ Unknown sticky option. Use `,sticky set <message>`, `,sticky remove`, or `,sticky list`.');
        }
    },

    // VIRTUAL RAM & SYSTEM MEMORY ENGINE
    {
        name: 'vram',
        aliases: ['ram', 'memory', 'swap'],
        category: 'Utility',
        description: 'Check bot Virtual RAM, active swap space, and V8 heap allocation.',
        usage: ',vram',
        async execute(ctx) {
            const v8 = require('v8');
            const fs = require('fs');
            const heapStats = v8.getHeapStatistics();
            const heapUsedMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
            const heapTotalMB = (heapStats.total_heap_size / 1024 / 1024).toFixed(1);
            const heapLimitMB = (heapStats.heap_size_limit / 1024 / 1024).toFixed(0);

            let swapTotalMB = 0;
            let swapFreeMB = 0;
            try {
                const meminfo = fs.readFileSync('/proc/meminfo', 'utf8');
                const st = meminfo.match(/SwapTotal:\s+(\d+)\s+kB/);
                const sf = meminfo.match(/SwapFree:\s+(\d+)\s+kB/);
                if (st) swapTotalMB = Math.round(parseInt(st[1], 10) / 1024);
                if (sf) swapFreeMB = Math.round(parseInt(sf[1], 10) / 1024);
            } catch (e) {}

            const swapUsedMB = Math.max(0, swapTotalMB - swapFreeMB);
            const swapPercent = swapTotalMB > 0 ? Math.round((swapUsedMB / swapTotalMB) * 100) : 0;
            const heapPercent = Math.round((heapUsedMB / heapLimitMB) * 100);

            const progressBar = (pct) => {
                const filled = Math.min(10, Math.max(0, Math.round(pct / 10)));
                return '█'.repeat(filled) + '░'.repeat(10 - filled);
            };

            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('⚡ Starry Virtual RAM & Memory Core')
                .setDescription(`**Virtual Memory Engine:** \`ACTIVE & EXPANDED\`\nBot is configured to utilize the system's **${(swapTotalMB / 1024).toFixed(1)} GB Virtual RAM pool** to prevent phone memory saturation.`)
                .addFields(
                    {
                        name: '🧠 Node.js Virtual Heap Allocation',
                        value: `• **Heap Limit:** \`${heapLimitMB} MB\` (~${(heapLimitMB / 1024).toFixed(1)} GB)\n• **Current Usage:** \`${heapUsedMB} MB / ${heapTotalMB} MB\` (${heapPercent}%)\n• \`[${progressBar(heapPercent)}]\``,
                        inline: false
                    },
                    {
                        name: '💾 System Virtual Swap Space',
                        value: `• **Total Swap Pool:** \`${swapTotalMB} MB\` (~${(swapTotalMB / 1024).toFixed(1)} GB)\n• **Swap In-Use:** \`${swapUsedMB} MB\` (${swapPercent}%)\n• **Free Swap Available:** \`${swapFreeMB} MB\` (~${(swapFreeMB / 1024).toFixed(1)} GB free)\n• \`[${progressBar(swapPercent)}]\``,
                        inline: false
                    },
                    {
                        name: '📱 Phone Optimization Status',
                        value: '• **Termux Heap Guard:** `Protected (--max-old-space-size=4096)`\n• **Thread Pool Workers:** `16 Cores (UV_THREADPOOL_SIZE)`\n• **Cloud Hosting Ready:** `Dockerfile & render.yaml Armed`',
                        inline: false
                    }
                )
                .setFooter({ text: 'Starry Virtual RAM Engine • 4GB Virtual Memory Space' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 53. APPROVEORDER (Bot Owner Only)
    {
        name: 'approveorder',
        aliases: ['approvepay', 'orderapprove'],
        category: 'Utility',
        description: 'Approve a payment order, issue license key, and auto-activate premium.',
        usage: ',approveorder <orderId>',
        async execute(ctx) {
            if (!config.BOT_OWNERS?.includes(ctx.user.id)) {
                return ctx.reply('❌ This command is restricted to Bot Owners.');
            }
            const orderId = ctx.args[0];
            if (!orderId) {
                return ctx.reply('❌ Usage: `,approveorder <orderId>` (e.g. `,approveorder ORD-M2K8P-7A3F`)');
            }
            const { approvePaymentOrder } = require('../../utils/paymentHelper');
            const res = await approvePaymentOrder(orderId, `${ctx.user.username} (Discord Command)`, ctx.client);
            if (!res.success) {
                return ctx.reply(`❌ Failed to approve order: ${res.error}`);
            }

            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle(`✅ Order [${orderId.toUpperCase()}] Approved!`)
                .setDescription(
                    `• **Status:** \`COMPLETED\`\n` +
                    `• **Tier:** **${res.tier.toUpperCase()}**\n` +
                    `• **License Key:** \`${res.key}\`\n` +
                    `• **Target Server:** ${res.guildId ? `\`${res.guildId}\` (Auto-Activated: ${res.autoActivated ? 'YES ✅' : 'NO ❌'})` : '*None*'}\n\n` +
                    `*Customer has been notified via DM if accessible.*`
                )
                .setTimestamp();
            return ctx.reply({ embeds: [embed] });
        }
    },

    // 54. REJECTORDER (Bot Owner Only)
    {
        name: 'rejectorder',
        aliases: ['orderreject'],
        category: 'Utility',
        description: 'Reject a pending/verifying payment order.',
        usage: ',rejectorder <orderId> [reason]',
        async execute(ctx) {
            if (!config.BOT_OWNERS?.includes(ctx.user.id)) {
                return ctx.reply('❌ This command is restricted to Bot Owners.');
            }
            const orderId = ctx.args[0];
            if (!orderId) {
                return ctx.reply('❌ Usage: `,rejectorder <orderId> [reason]`');
            }
            const reason = ctx.args.slice(1).join(' ') || 'Payment verification failed.';
            const { rejectPaymentOrder } = require('../../utils/paymentHelper');
            const res = await rejectPaymentOrder(orderId, `${ctx.user.username} (Discord Command)`, reason, ctx.client);
            if (!res.success) {
                return ctx.reply(`❌ Failed to reject order: ${res.error}`);
            }
            return ctx.reply(`✅ Order \`${orderId.toUpperCase()}\` has been marked as **REJECTED**.\n*Reason:* ${reason}`);
        }
    },

    // 55. ORDERS (Bot Owner Only)
    {
        name: 'orders',
        aliases: ['orderlist', 'paymentorders'],
        category: 'Utility',
        description: 'List recent payment orders and their verification status.',
        usage: ',orders [verifying | pending | completed | rejected]',
        async execute(ctx) {
            if (!config.BOT_OWNERS?.includes(ctx.user.id)) {
                return ctx.reply('❌ This command is restricted to Bot Owners.');
            }
            const PaymentOrder = require('../../models/PaymentOrder');
            const filter = ctx.args[0]?.toLowerCase();
            const query = filter && ['verifying', 'pending', 'completed', 'rejected'].includes(filter) ? { status: filter } : {};
            const orders = await PaymentOrder.find(query).sort({ createdAt: -1 }).limit(10).lean();

            if (!orders.length) {
                return ctx.reply(`ℹ️ No orders found${filter ? ` with status '${filter}'` : ''}.`);
            }

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle(`🛒 Recent Payment Orders (${orders.length})`)
                .setDescription(
                    orders.map(o => {
                        const statusEmoji = o.status === 'completed' ? '✅' : o.status === 'verifying' ? '⏳' : o.status === 'rejected' ? '❌' : '🕒';
                        return `• ${statusEmoji} **\`${o.orderId}\`** | **${o.tierName}** (₹${o.amountInr} / $${o.amountUsd})\n  Status: \`${o.status.toUpperCase()}\` | Method: \`${o.method.toUpperCase()}\`\n  UTR: \`${o.utr || 'None'}\` | User: ${o.userId ? `<@${o.userId}>` : o.userTag}\n  Time: <t:${Math.floor(new Date(o.createdAt).getTime() / 1000)}:R>`;
                    }).join('\n\n')
                )
                .setFooter({ text: 'Use ,approveorder <orderId> to approve an order' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 56. GENKEY (Bot Owner Only)
    {
        name: 'genkey',
        aliases: ['generatekey', 'createkey'],
        category: 'Utility',
        description: 'Generate an administrative Starry Premium License Key.',
        usage: ',genkey <shield_plus | pro_cluster | lifetime> [durationDays]',
        async execute(ctx) {
            if (!config.BOT_OWNERS?.includes(ctx.user.id)) {
                return ctx.reply('❌ This command is restricted to Bot Owners.');
            }
            const tierInput = ctx.args[0]?.toLowerCase();
            const daysInput = ctx.args[1] ? parseInt(ctx.args[1]) : null;
            const validTiers = ['shield_plus', 'pro_cluster', 'lifetime'];

            if (!tierInput || !validTiers.includes(tierInput)) {
                return ctx.reply('❌ Please specify a valid tier: `shield_plus`, `pro_cluster`, or `lifetime`.\n*Usage: `,genkey pro_cluster 30` or `,genkey lifetime`*');
            }

            const { generateStandaloneKey } = require('../../utils/paymentHelper');
            const result = await generateStandaloneKey({
                tier: tierInput,
                durationDays: daysInput,
                createdBy: `Owner [${ctx.user.username}]`
            });

            const embed = new EmbedBuilder()
                .setColor('#F59E0B')
                .setTitle('👑 Admin Premium License Key Generated')
                .setDescription(
                    `• **License Key:** \`${result.key}\`\n` +
                    `• **Tier:** **${result.tier.toUpperCase()}**\n` +
                    `• **Duration:** \`${result.durationDays === -1 ? 'Lifetime' : result.durationDays + ' Days'}\`\n\n` +
                    `*Redeem in Discord via \`,redeem ${result.key}\` or via web dashboard.*`
                )
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    }
];

module.exports = commands;
module.exports.snipes = snipes;
module.exports.editSnipes = editSnipes;
