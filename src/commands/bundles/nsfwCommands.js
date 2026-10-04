// ==========================================
// 🔞 STARRY MATURE, ANIME & MASCOT COMMAND SUITE (20+ COMMANDS)
// File Path: src/commands/bundles/nsfwCommands.js
// Server Owner & Bot Owners ONLY for Server Activation
// Members Can Freely Enable / Disable in Direct Messages (DMs)
// Strict Discord Age-Restricted (NSFW) Channel Verification
// Anime Waifus, Nekos, Kitsunes, Husbandos, Romance GIFs & Anime Social Roleplay
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits 
} = require('discord.js');
const ServerSettings = require('../../models/ServerSettings');
const UserSettings = require('../../models/UserSettings');
const { 
    canManageServerNsfw,
    isNsfwAllowed, 
    isNsfwDmEnabled,
    setNsfwDmEnabled,
    toggleNsfwDm,
    fetchAnimeImage, 
    explainNsfwWithAI 
} = require('../../modules/nsfwModule');
const { buildStarryCharacterCard, STARRY_MASCOT, generateStarryResponse } = require('../../utils/aiEngine');
const config = require('../../config');

// In-memory social action counter for NSFW commands: action_user1_user2 -> count
const nsfwSocialCounts = new Map();

// In-memory User Affection Points for Starry Mascot: userId -> { points, gifts, level }
const userAffectionMap = new Map();

function getUserAffection(userId) {
    if (!userAffectionMap.has(userId)) {
        userAffectionMap.set(userId, { points: 100, gifts: 0, level: 1 });
    }
    return userAffectionMap.get(userId);
}

function addAffection(userId, amount = 10) {
    const data = getUserAffection(userId);
    data.points += amount;
    data.level = Math.floor(data.points / 100) + 1;
    data.gifts += 1;
    userAffectionMap.set(userId, data);
    return data;
}

function getActionCount(action, u1, u2) {
    const key = `${action}_${[u1, u2].sort().join('_')}`;
    const count = (nsfwSocialCounts.get(key) || 0) + 1;
    nsfwSocialCounts.set(key, count);
    return count;
}

const NSFW_ACTION_GIFS = {
    kiss: [
        'https://cdn.otakugifs.xyz/gifs/kiss/f8c5edf9aa62b175.gif',
        'https://cdn.otakugifs.xyz/gifs/kiss/99c6d80ba787d40a.gif',
        'https://cdn.otakugifs.xyz/gifs/kiss/a07b3bcb00751dae.gif',
        'https://cdn.otakugifs.xyz/gifs/kiss/1ddfcffef8148cca.gif'
    ],
    hug: [
        'https://cdn.otakugifs.xyz/gifs/hug/c787d02e22435395.gif',
        'https://cdn.otakugifs.xyz/gifs/hug/Fd7apEdG1m.gif',
        'https://cdn.otakugifs.xyz/gifs/hug/52144ce42c01a39c.gif'
    ],
    spank: [
        'https://cdn.otakugifs.xyz/gifs/slap/8b4aad19774ed00c.gif',
        'https://cdn.otakugifs.xyz/gifs/slap/IGraVDzh5b.gif',
        'https://cdn.otakugifs.xyz/gifs/smack/78c956974f371f70.gif'
    ],
    lick: [
        'https://cdn.otakugifs.xyz/gifs/lick/bd93022885fb1d22.gif',
        'https://cdn.otakugifs.xyz/gifs/lick/d2eca216f3627926.gif'
    ],
    cuddle: [
        'https://cdn.otakugifs.xyz/gifs/cuddle/47fc5d0ee4f009aa.gif',
        'https://cdn.otakugifs.xyz/gifs/cuddle/fa848a601c071d72.gif'
    ],
    touch: [
        'https://cdn.otakugifs.xyz/gifs/nuzzle/298ec4ae171e8473.gif',
        'https://cdn.otakugifs.xyz/gifs/pat/d324b051f0bfe526.gif'
    ],
    suck: [
        'https://cdn.otakugifs.xyz/gifs/lick/bd93022885fb1d22.gif',
        'https://cdn.otakugifs.xyz/gifs/lick/d2eca216f3627926.gif'
    ],
    pinch: [
        'https://cdn.otakugifs.xyz/gifs/pinch/08cb26d0dc270658.gif'
    ],
    smack: [
        'https://cdn.otakugifs.xyz/gifs/smack/78c956974f371f70.gif',
        'https://cdn.otakugifs.xyz/gifs/smack/Xhxvcdkcfx.gif'
    ]
};

function getRandomNsfwGif(action) {
    const list = NSFW_ACTION_GIFS[action] || NSFW_ACTION_GIFS.hug;
    return list[Math.floor(Math.random() * list.length)];
}

const commands = [
    // 1. NSFW MASTER CONTROLLER & AI EXPLAINER
    {
        name: 'nsfw',
        aliases: ['nsfwtoggle', 'mature', '18plus', 'nsfwconfig'],
        category: 'NSFW',
        description: 'Configure, toggle, or ask AI about the Mature / Anime NSFW module.',
        usage: ',nsfw [on | off | info | ai | dms on | dms off]',
        async execute(ctx) {
            const sub = ctx.args[0]?.toLowerCase();

            // 1. AI Explainer Subcommand
            if (sub === 'info' || sub === 'ai' || sub === 'explain' || sub === 'help' || sub === 'about') {
                await ctx.defer(false);
                const embed = await explainNsfwWithAI(ctx);
                return ctx.reply({ embeds: [embed] });
            }

            // 2. DM Opt-In Subcommands (Available anywhere: in DMs or in a server)
            if (sub === 'dms' || sub === 'dm') {
                const dmChoice = ctx.args[1]?.toLowerCase();
                if (dmChoice === 'on' || dmChoice === 'enable') {
                    await setNsfwDmEnabled(ctx.user.id, true);
                    return ctx.reply('🔞 **Mature Anime Mode ENABLED in your DMs!**\n*You have opted in to receive anime waifu art and mature interactions in private Direct Messages.*');
                } else if (dmChoice === 'off' || dmChoice === 'disable') {
                    await setNsfwDmEnabled(ctx.user.id, false);
                    return ctx.reply('🔒 **Mature Anime Mode DISABLED in your DMs.**');
                } else {
                    const status = await isNsfwDmEnabled(ctx.user.id);
                    return ctx.reply(`🔞 **Your Personal DM Mature Status:** \`${status ? '🟢 ENABLED' : '🔴 DISABLED (Default)'}\`\n*Use \`,nsfw dms on\` or \`,nsfw dms off\` to toggle.*`);
                }
            }

            // 3. Direct Message Environment Handling
            if (!ctx.guild) {
                if (sub === 'on' || sub === 'enable') {
                    await setNsfwDmEnabled(ctx.user.id, true);
                    return ctx.reply('🔞 **Mature Anime Mode ENABLED in your DMs!**\n*You can now use mature anime commands and waifu/neko art in Direct Messages with Starry.*');
                }
                if (sub === 'off' || sub === 'disable') {
                    await setNsfwDmEnabled(ctx.user.id, false);
                    return ctx.reply('🔒 **Mature Anime Mode DISABLED in your DMs.**');
                }

                const dmStatus = await isNsfwDmEnabled(ctx.user.id);
                const dmEmbed = new EmbedBuilder()
                    .setColor(dmStatus ? '#FF69B4' : '#2B2D31')
                    .setAuthor({ name: 'Starry • Direct Messages NSFW Settings', iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                    .setTitle('🔞 Private DM Mature Settings')
                    .setDescription(
                        `**Your DM Status:** \`${dmStatus ? '🟢 ENABLED' : '🔴 DISABLED (Default)'}\`\n\n` +
                        `You can independently enable or disable mature anime commands in your private DMs at any time!\n\n` +
                        `• \`,nsfw on\` — Enable mature mode in DMs\n` +
                        `• \`,nsfw off\` — Disable mature mode in DMs\n` +
                        `• \`,nsfw info\` — Ask Starry AI about this module`
                    )
                    .setFooter({ text: 'Personal DM Preferences • Saved Permanently' })
                    .setTimestamp();

                const dmRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('nsfw_toggle_dm')
                        .setLabel(dmStatus ? 'Disable DM NSFW' : 'Enable DM NSFW')
                        .setStyle(dmStatus ? ButtonStyle.Danger : ButtonStyle.Success)
                        .setEmoji('🔞'),
                    new ButtonBuilder()
                        .setCustomId('nsfw_ai_explain')
                        .setLabel('🤖 Ask AI About NSFW')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('✨')
                );

                return ctx.reply({ embeds: [dmEmbed], components: [dmRow] });
            }

            // 4. Server Environment Handling (Strictly Server Owner & Bot Owners ONLY)
            let settings = await ServerSettings.findOne({ guildId: ctx.guild.id });
            if (!settings) {
                settings = await ServerSettings.create({ guildId: ctx.guild.id });
            }

            const canManage = canManageServerNsfw(ctx.user.id, ctx.guild);

            if (sub === 'on' || sub === 'enable') {
                if (!canManage) {
                    return ctx.reply(
                        `❌ **Permission Denied:** Only the **Server Owner** (<@${ctx.guild.ownerId}>) or **Bot Owners** have authority to enable the NSFW module in this server.`
                    );
                }
                if (!settings.nsfw) settings.nsfw = {};
                settings.nsfw.enabled = true;
                await settings.save();

                return ctx.reply(
                    `🔞 **NSFW Module ENABLED for ${ctx.guild.name}!**\n\n` +
                    `> ⚠️ **Enforcement Notice:** Commands will **strictly execute in channels marked as Age-Restricted (NSFW)** in Discord channel settings.\n` +
                    `> 💡 *Ask AI about features:* \`,nsfw info\``
                );
            }

            if (sub === 'off' || sub === 'disable') {
                if (!canManage) {
                    return ctx.reply(
                        `❌ **Permission Denied:** Only the **Server Owner** (<@${ctx.guild.ownerId}>) or **Bot Owners** have authority to disable the NSFW module in this server.`
                    );
                }
                if (!settings.nsfw) settings.nsfw = {};
                settings.nsfw.enabled = false;
                await settings.save();

                return ctx.reply(`🔒 **NSFW Module DISABLED for ${ctx.guild.name}.** No mature commands can be executed in this server.`);
            }

            // 5. Default Server Control Panel
            const currentStatus = settings.nsfw?.enabled || false;
            const userDmStatus = await isNsfwDmEnabled(ctx.user.id);

            const embed = new EmbedBuilder()
                .setColor(currentStatus ? '#FF69B4' : '#2B2D31')
                .setAuthor({ name: `${ctx.guild.name} • NSFW Settings`, iconURL: ctx.guild.iconURL({ dynamic: true }) })
                .setTitle('🔞 Mature & Anime NSFW System')
                .setDescription(
                    `**Server Status:** \`${currentStatus ? '🟢 ACTIVE (Age-Restricted Channels Only)' : '🔴 DISABLED (Default for all servers)'}\`\n` +
                    `**Server Owner:** <@${ctx.guild.ownerId}>\n` +
                    `**Your Private DM Status:** \`${userDmStatus ? '🟢 ENABLED' : '🔴 DISABLED'}\`\n\n` +
                    `🛡️ **Server Authorization Rule:**\n` +
                    `Only the **Server Owner** or **Bot Owners** can toggle the NSFW module on or off for this server.\n\n` +
                    `📩 **Individual DM Privacy:**\n` +
                    `Members can independently enable or disable mature mode for their own Direct Messages using \`,nsfw dms on\` or the button below.\n\n` +
                    `**Available Commands:**\n` +
                    `• \`,nsfw on\` / \`,nsfw off\` — Toggle server NSFW *(Server Owner / Bot Owner only)*\n` +
                    `• \`,nsfw dms on\` / \`,nsfw dms off\` — Toggle personal DM mature mode *(Any member)*\n` +
                    `• \`,nsfw info\` — **Ask Starry AI** to explain everything in this module\n` +
                    `• \`,nsfwhelp\` — View full index of mature commands and anime roleplay`
                )
                .setFooter({ text: 'Strict Age-Restricted Verification Active • Prefix: ,' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('nsfw_toggle_server')
                    .setLabel(currentStatus ? 'Disable Server NSFW' : 'Enable Server NSFW')
                    .setStyle(currentStatus ? ButtonStyle.Danger : ButtonStyle.Success)
                    .setEmoji('🔞'),
                new ButtonBuilder()
                    .setCustomId('nsfw_toggle_dm')
                    .setLabel(userDmStatus ? 'Disable My DM NSFW' : 'Enable My DM NSFW')
                    .setStyle(userDmStatus ? ButtonStyle.Secondary : ButtonStyle.Primary)
                    .setEmoji('📩'),
                new ButtonBuilder()
                    .setCustomId('nsfw_ai_explain')
                    .setLabel('🤖 Ask Starry AI')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✨')
            );

            return ctx.reply({ embeds: [embed], components: [row] });
        }
    },

    // 2. STARRY MASCOT CHARACTER SUITE
    {
        name: 'starry',
        aliases: ['character', 'mascot', 'persona', 'astraea', 'starrychan'],
        category: 'Utility',
        description: 'View the official Starry anime mascot profile, affinity, mood, and interactions.',
        usage: ',starry [mood | affinity | gift | lore | talk <msg>]',
        async execute(ctx) {
            const sub = ctx.args[0]?.toLowerCase();

            // A. Mood Subcommand
            if (sub === 'mood') {
                const moods = [
                    { name: '✨ Sparkly & Cheerful', desc: '“Feeling fantastic! Ready to spread stardust everywhere!” 🌟', gif: 'https://cdn.otakugifs.xyz/gifs/celebrate/d39e778bd0a7aa5c.gif' },
                    { name: '💖 Affectionate & Loving', desc: '“Thinking about all the wonderful people in this server!” ✨', gif: 'https://cdn.otakugifs.xyz/gifs/cuddle/47fc5d0ee4f009aa.gif' },
                    { name: '🎵 Musical & Groovy', desc: '“Humming a celestial melody! Let\'s listen to music together!” 🎶', gif: 'https://cdn.otakugifs.xyz/gifs/dance/67f70b7eb5c8309a.gif' },
                    { name: '🌙 Cozy & Dreaming', desc: '“Watching the constellations twinkle softly in the cosmos...” 🌠', gif: 'https://cdn.otakugifs.xyz/gifs/sleep/b5beda61e06a315d.gif' }
                ];
                const currentMood = moods[Math.floor(Math.random() * moods.length)];

                const embed = new EmbedBuilder()
                    .setColor('#FF94D2')
                    .setAuthor({ name: 'Starry-chan • Current Mood', iconURL: STARRY_MASCOT.avatarURL })
                    .setTitle(`🌟 Starry is feeling: ${currentMood.name}`)
                    .setDescription(`> *${currentMood.desc}*`)
                    .setImage(currentMood.gif)
                    .setFooter({ text: 'Starry Mascot System • Type "starry" to interact!' })
                    .setTimestamp();

                return ctx.reply({ embeds: [embed] });
            }

            // B. Affinity Subcommand
            if (sub === 'affinity' || sub === 'stats' || sub === 'friendship') {
                const aff = getUserAffection(ctx.user.id);
                const titles = ['Cosmic Acquaintance 🌠', 'Starlight Friend ⭐', 'Celestial Companion 🌟', 'Astral Best Friend 💫', 'Beloved Cosmic Soulmate 💖✨'];
                const rankTitle = titles[Math.min(aff.level - 1, titles.length - 1)];

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setAuthor({ name: `${ctx.user.username}'s Starlight Affinity`, iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                    .setTitle(`⭐ Friendship with Starry (Astraea)`)
                    .setDescription(
                        `• **Affinity Rank:** \`${rankTitle}\`\n` +
                        `• **Bond Level:** \`Level ${aff.level}\`\n` +
                        `• **Affection Points:** \`${aff.points} Stardust 💖\`\n` +
                        `• **Gifts Given:** \`${aff.gifts} Gifts 🎁\`\n\n` +
                        `*Give Starry gifts with \`,starry gift\` or headpat her to increase your bond!*`
                    )
                    .setThumbnail(STARRY_MASCOT.avatarURL)
                    .setFooter({ text: 'Starry Mascot Affection System' })
                    .setTimestamp();

                return ctx.reply({ embeds: [embed] });
            }

            // C. Gift Subcommand
            if (sub === 'gift' || sub === 'give') {
                const updated = addAffection(ctx.user.id, 25);
                const giftResponses = [
                    '“Kyaaa! ✨ A gift for me?! Arigatou gozaimasu, <@USER>! I will treasure this forever!” 🌟',
                    '“Ehehe~ Delicious star candies! You are the sweetest person in the galaxy, <@USER>! 💖”',
                    '“Glowing cosmic stardust! ✨ My starlight energy is completely replenished! Thank you, <@USER>!” 💫'
                ];
                const line = giftResponses[Math.floor(Math.random() * giftResponses.length)].replace(/<@USER>/g, `<@${ctx.user.id}>`);

                const embed = new EmbedBuilder()
                    .setColor('#FF69B4')
                    .setAuthor({ name: 'Starry-chan • Gift Received!', iconURL: STARRY_MASCOT.avatarURL })
                    .setDescription(`🎁 **${ctx.user.username} gave Starry a lovely gift!**\n\n> *${line}*\n\n📈 **Bond Increased:** \`+25 Affection Points\` *(Total: ${updated.points} 💖 • Level ${updated.level})*`)
                    .setImage('https://cdn.otakugifs.xyz/gifs/nom/vnbgxFWFHv.gif')
                    .setFooter({ text: 'Starry Affection System • Prefix: ,' })
                    .setTimestamp();

                return ctx.reply({ embeds: [embed] });
            }

            // D. Lore Subcommand
            if (sub === 'lore' || sub === 'story') {
                const embed = new EmbedBuilder()
                    .setColor('#9B59B6')
                    .setTitle(`📖 The Cosmic Lore of Astraea (Starry)`)
                    .setDescription(
                        `Long before the dawn of digital galaxies, in the glowing heart of the **Astraea Constellation**, the celestial maiden **Starry** was born from pure harmonious starlight.\n\n` +
                        `Wielding the mythical **Starlight Nebula Quill**, she voyages across Discord servers to bring unbreakable security, high-resolution melodies, and sparkling joy to every traveler.\n\n` +
                        `*“Wherever there are friends gathered under the starry night sky, I will illuminate your path!”* ✨`
                    )
                    .setImage('https://cdn.otakugifs.xyz/gifs/celebrate/d39e778bd0a7aa5c.gif')
                    .setFooter({ text: 'Starry Canon Lore' });

                return ctx.reply({ embeds: [embed] });
            }

            // E. Default: Character Card
            const payload = buildStarryCharacterCard(ctx.user);
            return ctx.reply(payload);
        }
    },

    // 3. WAIFU (Anime Waifu Art)
    {
        name: 'waifu',
        category: 'NSFW',
        description: 'Get a beautiful anime waifu artwork (SFW/NSFW aware).',
        usage: ',waifu',
        async execute(ctx) {
            const nsfwStatus = await isNsfwAllowed(ctx);
            if (nsfwStatus === false) {
                if (!ctx.guild) {
                    return ctx.reply('🔒 **Mature Mode is Disabled in your DMs!**\n*Run `,nsfw dms on` to enable mature anime commands in private DMs.*');
                }
                return ctx.reply(`🔒 **NSFW Module is Disabled for this Server!**\n*Only the **Server Owner** (<@${ctx.guild.ownerId}>) or **Bot Owners** can enable it with \`,nsfw on\`.*`);
            }
            if (nsfwStatus === 'CHANNEL_NOT_NSFW') {
                return ctx.reply('🔞 **Age-Restricted Channel Required!**\n*Please use an Age-Restricted (NSFW) channel or enable DM mature mode with `,nsfw dms on`.*');
            }

            const isMature = nsfwStatus === true;
            const imgUrl = await fetchAnimeImage('waifu', isMature);

            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle(`🌸 Anime Waifu Gallery ${isMature ? '(18+ Mature)' : '(SFW)'}`)
                .setImage(imgUrl)
                .setFooter({ text: `Requested by ${ctx.user.username} • Starry Anime Suite` })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 4. NEKO (Anime Catgirl Art)
    {
        name: 'neko',
        category: 'NSFW',
        description: 'Get a cute anime neko catgirl artwork.',
        usage: ',neko',
        async execute(ctx) {
            const nsfwStatus = await isNsfwAllowed(ctx);
            if (nsfwStatus === false) {
                if (!ctx.guild) {
                    return ctx.reply('🔒 **Mature Mode is Disabled in your DMs!**\n*Run `,nsfw dms on` to enable mature anime commands in private DMs.*');
                }
                return ctx.reply(`🔒 **NSFW Module is Disabled for this Server!**\n*Only the **Server Owner** (<@${ctx.guild.ownerId}>) or **Bot Owners** can enable it with \`,nsfw on\`.*`);
            }
            if (nsfwStatus === 'CHANNEL_NOT_NSFW') {
                return ctx.reply('🔞 **Age-Restricted Channel Required!**\n*Please use an Age-Restricted (NSFW) channel.*');
            }

            const isMature = nsfwStatus === true;
            const imgUrl = await fetchAnimeImage('neko', isMature);

            const embed = new EmbedBuilder()
                .setColor('#FF94D2')
                .setTitle(`🐱 Anime Neko Gallery ${isMature ? '(18+ Mature)' : '(SFW)'}`)
                .setImage(imgUrl)
                .setFooter({ text: `Requested by ${ctx.user.username} • Starry Anime Suite` })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 5. KITSUNE (Anime Foxgirl Art)
    {
        name: 'kitsune',
        category: 'NSFW',
        description: 'Get an enchanting anime kitsune foxgirl artwork.',
        usage: ',kitsune',
        async execute(ctx) {
            const nsfwStatus = await isNsfwAllowed(ctx);
            if (nsfwStatus === false) {
                if (!ctx.guild) {
                    return ctx.reply('🔒 **Mature Mode is Disabled in your DMs!**\n*Run `,nsfw dms on` to enable mature anime commands in private DMs.*');
                }
                return ctx.reply(`🔒 **NSFW Module is Disabled for this Server!**\n*Only the **Server Owner** (<@${ctx.guild.ownerId}>) or **Bot Owners** can enable it with \`,nsfw on\`.*`);
            }
            if (nsfwStatus === 'CHANNEL_NOT_NSFW') {
                return ctx.reply('🔞 **Age-Restricted Channel Required!**\n*Please use an Age-Restricted (NSFW) channel.*');
            }

            const imgUrl = await fetchAnimeImage('kitsune', nsfwStatus === true);

            const embed = new EmbedBuilder()
                .setColor('#FF9900')
                .setTitle('🦊 Anime Kitsune Gallery')
                .setImage(imgUrl)
                .setFooter({ text: `Requested by ${ctx.user.username} • Starry Anime Suite` })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 6. HUSBANDO (Anime Husbando Art)
    {
        name: 'husbando',
        category: 'NSFW',
        description: 'Get a handsome anime husbando artwork.',
        usage: ',husbando',
        async execute(ctx) {
            const nsfwStatus = await isNsfwAllowed(ctx);
            if (nsfwStatus === false) {
                if (!ctx.guild) {
                    return ctx.reply('🔒 **Mature Mode is Disabled in your DMs!**\n*Run `,nsfw dms on` to enable mature anime commands in private DMs.*');
                }
                return ctx.reply(`🔒 **NSFW Module is Disabled for this Server!**\n*Only the **Server Owner** (<@${ctx.guild.ownerId}>) or **Bot Owners** can enable it with \`,nsfw on\`.*`);
            }
            if (nsfwStatus === 'CHANNEL_NOT_NSFW') {
                return ctx.reply('🔞 **Age-Restricted Channel Required!**\n*Please use an Age-Restricted (NSFW) channel.*');
            }

            const imgUrl = await fetchAnimeImage('husbando', nsfwStatus === true);

            const embed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle('💫 Anime Husbando Gallery')
                .setImage(imgUrl)
                .setFooter({ text: `Requested by ${ctx.user.username} • Starry Anime Suite` })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 7. TRAP (Anime Character Art)
    {
        name: 'trap',
        category: 'NSFW',
        description: 'Get an anime trap character artwork (NSFW aware).',
        usage: ',trap',
        async execute(ctx) {
            const nsfwStatus = await isNsfwAllowed(ctx);
            if (nsfwStatus === false) {
                if (!ctx.guild) {
                    return ctx.reply('🔒 **Mature Mode is Disabled in your DMs!**\n*Run `,nsfw dms on` to enable mature anime commands in private DMs.*');
                }
                return ctx.reply(`🔒 **NSFW Module is Disabled for this Server!**\n*Only the **Server Owner** (<@${ctx.guild.ownerId}>) or **Bot Owners** can enable it with \`,nsfw on\`.*`);
            }
            if (nsfwStatus === 'CHANNEL_NOT_NSFW') {
                return ctx.reply('🔞 **Age-Restricted Channel Required!**\n*Please use an Age-Restricted (NSFW) channel.*');
            }

            const isMature = nsfwStatus === true;
            const imgUrl = await fetchAnimeImage('trap', isMature);

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle(`✨ Anime Trap Gallery ${isMature ? '(18+ Mature)' : '(SFW)'}`)
                .setImage(imgUrl)
                .setFooter({ text: `Requested by ${ctx.user.username} • Starry Anime Suite` })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 8. BLOWKISS / KISS (Anime Romance Gifs)
    {
        name: 'blowkiss',
        aliases: ['kiss2'],
        category: 'NSFW',
        description: 'Send an expressive anime blowkiss to someone special in chat.',
        usage: ',blowkiss [@user]',
        async execute(ctx) {
            const target = ctx.message?.mentions?.users?.first() || ctx.user;
            const imgUrl = await fetchAnimeImage('blowkiss', false);

            const embed = new EmbedBuilder()
                .setColor('#FF79C6')
                .setDescription(
                    target.id === ctx.user.id 
                        ? `**${ctx.user.username}** blows a sweet starlight kiss to everyone! ✨💋`
                        : `**${ctx.user.username}** blows a passionate kiss to **<@${target.id}>**! 💋✨`
                )
                .setImage(imgUrl)
                .setFooter({ text: 'Starry Romance Actions • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 9. ECCHI (Anime Artwork - Strict NSFW Channel Only)
    {
        name: 'ecchi',
        category: 'NSFW',
        description: 'Get mature anime artwork (Strictly NSFW Channels Only).',
        usage: ',ecchi',
        async execute(ctx) {
            const nsfwStatus = await isNsfwAllowed(ctx);
            if (nsfwStatus === false) {
                if (!ctx.guild) {
                    return ctx.reply('🔒 **Mature Mode is Disabled in your DMs!**\n*Run `,nsfw dms on` to enable mature anime commands in private DMs.*');
                }
                return ctx.reply(`🔒 **NSFW Module is Disabled for this Server!**\n*Only the **Server Owner** (<@${ctx.guild.ownerId}>) or **Bot Owners** can enable it with \`,nsfw on\`.*`);
            }
            if (nsfwStatus === 'CHANNEL_NOT_NSFW') {
                return ctx.reply('🔞 **Age-Restricted Channel Required!**\n*This mature command strictly requires a channel marked as Age-Restricted (NSFW) in Discord channel settings.*');
            }

            const imgUrl = await fetchAnimeImage('ecchi', true);

            const embed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('🔞 Anime Ecchi Artwork (18+)')
                .setImage(imgUrl)
                .setFooter({ text: `Requested by ${ctx.user.username} • Strict 18+ Verification` })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 10. HENTAI (Mature Anime Gallery - Strict NSFW Channel Only)
    {
        name: 'hentai',
        aliases: ['nsfwhentai'],
        category: 'NSFW',
        description: 'Get mature anime artwork (Strictly NSFW Channels Only).',
        usage: ',hentai',
        async execute(ctx) {
            const nsfwStatus = await isNsfwAllowed(ctx);
            if (nsfwStatus === false) {
                if (!ctx.guild) {
                    return ctx.reply('🔒 **Mature Mode is Disabled in your DMs!**\n*Run `,nsfw dms on` to enable mature anime commands in private DMs.*');
                }
                return ctx.reply(`🔒 **NSFW Module is Disabled for this Server!**\n*Only the **Server Owner** (<@${ctx.guild.ownerId}>) or **Bot Owners** can enable it with \`,nsfw on\`.*`);
            }
            if (nsfwStatus === 'CHANNEL_NOT_NSFW') {
                return ctx.reply('🔞 **Age-Restricted Channel Required!**\n*This mature command strictly requires a channel marked as Age-Restricted (NSFW) in Discord channel settings.*');
            }

            const imgUrl = await fetchAnimeImage('hentai', true);

            const embed = new EmbedBuilder()
                .setColor('#E91E63')
                .setTitle('🔞 Mature Anime Gallery (18+)')
                .setImage(imgUrl)
                .setFooter({ text: `Requested by ${ctx.user.username} • Strict 18+ Verification` })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 11. NSFW KISS (Passionate Romantic Anime Kiss)
    {
        name: 'nsfwkiss',
        aliases: ['frenchkiss', 'deepkiss'],
        category: 'NSFW',
        description: 'Share an intensely passionate anime kiss with someone special (NSFW Only).',
        usage: ',nsfwkiss <@user>',
        async execute(ctx) {
            const nsfwStatus = await isNsfwAllowed(ctx);
            if (nsfwStatus === false) {
                if (!ctx.guild) {
                    return ctx.reply('🔒 **Mature Mode is Disabled in your DMs!**\n*Run `,nsfw dms on` to enable mature commands in private DMs.*');
                }
                return ctx.reply(`🔒 **NSFW Module is Disabled for this Server!**\n*Only the **Server Owner** (<@${ctx.guild.ownerId}>) or **Bot Owners** can enable it with \`,nsfw on\`.*`);
            }
            if (nsfwStatus === 'CHANNEL_NOT_NSFW') {
                return ctx.reply('🔞 **Age-Restricted Channel Required!**\n*This mature command requires a channel marked as Age-Restricted (NSFW).*');
            }

            const target = ctx.message?.mentions?.users?.first();
            if (!target || target.id === ctx.user.id) {
                return ctx.reply('💋 **Please mention someone special to kiss!** *Example: `,nsfwkiss @user`*');
            }

            const count = getActionCount('nsfwkiss', ctx.user.id, target.id);
            const gif = getRandomNsfwGif('kiss');

            const embed = new EmbedBuilder()
                .setColor('#FF1493')
                .setAuthor({ name: '🔞 Mature Anime Romance', iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setDescription(`💋 **${ctx.user.username}** passionately kisses **<@${target.id}>** on the lips!\n*They have shared ${count} passionate kisses!* ✨`)
                .setImage(gif)
                .setFooter({ text: 'Starry Mature Social • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 12. NSFW HUG (Tight Romantic Anime Embrace)
    {
        name: 'nsfwhug',
        aliases: ['warmhug', 'intimatehug'],
        category: 'NSFW',
        description: 'Hold someone in a deeply intimate and tight romantic embrace (NSFW Only).',
        usage: ',nsfwhug <@user>',
        async execute(ctx) {
            const nsfwStatus = await isNsfwAllowed(ctx);
            if (nsfwStatus === false) {
                if (!ctx.guild) {
                    return ctx.reply('🔒 **Mature Mode is Disabled in your DMs!**\n*Run `,nsfw dms on` to enable mature commands in private DMs.*');
                }
                return ctx.reply(`🔒 **NSFW Module is Disabled for this Server!**\n*Only the **Server Owner** (<@${ctx.guild.ownerId}>) or **Bot Owners** can enable it with \`,nsfw on\`.*`);
            }
            if (nsfwStatus === 'CHANNEL_NOT_NSFW') {
                return ctx.reply('🔞 **Age-Restricted Channel Required!**\n*This mature command requires a channel marked as Age-Restricted (NSFW).*');
            }

            const target = ctx.message?.mentions?.users?.first();
            if (!target || target.id === ctx.user.id) {
                return ctx.reply('🫂 **Please mention someone to hug closely!** *Example: `,nsfwhug @user`*');
            }

            const count = getActionCount('nsfwhug', ctx.user.id, target.id);
            const gif = getRandomNsfwGif('hug');

            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setAuthor({ name: '🔞 Mature Anime Romance', iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setDescription(`🫂 **${ctx.user.username}** pulls **<@${target.id}>** into a deeply intimate, tight embrace...\n*They have embraced warmly ${count} times!* 💖`)
                .setImage(gif)
                .setFooter({ text: 'Starry Mature Social • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 13. SPANK (Playful Anime Spank)
    {
        name: 'spank',
        aliases: ['nsfwspank'],
        category: 'NSFW',
        description: 'Give a playful anime spank to a naughty member (NSFW Only).',
        usage: ',spank <@user>',
        async execute(ctx) {
            const nsfwStatus = await isNsfwAllowed(ctx);
            if (nsfwStatus === false) {
                if (!ctx.guild) {
                    return ctx.reply('🔒 **Mature Mode is Disabled in your DMs!**\n*Run `,nsfw dms on` to enable mature commands in private DMs.*');
                }
                return ctx.reply(`🔒 **NSFW Module is Disabled for this Server!**\n*Only the **Server Owner** (<@${ctx.guild.ownerId}>) or **Bot Owners** can enable it with \`,nsfw on\`.*`);
            }
            if (nsfwStatus === 'CHANNEL_NOT_NSFW') {
                return ctx.reply('🔞 **Age-Restricted Channel Required!**\n*This mature command requires a channel marked as Age-Restricted (NSFW).*');
            }

            const target = ctx.message?.mentions?.users?.first();
            if (!target || target.id === ctx.user.id) {
                return ctx.reply('👋 **Please mention someone to playfully spank!** *Example: `,spank @user`*');
            }

            const count = getActionCount('spank', ctx.user.id, target.id);
            const gif = getRandomNsfwGif('spank');

            const embed = new EmbedBuilder()
                .setColor('#E91E63')
                .setAuthor({ name: '🔞 Mature Anime Interaction', iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setDescription(`👋 **${ctx.user.username}** playfully spanks **<@${target.id}>** for being naughty! 🍑💥\n*Total spanks given: ${count} times!*`)
                .setImage(gif)
                .setFooter({ text: 'Starry Mature Social • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 14. NSFW LICK (Teasing Sensual Anime Lick)
    {
        name: 'nsfwlick',
        aliases: ['sensuallick'],
        category: 'NSFW',
        description: 'Sensually lick someone in chat (NSFW Only).',
        usage: ',nsfwlick <@user>',
        async execute(ctx) {
            const nsfwStatus = await isNsfwAllowed(ctx);
            if (nsfwStatus === false) {
                if (!ctx.guild) {
                    return ctx.reply('🔒 **Mature Mode is Disabled in your DMs!**\n*Run `,nsfw dms on` to enable mature commands in private DMs.*');
                }
                return ctx.reply(`🔒 **NSFW Module is Disabled for this Server!**\n*Only the **Server Owner** (<@${ctx.guild.ownerId}>) or **Bot Owners** can enable it with \`,nsfw on\`.*`);
            }
            if (nsfwStatus === 'CHANNEL_NOT_NSFW') {
                return ctx.reply('🔞 **Age-Restricted Channel Required!**\n*This mature command requires a channel marked as Age-Restricted (NSFW).*');
            }

            const target = ctx.message?.mentions?.users?.first();
            if (!target || target.id === ctx.user.id) {
                return ctx.reply('👅 **Please mention someone to lick!** *Example: `,nsfwlick @user`*');
            }

            const count = getActionCount('nsfwlick', ctx.user.id, target.id);
            const gif = getRandomNsfwGif('lick');

            const embed = new EmbedBuilder()
                .setColor('#FF4081')
                .setAuthor({ name: '🔞 Mature Anime Interaction', iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setDescription(`👅 **${ctx.user.username}** sensually licks **<@${target.id}>** on the neck! 💕\n*Total licks shared: ${count} times!*`)
                .setImage(gif)
                .setFooter({ text: 'Starry Mature Social • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 15. NSFW TOUCH (Sensory Anime Touch / Caress)
    {
        name: 'nsfwtouch',
        aliases: ['caress'],
        category: 'NSFW',
        description: 'Sensually caress and touch someone in chat (NSFW Only).',
        usage: ',nsfwtouch <@user>',
        async execute(ctx) {
            const nsfwStatus = await isNsfwAllowed(ctx);
            if (nsfwStatus === false) {
                if (!ctx.guild) {
                    return ctx.reply('🔒 **Mature Mode is Disabled in your DMs!**\n*Run `,nsfw dms on` to enable mature commands in private DMs.*');
                }
                return ctx.reply(`🔒 **NSFW Module is Disabled for this Server!**\n*Only the **Server Owner** (<@${ctx.guild.ownerId}>) or **Bot Owners** can enable it with \`,nsfw on\`.*`);
            }
            if (nsfwStatus === 'CHANNEL_NOT_NSFW') {
                return ctx.reply('🔞 **Age-Restricted Channel Required!**\n*This mature command requires a channel marked as Age-Restricted (NSFW).*');
            }

            const target = ctx.message?.mentions?.users?.first();
            if (!target || target.id === ctx.user.id) {
                return ctx.reply('👉 **Please mention someone to caress!** *Example: `,nsfwtouch @user`*');
            }

            const count = getActionCount('nsfwtouch', ctx.user.id, target.id);
            const gif = getRandomNsfwGif('touch');

            const embed = new EmbedBuilder()
                .setColor('#BA68C8')
                .setAuthor({ name: '🔞 Mature Anime Interaction', iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setDescription(`✨ **${ctx.user.username}** gently and sensually caresses **<@${target.id}>**...\n*Total touches shared: ${count} times!* 💫`)
                .setImage(gif)
                .setFooter({ text: 'Starry Mature Social • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 16. NSFW CUDDLE (Warm Bedtime Romance Cuddle)
    {
        name: 'nsfwcuddle',
        aliases: ['bedcuddle', 'cozycuddle'],
        category: 'NSFW',
        description: 'Snuggle up and cuddle closely in bed with someone special (NSFW Only).',
        usage: ',nsfwcuddle <@user>',
        async execute(ctx) {
            const nsfwStatus = await isNsfwAllowed(ctx);
            if (nsfwStatus === false) {
                if (!ctx.guild) {
                    return ctx.reply('🔒 **Mature Mode is Disabled in your DMs!**\n*Run `,nsfw dms on` to enable mature commands in private DMs.*');
                }
                return ctx.reply(`🔒 **NSFW Module is Disabled for this Server!**\n*Only the **Server Owner** (<@${ctx.guild.ownerId}>) or **Bot Owners** can enable it with \`,nsfw on\`.*`);
            }
            if (nsfwStatus === 'CHANNEL_NOT_NSFW') {
                return ctx.reply('🔞 **Age-Restricted Channel Required!**\n*This mature command requires a channel marked as Age-Restricted (NSFW).*');
            }

            const target = ctx.message?.mentions?.users?.first();
            if (!target || target.id === ctx.user.id) {
                return ctx.reply('🛏️ **Please mention someone to cuddle with!** *Example: `,nsfwcuddle @user`*');
            }

            const count = getActionCount('nsfwcuddle', ctx.user.id, target.id);
            const gif = getRandomNsfwGif('cuddle');

            const embed = new EmbedBuilder()
                .setColor('#F06292')
                .setAuthor({ name: '🔞 Mature Anime Romance', iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setDescription(`🛏️ **${ctx.user.username}** cuddles up warmly and snugly with **<@${target.id}>** under the starry blankets... 🌌\n*They have cuddled intimately ${count} times!* 💖`)
                .setImage(gif)
                .setFooter({ text: 'Starry Mature Social • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 17. SUCK / NSFWSUCK
    {
        name: 'nsfwsuck',
        aliases: ['suck2', 'nibble'],
        category: 'NSFW',
        description: 'Intimately suck or nibble someone special in chat (NSFW Only).',
        usage: ',nsfwsuck <@user>',
        async execute(ctx) {
            const nsfwStatus = await isNsfwAllowed(ctx);
            if (nsfwStatus === false) {
                if (!ctx.guild) {
                    return ctx.reply('🔒 **Mature Mode is Disabled in your DMs!**\n*Run `,nsfw dms on` to enable mature commands in private DMs.*');
                }
                return ctx.reply(`🔒 **NSFW Module is Disabled for this Server!**\n*Only the **Server Owner** (<@${ctx.guild.ownerId}>) or **Bot Owners** can enable it with \`,nsfw on\`.*`);
            }
            if (nsfwStatus === 'CHANNEL_NOT_NSFW') {
                return ctx.reply('🔞 **Age-Restricted Channel Required!**\n*This mature command requires a channel marked as Age-Restricted (NSFW).*');
            }

            const target = ctx.message?.mentions?.users?.first();
            if (!target || target.id === ctx.user.id) {
                return ctx.reply('🍭 **Please mention someone to nibble!** *Example: `,nsfwsuck @user`*');
            }

            const count = getActionCount('suck', ctx.user.id, target.id);
            const gif = getRandomNsfwGif('suck');

            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setAuthor({ name: '🔞 Mature Anime Interaction', iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setDescription(`🍭 **${ctx.user.username}** teasingly sucks and nibbles on **<@${target.id}>**! 💕\n*Shared together ${count} times!* ✨`)
                .setImage(gif)
                .setFooter({ text: 'Starry Mature Suite • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 18. PINCH / NSFWPINCH
    {
        name: 'nsfwpinch',
        aliases: ['pinch2'],
        category: 'NSFW',
        description: 'Give a teasing anime pinch to someone special (NSFW Only).',
        usage: ',nsfwpinch <@user>',
        async execute(ctx) {
            const nsfwStatus = await isNsfwAllowed(ctx);
            if (nsfwStatus === false) {
                if (!ctx.guild) {
                    return ctx.reply('🔒 **Mature Mode is Disabled in your DMs!**\n*Run `,nsfw dms on` to enable mature commands in private DMs.*');
                }
                return ctx.reply(`🔒 **NSFW Module is Disabled for this Server!**\n*Only the **Server Owner** (<@${ctx.guild.ownerId}>) or **Bot Owners** can enable it with \`,nsfw on\`.*`);
            }
            if (nsfwStatus === 'CHANNEL_NOT_NSFW') {
                return ctx.reply('🔞 **Age-Restricted Channel Required!**\n*This mature command requires a channel marked as Age-Restricted (NSFW).*');
            }

            const target = ctx.message?.mentions?.users?.first();
            if (!target || target.id === ctx.user.id) {
                return ctx.reply('🤏 **Please mention someone to pinch!** *Example: `,nsfwpinch @user`*');
            }

            const count = getActionCount('pinch', ctx.user.id, target.id);
            const gif = getRandomNsfwGif('pinch');

            const embed = new EmbedBuilder()
                .setColor('#E67E22')
                .setAuthor({ name: '🔞 Mature Anime Interaction', iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setDescription(`🤏 **${ctx.user.username}** cheekily pinches **<@${target.id}>**! 💢\n*Pinched ${count} times!*`)
                .setImage(gif)
                .setFooter({ text: 'Starry Mature Suite • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 19. SMACK / SMACK2
    {
        name: 'nsfwsmack',
        aliases: ['smack2'],
        category: 'NSFW',
        description: 'Dramatically smack someone in chat (NSFW Only).',
        usage: ',nsfwsmack <@user>',
        async execute(ctx) {
            const nsfwStatus = await isNsfwAllowed(ctx);
            if (nsfwStatus === false) {
                if (!ctx.guild) {
                    return ctx.reply('🔒 **Mature Mode is Disabled in your DMs!**\n*Run `,nsfw dms on` to enable mature commands in private DMs.*');
                }
                return ctx.reply(`🔒 **NSFW Module is Disabled for this Server!**\n*Only the **Server Owner** (<@${ctx.guild.ownerId}>) or **Bot Owners** can enable it with \`,nsfw on\`.*`);
            }
            if (nsfwStatus === 'CHANNEL_NOT_NSFW') {
                return ctx.reply('🔞 **Age-Restricted Channel Required!**\n*This mature command requires a channel marked as Age-Restricted (NSFW).*');
            }

            const target = ctx.message?.mentions?.users?.first();
            if (!target || target.id === ctx.user.id) {
                return ctx.reply('💥 **Please mention someone to smack!** *Example: `,nsfwsmack @user`*');
            }

            const count = getActionCount('smack', ctx.user.id, target.id);
            const gif = getRandomNsfwGif('smack');

            const embed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setAuthor({ name: '🔞 Mature Anime Interaction', iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                .setDescription(`💥 **${ctx.user.username}** forcefully smacks **<@${target.id}>**! 💢\n*Smacked ${count} times!*`)
                .setImage(gif)
                .setFooter({ text: 'Starry Mature Suite • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 20. NSFW HELP (Dedicated Help Menu for Mature Commands)
    {
        name: 'nsfwhelp',
        aliases: ['maturehelp', '18plushelp'],
        category: 'NSFW',
        description: 'View the complete list of mature and anime NSFW commands.',
        usage: ',nsfwhelp',
        async execute(ctx) {
            const isGuild = Boolean(ctx.guild);
            let isAllowed = false;

            if (!isGuild) {
                isAllowed = await isNsfwDmEnabled(ctx.user.id);
            } else {
                let settings = await ServerSettings.findOne({ guildId: ctx.guild.id });
                isAllowed = Boolean(settings?.nsfw?.enabled);
            }

            const embed = new EmbedBuilder()
                .setColor('#FF1493')
                .setAuthor({ name: '🔞 Starry Mature & Anime NSFW System', iconURL: 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96' })
                .setTitle('🔞 Complete Mature Anime & Social Roleplay Suite')
                .setDescription(
                    `**🛡️ Activation & Authorization:**\n` +
                    `• **Server Activation:** Restricted strictly to the **Server Owner** (<@${ctx.guild?.ownerId || 'Owner'}>) and **Bot Owners**.\n` +
                    `• **Server Command:** \`${config.DEFAULT_PREFIX}nsfw on\` / \`${config.DEFAULT_PREFIX}nsfw off\`\n` +
                    `• **Personal DM Activation:** Any member can opt in/out: \`${config.DEFAULT_PREFIX}nsfw dms on\` / \`${config.DEFAULT_PREFIX}nsfw dms off\`\n` +
                    `• **Channel Rule:** In servers, commands **strictly execute in Discord channels marked as Age-Restricted (NSFW)**.\n\n` +
                    `**🌸 Anime Art Galleries:**\n` +
                    `\`${config.DEFAULT_PREFIX}waifu\`, \`${config.DEFAULT_PREFIX}neko\`, \`${config.DEFAULT_PREFIX}kitsune\`, \`${config.DEFAULT_PREFIX}husbando\`, \`${config.DEFAULT_PREFIX}trap\`, \`${config.DEFAULT_PREFIX}ecchi\`, \`${config.DEFAULT_PREFIX}hentai\`, \`${config.DEFAULT_PREFIX}blowkiss\`\n\n` +
                    `**💋 Mature Social & Romantic Interactions:**\n` +
                    `\`${config.DEFAULT_PREFIX}nsfwkiss\`, \`${config.DEFAULT_PREFIX}nsfwhug\`, \`${config.DEFAULT_PREFIX}spank\`, \`${config.DEFAULT_PREFIX}nsfwlick\`, \`${config.DEFAULT_PREFIX}nsfwtouch\`, \`${config.DEFAULT_PREFIX}nsfwcuddle\`, \`${config.DEFAULT_PREFIX}nsfwsuck\`, \`${config.DEFAULT_PREFIX}nsfwpinch\`, \`${config.DEFAULT_PREFIX}nsfwsmack\`\n\n` +
                    `**🎭 All-Ages Social Roleplay (Usable in Any Channel):**\n` +
                    `\`${config.DEFAULT_PREFIX}hug\`, \`${config.DEFAULT_PREFIX}kiss\`, \`${config.DEFAULT_PREFIX}pat\`, \`${config.DEFAULT_PREFIX}cuddle\`, \`${config.DEFAULT_PREFIX}bite\`, \`${config.DEFAULT_PREFIX}lick\`, \`${config.DEFAULT_PREFIX}pinch\`, \`${config.DEFAULT_PREFIX}smack\`, \`${config.DEFAULT_PREFIX}suck\`, \`${config.DEFAULT_PREFIX}nom\`, \`${config.DEFAULT_PREFIX}slap\`, \`${config.DEFAULT_PREFIX}poke\`, \`${config.DEFAULT_PREFIX}punch\`, \`${config.DEFAULT_PREFIX}tickle\`, \`${config.DEFAULT_PREFIX}highfive\`\n\n` +
                    `**🌟 Starry Mascot System:**\n` +
                    `\`${config.DEFAULT_PREFIX}starry\`, \`${config.DEFAULT_PREFIX}starry mood\`, \`${config.DEFAULT_PREFIX}starry affinity\`, \`${config.DEFAULT_PREFIX}starry gift\`, \`${config.DEFAULT_PREFIX}starry lore\``
                )
                .setFooter({ text: 'Starry Mature Suite • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 21. TOGGLE NSFW DM
    {
        name: 'togglensfwdm',
        aliases: ['dmtoggle', 'nsfwdmtoggle'],
        category: 'NSFW',
        description: 'Quick toggle for Mature Anime Mode in your private Direct Messages (DMs).',
        usage: ',togglensfwdm',
        async execute(ctx) {
            const newState = await toggleNsfwDm(ctx.user.id);
            return ctx.reply(
                newState
                    ? '🔞 **Mature Anime Mode ENABLED in your DMs!**\n*You can now use mature anime commands (waifu, hentai, ecchi, etc.) in Direct Messages with Starry.*'
                    : '🔒 **Mature Anime Mode DISABLED in your DMs.**'
            );
        }
    }
];

module.exports = commands;
