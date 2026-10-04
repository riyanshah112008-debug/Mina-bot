// ==========================================
// 🛡️ Starry SUPREME MODERATION SUITE (32 COMMANDS)
// File Path: src/commands/bundles/moderationCommands.js
// Hierarchy Protection, Instant DM Notices, 1-Year Mod Panels
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits,
    ChannelType,
    AttachmentBuilder
} = require('discord.js');
const config = require('../../config');
const { ONE_YEAR_MS } = require('../../utils/contextHelper');
const ModCase = require('../../models/ModCase');
const { requirePremium } = require('../../utils/premiumHelper');
const automodHelper = require('../../utils/automodHelper');

// Helper to parse duration string like 10m, 1h, 1d to ms
function parseDuration(str) {
    if (!str) return null;
    const match = str.match(/^(\d+)(s|m|h|d|w)?$/i);
    if (!match) return null;
    const num = parseInt(match[1]);
    const unit = (match[2] || 'm').toLowerCase();
    switch (unit) {
        case 's': return num * 1000;
        case 'm': return num * 60 * 1000;
        case 'h': return num * 60 * 60 * 1000;
        case 'd': return num * 24 * 60 * 60 * 1000;
        case 'w': return num * 7 * 24 * 60 * 60 * 1000;
        default: return num * 60 * 1000;
    }
}

// Check if executor can moderate target
function checkHierarchy(executorMember, targetMember, guild) {
    if (config.BOT_OWNERS.includes(executorMember.id)) return { allowed: true };
    if (executorMember.id === guild.ownerId) return { allowed: true };
    if (targetMember.id === executorMember.id) return { allowed: false, reason: "You cannot moderate yourself!" };
    if (targetMember.id === guild.ownerId) return { allowed: false, reason: "You cannot moderate the Server Owner!" };
    if (targetMember.roles.highest.position >= executorMember.roles.highest.position) {
        return { allowed: false, reason: "Target has a higher or equal role than you!" };
    }
    const botMember = guild.members.me;
    if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
        return { allowed: false, reason: "Bot cannot moderate this user due to role hierarchy!" };
    }
    return { allowed: true };
}

// Extract target user / member from args or mentions
async function resolveTarget(ctx, argIndex = 0) {
    if (ctx.isSlash) {
        const u = ctx.interaction.options.getUser('target') || ctx.interaction.options.getUser('user');
        if (u) {
            const m = await ctx.guild.members.fetch(u.id).catch(() => null);
            return { user: u, member: m };
        }
    }
    if (ctx.message?.mentions?.users?.size > 0) {
        const u = ctx.message.mentions.users.first();
        const m = await ctx.guild.members.fetch(u.id).catch(() => null);
        return { user: u, member: m };
    }
    const rawId = ctx.args[argIndex]?.replace(/[^0-9]/g, '');
    if (rawId) {
        const u = await ctx.client.users.fetch(rawId).catch(() => null);
        const m = await ctx.guild.members.fetch(rawId).catch(() => null);
        if (u) return { user: u, member: m };
    }
    return { user: null, member: null };
}

// In-memory / MongoDB warning store helper
const warningMemoryMap = new Map();

const commands = [
    // 1. BAN
    {
        name: 'ban',
        aliases: ['b'],
        category: 'Moderation',
        description: 'Ban a member from the server with optional reason.',
        usage: ',ban <@user / ID> [reason]',
        permissions: [PermissionFlagsBits.BanMembers],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.BanMembers) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ You need **Ban Members** permission to use this command.');
            }
            const { user: targetUser, member: targetMember } = await resolveTarget(ctx, 0);
            if (!targetUser) return ctx.reply('❌ Please mention a user or provide a valid User ID to ban.\n*Usage: `,ban @user [reason]`*');

            if (targetMember) {
                const hier = checkHierarchy(ctx.member, targetMember, ctx.guild);
                if (!hier.allowed) return ctx.reply(`❌ Cannot ban: **${hier.reason}**`);
            }

            const reason = ctx.args.slice(1).join(' ') || 'No reason provided';
            await targetUser.send(`🔨 You were banned from **${ctx.guild.name}**\n**Reason:** ${reason}\n**Moderator:** ${ctx.user.tag}`).catch(() => {});
            await ctx.guild.members.ban(targetUser.id, { reason: `${reason} | By: ${ctx.user.tag}` });

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.DANGER)
                .setTitle('🔨 Member Banned')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 User', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                    { name: '🛡️ Moderator', value: `${ctx.user.tag}`, inline: true },
                    { name: '📝 Reason', value: `>>> ${reason}`, inline: false }
                )
                .setFooter({ text: 'Starry Moderation Engine • Prefix: ,' })
                .setTimestamp();
            return ctx.reply({ embeds: [embed] });
        }
    },

    // 2. UNBAN
    {
        name: 'unban',
        aliases: ['ub'],
        category: 'Moderation',
        description: 'Unban a user by their User ID.',
        usage: ',unban <User ID> [reason]',
        permissions: [PermissionFlagsBits.BanMembers],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.BanMembers) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ You need **Ban Members** permission to use this command.');
            }
            const userId = ctx.args[0]?.replace(/[^0-9]/g, '');
            if (!userId) return ctx.reply('❌ Provide the User ID to unban: `,unban 123456789012345678`');

            const reason = ctx.args.slice(1).join(' ') || 'No reason provided';
            try {
                await ctx.guild.members.unban(userId, `${reason} | By: ${ctx.user.tag}`);
                return ctx.reply(`✅ **Successfully unbanned User ID \`${userId}\`.**`);
            } catch (err) {
                return ctx.reply(`❌ Could not unban User ID \`${userId}\`. Ensure the ID is valid and currently banned.`);
            }
        }
    },

    // 3. SOFTBAN
    {
        name: 'softban',
        aliases: ['sb'],
        category: 'Moderation',
        description: 'Ban and immediately unban a member to wipe their recent messages.',
        usage: ',softban <@user / ID> [reason]',
        permissions: [PermissionFlagsBits.BanMembers],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.BanMembers) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ You need **Ban Members** permission.');
            }
            const { user: targetUser, member: targetMember } = await resolveTarget(ctx, 0);
            if (!targetUser) return ctx.reply('❌ Specify a user to softban.');
            if (targetMember) {
                const hier = checkHierarchy(ctx.member, targetMember, ctx.guild);
                if (!hier.allowed) return ctx.reply(`❌ Cannot softban: **${hier.reason}**`);
            }
            const reason = ctx.args.slice(1).join(' ') || 'Softban message cleanup';
            await ctx.guild.members.ban(targetUser.id, { reason: `Softban: ${reason}`, deleteMessageSeconds: 7 * 86400 });
            await ctx.guild.members.unban(targetUser.id, 'Softban unban');
            return ctx.reply(`🧹 **Softbanned ${targetUser.tag}** (Wiped 7 days of messages).`);
        }
    },

    // 4. TEMPBAN
    {
        name: 'tempban',
        aliases: ['tb'],
        category: 'Moderation',
        description: 'Temporarily ban a user for a specified duration (e.g. 1d, 12h).',
        usage: ',tempban <@user / ID> <duration> [reason]',
        permissions: [PermissionFlagsBits.BanMembers],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.BanMembers) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ You need **Ban Members** permission.');
            }
            const { user: targetUser, member: targetMember } = await resolveTarget(ctx, 0);
            if (!targetUser) return ctx.reply('❌ Specify a user to tempban.');
            if (targetMember) {
                const hier = checkHierarchy(ctx.member, targetMember, ctx.guild);
                if (!hier.allowed) return ctx.reply(`❌ Cannot tempban: **${hier.reason}**`);
            }
            const durationMs = parseDuration(ctx.args[1]);
            if (!durationMs) return ctx.reply('❌ Invalid duration! Example: `,tempban @user 1d Rule violations` (units: m, h, d, w)');
            const reason = ctx.args.slice(2).join(' ') || 'Temporary Ban';

            await ctx.guild.members.ban(targetUser.id, { reason: `Tempban (${ctx.args[1]}): ${reason}` });
            setTimeout(async () => {
                await ctx.guild.members.unban(targetUser.id, 'Tempban expired').catch(() => {});
            }, durationMs);

            return ctx.reply(`⏳ **Tempbanned ${targetUser.tag}** for **${ctx.args[1]}**.`);
        }
    },

    // 5. KICK
    {
        name: 'kick',
        aliases: ['k'],
        category: 'Moderation',
        description: 'Kick a member from the server.',
        usage: ',kick <@user / ID> [reason]',
        permissions: [PermissionFlagsBits.KickMembers],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.KickMembers) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ You need **Kick Members** permission.');
            }
            const { user: targetUser, member: targetMember } = await resolveTarget(ctx, 0);
            if (!targetMember) return ctx.reply('❌ Please specify a member currently in the server.');
            const hier = checkHierarchy(ctx.member, targetMember, ctx.guild);
            if (!hier.allowed) return ctx.reply(`❌ Cannot kick: **${hier.reason}**`);

            const reason = ctx.args.slice(1).join(' ') || 'No reason provided';
            await targetUser.send(`🚪 You were kicked from **${ctx.guild.name}**\n**Reason:** ${reason}`).catch(() => {});
            await targetMember.kick(`${reason} | By: ${ctx.user.tag}`);

            return ctx.reply(`🚪 **Successfully kicked ${targetUser.tag}** from the server.`);
        }
    },

    // 6. MUTE / TIMEOUT
    {
        name: 'mute',
        aliases: ['timeout', 'tempmute', 'm'],
        category: 'Moderation',
        description: 'Timeout/mute a member for a duration (e.g. 10m, 1h, 1d).',
        usage: ',mute <@user> [duration] [reason]',
        permissions: [PermissionFlagsBits.ModerateMembers],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ModerateMembers) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ You need **Timeout Members** permission.');
            }
            const { user: targetUser, member: targetMember } = await resolveTarget(ctx, 0);
            if (!targetMember) return ctx.reply('❌ Specify a member to mute.');
            const hier = checkHierarchy(ctx.member, targetMember, ctx.guild);
            if (!hier.allowed) return ctx.reply(`❌ Cannot mute: **${hier.reason}**`);

            const durationMs = parseDuration(ctx.args[1]) || 10 * 60 * 1000;
            const reason = (parseDuration(ctx.args[1]) ? ctx.args.slice(2).join(' ') : ctx.args.slice(1).join(' ')) || 'No reason provided';

            await targetMember.timeout(durationMs, `${reason} | By: ${ctx.user.tag}`);
            return ctx.reply(`🔇 **Timed out ${targetUser.tag}** for **${formatTime(durationMs)}**.\n**Reason:** ${reason}`);
        }
    },

    // 7. UNMUTE / UNTIMEOUT
    {
        name: 'unmute',
        aliases: ['untimeout', 'um'],
        category: 'Moderation',
        description: 'Remove timeout/mute from a member.',
        usage: ',unmute <@user>',
        permissions: [PermissionFlagsBits.ModerateMembers],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ModerateMembers) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ You need **Timeout Members** permission.');
            }
            const { user: targetUser, member: targetMember } = await resolveTarget(ctx, 0);
            if (!targetMember) return ctx.reply('❌ Specify a member to unmute.');
            await targetMember.timeout(null, `Untimeout by ${ctx.user.tag}`);
            return ctx.reply(`🔊 **Removed timeout from ${targetUser.tag}.**`);
        }
    },

    // 8. WARN
    {
        name: 'warn',
        aliases: ['w'],
        category: 'Moderation',
        description: 'Issue an official warning to a user.',
        usage: ',warn <@user> <reason>',
        permissions: [PermissionFlagsBits.ModerateMembers],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ModerateMembers) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ You need **Moderate Members** permission.');
            }
            const { user: targetUser } = await resolveTarget(ctx, 0);
            if (!targetUser) return ctx.reply('❌ Specify a user to warn.');
            const reason = ctx.args.slice(1).join(' ');
            if (!reason) return ctx.reply('❌ Please provide a reason for the warning.');

            const key = `${ctx.guild.id}-${targetUser.id}`;
            const current = warningMemoryMap.get(key) || [];
            const warnId = Math.random().toString(36).substring(2, 7).toUpperCase();
            current.push({ id: warnId, reason, mod: ctx.user.tag, date: new Date().toISOString() });
            warningMemoryMap.set(key, current);

            await targetUser.send(`⚠️ You were officially warned in **${ctx.guild.name}**\n**Reason:** ${reason}\n**Moderator:** ${ctx.user.tag}`).catch(() => {});
            return ctx.reply(`⚠️ **Warned ${targetUser.tag}** (Warn ID: \`#${warnId}\` | Total Warns: \`${current.length}\`).\n**Reason:** ${reason}`);
        }
    },

    // 9. WARNINGS / WARNS
    {
        name: 'warnings',
        aliases: ['warns'],
        category: 'Moderation',
        description: 'View active warnings for a user.',
        usage: ',warnings <@user>',
        async execute(ctx) {
            const { user: targetUser } = await resolveTarget(ctx, 0);
            const target = targetUser || ctx.user;
            const key = `${ctx.guild.id}-${target.id}`;
            const warns = warningMemoryMap.get(key) || [];

            if (warns.length === 0) return ctx.reply(`✅ **${target.tag}** has zero active warnings.`);

            const list = warns.map((w, i) => `\`#${w.id}\` **${w.reason}** — By: *${w.mod}* (<t:${Math.floor(new Date(w.date).getTime() / 1000)}:R>)`).join('\n');
            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.WARNING)
                .setTitle(`📋 Warnings for ${target.tag} (${warns.length})`)
                .setDescription(list)
                .setFooter({ text: 'Starry Moderation Engine • Prefix: ,' })
                .setTimestamp();
            return ctx.reply({ embeds: [embed] });
        }
    },

    // 10. CLEARWARNS
    {
        name: 'clearwarns',
        aliases: ['resetwarns', 'cw'],
        category: 'Moderation',
        description: 'Clear all active warnings for a user.',
        usage: ',clearwarns <@user>',
        permissions: [PermissionFlagsBits.ModerateMembers],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ModerateMembers) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            const { user: targetUser } = await resolveTarget(ctx, 0);
            if (!targetUser) return ctx.reply('❌ Specify a user.');
            const key = `${ctx.guild.id}-${targetUser.id}`;
            warningMemoryMap.delete(key);
            return ctx.reply(`🧹 **Cleared all warnings for ${targetUser.tag}.**`);
        }
    },

    // 11. DELWARN
    {
        name: 'delwarn',
        aliases: ['removewarn'],
        category: 'Moderation',
        description: 'Delete a single warning by its ID.',
        usage: ',delwarn <@user> <warnID>',
        permissions: [PermissionFlagsBits.ModerateMembers],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ModerateMembers) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            const { user: targetUser } = await resolveTarget(ctx, 0);
            const warnId = ctx.args[1]?.toUpperCase();
            if (!targetUser || !warnId) return ctx.reply('❌ Usage: `,delwarn @user <WarnID>`');

            const key = `${ctx.guild.id}-${targetUser.id}`;
            const warns = warningMemoryMap.get(key) || [];
            const index = warns.findIndex(w => w.id === warnId);
            if (index === -1) return ctx.reply(`❌ Warning ID \`#${warnId}\` not found for this user.`);
            warns.splice(index, 1);
            warningMemoryMap.set(key, warns);
            return ctx.reply(`✅ **Deleted warning \`#${warnId}\` for ${targetUser.tag}.**`);
        }
    },

    // 12. PURGE / CLEAR
    {
        name: 'purge',
        aliases: ['clear', 'clean', 'prune'],
        category: 'Moderation',
        description: 'Bulk delete 1-100 messages from the channel.',
        usage: ',purge <1-100>',
        permissions: [PermissionFlagsBits.ManageMessages],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageMessages) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ You need **Manage Messages** permission.');
            }
            const amount = parseInt(ctx.args[0]);
            if (isNaN(amount) || amount < 1 || amount > 100) {
                return ctx.reply('❌ Specify an amount between 1 and 100 to purge: `,purge 50`');
            }
            const deleted = await ctx.channel.bulkDelete(amount, true);
            const msg = await ctx.channel.send(`🧹 **Successfully purged ${deleted.size} messages!**`);
            setTimeout(() => msg.delete().catch(() => {}), 4000);
        }
    },

    // 13. PURGEUSER
    {
        name: 'purgeuser',
        aliases: ['clearuser'],
        category: 'Moderation',
        description: 'Delete recent messages from a specific user.',
        usage: ',purgeuser <@user> [amount]',
        permissions: [PermissionFlagsBits.ManageMessages],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageMessages) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            const { user: targetUser } = await resolveTarget(ctx, 0);
            if (!targetUser) return ctx.reply('❌ Specify a user to purge messages for.');
            const limit = parseInt(ctx.args[1]) || 50;

            const fetched = await ctx.channel.messages.fetch({ limit: Math.min(limit, 100) });
            const userMessages = fetched.filter(m => m.author.id === targetUser.id);
            const deleted = await ctx.channel.bulkDelete(userMessages, true);
            return ctx.reply(`🧹 **Purged ${deleted.size} messages from ${targetUser.tag}.**`);
        }
    },

    // 14. PURGELINKS
    {
        name: 'purgelinks',
        aliases: ['clearlinks'],
        category: 'Moderation',
        description: 'Bulk delete messages containing URLs/links.',
        usage: ',purgelinks [amount]',
        permissions: [PermissionFlagsBits.ManageMessages],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageMessages) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            const limit = parseInt(ctx.args[0]) || 50;
            const fetched = await ctx.channel.messages.fetch({ limit: Math.min(limit, 100) });
            const linkMsgs = fetched.filter(m => /(https?:\/\/[^\s]+)/gi.test(m.content));
            const deleted = await ctx.channel.bulkDelete(linkMsgs, true);
            return ctx.reply(`🧹 **Purged ${deleted.size} link messages.**`);
        }
    },

    // 15. PURGEBOT
    {
        name: 'purgebot',
        aliases: ['clearbot', 'botclean'],
        category: 'Moderation',
        description: 'Bulk delete recent bot commands and bot replies.',
        usage: ',purgebot [amount]',
        permissions: [PermissionFlagsBits.ManageMessages],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageMessages) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            const limit = parseInt(ctx.args[0]) || 50;
            const fetched = await ctx.channel.messages.fetch({ limit: Math.min(limit, 100) });
            const botMsgs = fetched.filter(m => m.author.bot || m.content.startsWith(','));
            const deleted = await ctx.channel.bulkDelete(botMsgs, true);
            return ctx.reply(`🤖 **Purged ${deleted.size} bot messages.**`);
        }
    },

    // 16. SLOWMODE
    {
        name: 'slowmode',
        aliases: ['sm'],
        category: 'Moderation',
        description: 'Set channel slowmode delay (0 to 21600 seconds).',
        usage: ',slowmode <seconds / 0 to disable>',
        permissions: [PermissionFlagsBits.ManageChannels],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageChannels) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            const seconds = parseInt(ctx.args[0]);
            if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
                return ctx.reply('❌ Provide seconds between 0 and 21600: `,slowmode 5`');
            }
            await ctx.channel.setRateLimitPerUser(seconds);
            return ctx.reply(`⏱️ **Slowmode set to ${seconds}s** ${seconds === 0 ? '(Disabled)' : ''}.`);
        }
    },

    // 17. LOCK
    {
        name: 'lock',
        aliases: ['lockchannel'],
        category: 'Moderation',
        description: 'Lock current channel from @everyone sending messages.',
        usage: ',lock [reason]',
        permissions: [PermissionFlagsBits.ManageChannels],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageChannels) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            await ctx.channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: false });
            return ctx.reply('🔒 **This channel is now LOCKED.**');
        }
    },

    // 18. UNLOCK
    {
        name: 'unlock',
        aliases: ['unlockchannel'],
        category: 'Moderation',
        description: 'Unlock a locked channel.',
        usage: ',unlock',
        permissions: [PermissionFlagsBits.ManageChannels],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageChannels) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            await ctx.channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: null });
            return ctx.reply('🔓 **This channel is now UNLOCKED.**');
        }
    },

    // 19. LOCKDOWN
    {
        name: 'lockdown',
        aliases: ['masslock'],
        category: 'Moderation',
        description: 'Emergency lockdown of all public text channels in server.',
        usage: ',lockdown',
        permissions: [PermissionFlagsBits.Administrator],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Administrator permissions required for server-wide lockdown.');
            }
            if (!await requirePremium(ctx, 'Emergency Server Lockdown Shield')) return;
            let count = 0;
            for (const ch of ctx.guild.channels.cache.values()) {
                if (ch.type === ChannelType.GuildText) {
                    await ch.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: false }).catch(() => {});
                    count++;
                }
            }
            return ctx.reply(`🚨 **SERVER LOCKDOWN ACTIVE:** Locked **${count}** text channels.`);
        }
    },

    // 20. UNLOCKDOWN
    {
        name: 'unlockdown',
        aliases: ['massunlock'],
        category: 'Moderation',
        description: 'End server-wide emergency lockdown.',
        usage: ',unlockdown',
        permissions: [PermissionFlagsBits.Administrator],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Administrator permissions required.');
            }
            if (!await requirePremium(ctx, 'Emergency Server Lockdown Shield')) return;
            let count = 0;
            for (const ch of ctx.guild.channels.cache.values()) {
                if (ch.type === ChannelType.GuildText) {
                    await ch.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: null }).catch(() => {});
                    count++;
                }
            }
            return ctx.reply(`🟢 **SERVER LOCKDOWN ENDED:** Restored access across **${count}** text channels.`);
        }
    },

    // 21. NUKE
    {
        name: 'nuke',
        category: 'Moderation',
        description: 'Recreate and completely wipe the current channel.',
        usage: ',nuke',
        permissions: [PermissionFlagsBits.ManageChannels],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageChannels) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ You need **Manage Channels** permission.');
            }
            const ch = ctx.channel;
            const pos = ch.position;
            const newCh = await ch.clone();
            await ch.delete();
            await newCh.setPosition(pos);

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle('💣 Channel Nuked')
                .setDescription(`This channel was completely sanitized and recreated by ${ctx.user}.`)
                .setImage('https://media.tenor.com/giN_G-s7Z08AAAAC/explosion-anime.gif')
                .setTimestamp();
            return newCh.send({ embeds: [embed] });
        }
    },

    // 22. HIDE
    {
        name: 'hide',
        category: 'Moderation',
        description: 'Hide channel from @everyone view.',
        usage: ',hide',
        permissions: [PermissionFlagsBits.ManageChannels],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageChannels) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            await ctx.channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { ViewChannel: false });
            return ctx.reply('👁️‍🗨️ **Channel is now HIDDEN from @everyone.**');
        }
    },

    // 23. UNHIDE
    {
        name: 'unhide',
        category: 'Moderation',
        description: 'Unhide channel for @everyone view.',
        usage: ',unhide',
        permissions: [PermissionFlagsBits.ManageChannels],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageChannels) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            await ctx.channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { ViewChannel: null });
            return ctx.reply('👁️ **Channel is now VISIBLE to @everyone.**');
        }
    },

    // 24. SETNICK
    {
        name: 'setnick',
        aliases: ['nick', 'nickname'],
        category: 'Moderation',
        description: 'Change or reset a member\'s nickname.',
        usage: ',setnick <@user> [new nickname]',
        permissions: [PermissionFlagsBits.ManageNicknames],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageNicknames) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            const { member: targetMember } = await resolveTarget(ctx, 0);
            if (!targetMember) return ctx.reply('❌ Specify a member in this server.');
            const newNick = ctx.args.slice(1).join(' ') || null;
            await targetMember.setNickname(newNick);
            return ctx.reply(`🏷️ **Updated nickname for ${targetMember.user.tag}** to \`${newNick || '*Reset*'}\`.`);
        }
    },

    // 25. ROLE
    {
        name: 'role',
        category: 'Moderation',
        description: 'Manage server roles (info/create).',
        usage: ',role create <name>',
        permissions: [PermissionFlagsBits.ManageRoles],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageRoles) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ You need **Manage Roles** permission.');
            }
            const sub = ctx.args[0]?.toLowerCase();
            if (sub === 'create') {
                const name = ctx.args.slice(1).join(' ');
                if (!name) return ctx.reply('❌ Specify a role name.');
                const role = await ctx.guild.roles.create({ name, reason: `Created by ${ctx.user.tag}` });
                return ctx.reply(`✅ **Created role:** <@&${role.id}> (\`${role.name}\`)`);
            }
            return ctx.reply('ℹ️ **Role Commands:** `,addrole @user @role`, `,removerole @user @role`, `,role create <name>`');
        }
    },

    // 26. ADDROLE
    {
        name: 'addrole',
        aliases: ['roleadd', 'giverole'],
        category: 'Moderation',
        description: 'Add a role to a member.',
        usage: ',addrole <@user> <@role / role name>',
        permissions: [PermissionFlagsBits.ManageRoles],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageRoles) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            const { member: targetMember } = await resolveTarget(ctx, 0);
            if (!targetMember) return ctx.reply('❌ Specify a member.');

            const roleQuery = ctx.args.slice(1).join(' ').replace(/[^0-9]/g, '');
            const role = ctx.guild.roles.cache.get(roleQuery) || ctx.guild.roles.cache.find(r => r.name.toLowerCase() === ctx.args.slice(1).join(' ').toLowerCase());
            if (!role) return ctx.reply('❌ Role not found.');

            await targetMember.roles.add(role);
            return ctx.reply(`✅ **Added role <@&${role.id}> to ${targetMember.user.tag}.**`);
        }
    },

    // 27. REMOVEROLE
    {
        name: 'removerole',
        aliases: ['roledel', 'takerole'],
        category: 'Moderation',
        description: 'Remove a role from a member.',
        usage: ',removerole <@user> <@role / role name>',
        permissions: [PermissionFlagsBits.ManageRoles],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageRoles) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            const { member: targetMember } = await resolveTarget(ctx, 0);
            if (!targetMember) return ctx.reply('❌ Specify a member.');

            const roleQuery = ctx.args.slice(1).join(' ').replace(/[^0-9]/g, '');
            const role = ctx.guild.roles.cache.get(roleQuery) || ctx.guild.roles.cache.find(r => r.name.toLowerCase() === ctx.args.slice(1).join(' ').toLowerCase());
            if (!role) return ctx.reply('❌ Role not found.');

            await targetMember.roles.remove(role);
            return ctx.reply(`✅ **Removed role <@&${role.id}> from ${targetMember.user.tag}.**`);
        }
    },

    // 28. ROLEALL
    {
        name: 'roleall',
        aliases: ['massrole'],
        category: 'Moderation',
        description: 'Give a role to all human members or bots in server.',
        usage: ',roleall <humans/bots/all> <@role>',
        permissions: [PermissionFlagsBits.Administrator],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Administrator permission required.');
            }
            const targetType = ctx.args[0]?.toLowerCase();
            const roleQuery = ctx.args.slice(1).join(' ').replace(/[^0-9]/g, '');
            const role = ctx.guild.roles.cache.get(roleQuery);
            if (!role) return ctx.reply('❌ Usage: `,roleall humans @role` or `,roleall bots @role`');

            ctx.reply(`⏳ **Applying role <@&${role.id}> to ${targetType}...**`);
            const members = await ctx.guild.members.fetch();
            let count = 0;
            for (const m of members.values()) {
                if (targetType === 'humans' && m.user.bot) continue;
                if (targetType === 'bots' && !m.user.bot) continue;
                if (!m.roles.cache.has(role.id)) {
                    await m.roles.add(role).catch(() => {});
                    count++;
                }
            }
            return ctx.channel.send(`✅ **Finished mass role:** Added <@&${role.id}> to **${count}** members.`);
        }
    },

    // 29. VCKICK
    {
        name: 'vckick',
        aliases: ['voicedisconnect'],
        category: 'Moderation',
        description: 'Disconnect a user from their voice channel.',
        usage: ',vckick <@user>',
        permissions: [PermissionFlagsBits.MoveMembers],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.MoveMembers) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            const { member: targetMember } = await resolveTarget(ctx, 0);
            if (!targetMember || !targetMember.voice?.channel) return ctx.reply('❌ User is not in a voice channel.');
            await targetMember.voice.disconnect(`VC Kick by ${ctx.user.tag}`);
            return ctx.reply(`🔌 **Disconnected ${targetMember.user.tag} from voice.**`);
        }
    },

    // 30. VCMUTE
    {
        name: 'vcmute',
        aliases: ['voicemute'],
        category: 'Moderation',
        description: 'Server-mute a member in voice channels.',
        usage: ',vcmute <@user>',
        permissions: [PermissionFlagsBits.MuteMembers],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.MuteMembers) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            const { member: targetMember } = await resolveTarget(ctx, 0);
            if (!targetMember || !targetMember.voice?.channel) return ctx.reply('❌ User is not in a voice channel.');
            await targetMember.voice.setMute(true, `VC Mute by ${ctx.user.tag}`);
            return ctx.reply(`🎙️ **Server-muted ${targetMember.user.tag} in voice.**`);
        }
    },

    // 31. VCUNMUTE
    {
        name: 'vcunmute',
        aliases: ['voiceunmute'],
        category: 'Moderation',
        description: 'Server-unmute a member in voice channels.',
        usage: ',vcunmute <@user>',
        permissions: [PermissionFlagsBits.MuteMembers],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.MuteMembers) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            const { member: targetMember } = await resolveTarget(ctx, 0);
            if (!targetMember || !targetMember.voice?.channel) return ctx.reply('❌ User is not in a voice channel.');
            await targetMember.voice.setMute(false, `VC Unmute by ${ctx.user.tag}`);
            return ctx.reply(`🎙️ **Server-unmuted ${targetMember.user.tag} in voice.**`);
        }
    },

    // 32. MODPANEL
    {
        name: 'modpanel',
        category: 'Moderation',
        description: 'Open interactive 1-Year Visual Moderation Dashboard for a user.',
        usage: ',modpanel <@user>',
        permissions: [PermissionFlagsBits.ModerateMembers],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ModerateMembers) && !config.BOT_OWNERS.includes(ctx.user.id)) {
                return ctx.reply('❌ Permission denied.');
            }
            const { user: targetUser, member: targetMember } = await resolveTarget(ctx, 0);
            if (!targetUser) return ctx.reply('❌ Specify a user: `,modpanel @user`');

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle(`🛡️ Moderation Dashboard: ${targetUser.tag}`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'User ID', value: `\`${targetUser.id}\``, inline: true },
                    { name: 'Joined Server', value: targetMember ? `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>` : 'Not in server', inline: true },
                    { name: 'Roles Count', value: targetMember ? `\`${targetMember.roles.cache.size - 1}\`` : 'N/A', inline: true }
                )
                .setDescription('*Interactive button controls with high 1-year lifetime.*')
                .setFooter({ text: 'Starry Moderation Panel • Prefix: ,' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`mp_warn_${targetUser.id}`).setLabel('Warn').setStyle(ButtonStyle.Secondary).setEmoji('⚠️'),
                new ButtonBuilder().setCustomId(`mp_timeout_${targetUser.id}`).setLabel('Timeout (10m)').setStyle(ButtonStyle.Primary).setEmoji('🔇'),
                new ButtonBuilder().setCustomId(`mp_kick_${targetUser.id}`).setLabel('Kick').setStyle(ButtonStyle.Danger).setEmoji('🚪'),
                new ButtonBuilder().setCustomId(`mp_ban_${targetUser.id}`).setLabel('Ban').setStyle(ButtonStyle.Danger).setEmoji('🔨')
            );

            return ctx.reply({ embeds: [embed], components: [row] });
        }
    },

    // 33. BANFILE / EXPORTBANS
    {
        name: 'banfile',
        aliases: ['exportbans', 'banlistfile', 'modexport'],
        category: 'Moderation',
        description: 'Export full server ban list, reasons, IDs, and timestamps as an audit file attachment.',
        usage: ',banfile [json | txt]',
        permissions: [PermissionFlagsBits.BanMembers],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.BanMembers) && !config.BOT_OWNERS.includes(ctx.user.id) && ctx.user.id !== ctx.guild.ownerId) {
                return ctx.reply('❌ Permission denied. You must have **Ban Members** permission to export audit files.');
            }

            await ctx.defer(false);

            try {
                const bans = await ctx.guild.bans.fetch();
                if (!bans || bans.size === 0) {
                    return ctx.reply('ℹ️ There are currently **0 banned users** in this server.');
                }

                const format = ctx.args[0]?.toLowerCase() === 'json' ? 'json' : 'txt';
                let fileBuffer;
                let fileName;

                if (format === 'json') {
                    const data = {
                        guildId: ctx.guild.id,
                        guildName: ctx.guild.name,
                        exportedAt: new Date().toISOString(),
                        exportedBy: `${ctx.user.tag} (${ctx.user.id})`,
                        totalBans: bans.size,
                        bans: bans.map(b => ({
                            userId: b.user.id,
                            tag: b.user.tag,
                            username: b.user.username,
                            bot: b.user.bot,
                            accountCreatedAt: b.user.createdAt ? b.user.createdAt.toISOString() : null,
                            banReason: b.reason || 'No reason specified'
                        }))
                    };
                    fileBuffer = Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
                    fileName = `${ctx.guild.name.replace(/[^a-zA-Z0-9]/g, '_')}_bans_audit.json`;
                } else {
                    let text = `====================================================\n`;
                    text += `🛡️ ${ctx.guild.name.toUpperCase()} - BAN AUDIT LOG\n`;
                    text += `Exported At : ${new Date().toUTCString()}\n`;
                    text += `Exported By : ${ctx.user.tag} (ID: ${ctx.user.id})\n`;
                    text += `Total Bans  : ${bans.size}\n`;
                    text += `====================================================\n\n`;

                    let index = 1;
                    for (const [id, ban] of bans) {
                        text += `[${index}] USER: ${ban.user.tag} (ID: ${ban.user.id})\n`;
                        text += `    Account Created : ${ban.user.createdAt ? ban.user.createdAt.toUTCString() : 'Unknown'}\n`;
                        text += `    Ban Reason      : ${ban.reason || 'No reason specified'}\n`;
                        text += `----------------------------------------------------\n`;
                        index++;
                    }
                    fileBuffer = Buffer.from(text, 'utf-8');
                    fileName = `${ctx.guild.name.replace(/[^a-zA-Z0-9]/g, '_')}_bans_audit.txt`;
                }

                const attachment = new AttachmentBuilder(fileBuffer, { name: fileName });
                const embed = new EmbedBuilder()
                    .setColor(config.EMBED_COLORS.SUCCESS)
                    .setTitle(`📁 Server Ban Audit File: ${ctx.guild.name}`)
                    .setDescription(
                        `✅ Successfully compiled and exported **${bans.size}** ban record(s)!\n\n` +
                        `• **Server:** \`${ctx.guild.name}\` (\`${ctx.guild.id}\`)\n` +
                        `• **Total Banned Users:** \`${bans.size}\`\n` +
                        `• **File Format:** \`${format.toUpperCase()}\`\n` +
                        `• **File Name:** \`${fileName}\`\n\n` +
                        `*The audit file is attached below for download and backup archival.*`
                    )
                    .setFooter({ text: 'Starry Moderation Security Protocol' })
                    .setTimestamp();

                return ctx.reply({ embeds: [embed], files: [attachment] });
            } catch (err) {
                console.error('Ban Export Error:', err);
                return ctx.reply(`❌ Failed to fetch and generate ban audit file: \`${err.message}\``);
            }
        }
    },

    // 34. PREBAN / IMPORTBANS / MASSBAN
    {
        name: 'preban',
        aliases: ['importbans', 'massban', 'importbanfile', 'autobanfile'],
        category: 'Moderation',
        description: 'Auto pre-ban user IDs or import bans directly from an attached ban file (.json/.txt).',
        usage: ',preban [attach file | user IDs...] [reason]',
        permissions: [PermissionFlagsBits.BanMembers],
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.BanMembers) && !config.BOT_OWNERS.includes(ctx.user.id) && ctx.user.id !== ctx.guild.ownerId) {
                return ctx.reply('❌ Permission denied. You must have **Ban Members** permission to execute pre-bans.');
            }

            const botMember = ctx.guild.members.me;
            if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
                return ctx.reply('❌ I need **Ban Members** permission to execute bans in this server.');
            }

            await ctx.defer(false);

            let idsToBan = [];
            let reason = 'Auto Pre-Ban via Ban File | By ' + ctx.user.tag;

            // 1. Check for Attached File (direct or replied message)
            let attachment = ctx.message?.attachments?.first();
            if (!attachment && ctx.message?.reference?.messageId) {
                try {
                    const repliedMsg = await ctx.channel.messages.fetch(ctx.message.reference.messageId);
                    if (repliedMsg?.attachments?.size > 0) {
                        attachment = repliedMsg.attachments.first();
                    }
                } catch (e) {}
            }

            if (attachment) {
                try {
                    const response = await fetch(attachment.url);
                    const fileText = await response.text();

                    // Check if JSON
                    try {
                        const parsed = JSON.parse(fileText);
                        const extractIds = (obj) => {
                            if (!obj) return;
                            if (typeof obj === 'string' && /^\d{17,20}$/.test(obj)) {
                                idsToBan.push(obj);
                            } else if (Array.isArray(obj)) {
                                obj.forEach(item => extractIds(item));
                            } else if (typeof obj === 'object') {
                                if (obj.userId || obj.user_id || obj.id) {
                                    const possibleId = obj.userId || obj.user_id || obj.id;
                                    if (typeof possibleId === 'string' && /^\d{17,20}$/.test(possibleId)) idsToBan.push(possibleId);
                                }
                                if (obj.user && (obj.user.id || obj.user.userId)) {
                                    const uId = obj.user.id || obj.user.userId;
                                    if (typeof uId === 'string' && /^\d{17,20}$/.test(uId)) idsToBan.push(uId);
                                }
                                Object.values(obj).forEach(val => {
                                    if (typeof val === 'object' && val !== null) extractIds(val);
                                });
                            }
                        };
                        extractIds(parsed);
                    } catch (e) {}
                    
                    if (idsToBan.length === 0) {
                        // Extract all snowflake IDs matching 17-20 digits
                        const foundIds = fileText.match(/\b\d{17,20}\b/g);
                        if (foundIds) idsToBan = [...new Set(foundIds)];
                    }
                } catch (err) {
                    return ctx.reply(`❌ Failed to read attached ban file: \`${err.message}\``);
                }
            }

            // 2. Check if a URL was provided in args
            if (idsToBan.length === 0 && ctx.args.length > 0) {
                const possibleUrl = ctx.args.find(a => a.startsWith('http://') || a.startsWith('https://'));
                if (possibleUrl) {
                    try {
                        const res = await fetch(possibleUrl);
                        const urlText = await res.text();
                        const foundIds = urlText.match(/\b\d{17,20}\b/g);
                        if (foundIds) idsToBan = [...new Set(foundIds)];
                    } catch (e) {}
                }
            }

            // 3. If still no IDs, extract directly from arguments
            if (idsToBan.length === 0 && ctx.args.length > 0) {
                const argIds = [];
                const reasonParts = [];
                ctx.args.forEach(arg => {
                    const clean = arg.replace(/[<@!>]/g, '');
                    if (/^\d{17,20}$/.test(clean)) {
                        argIds.push(clean);
                    } else {
                        reasonParts.push(arg);
                    }
                });
                if (argIds.length > 0) idsToBan = [...new Set(argIds)];
                if (reasonParts.length > 0) reason = reasonParts.join(' ');
            }

            if (idsToBan.length === 0) {
                return ctx.reply(
                    '❌ **No valid User IDs or Ban File detected!**\n\n' +
                    '**How to use:**\n' +
                    '• **Option A (File Upload):** Attach a `.json` or `.txt` ban file (e.g. from `,banfile`) and type `,preban [reason]`\n' +
                    '• **Option B (Direct IDs):** Type `,preban <id1> <id2> <id3>... [reason]`'
                );
            }

            // Filter out protected IDs (Bot Owners, Guild Owner, Bot Self)
            const protectedIds = new Set([
                ctx.guild.ownerId,
                ctx.client.user.id,
                ...config.BOT_OWNERS
            ]);
            idsToBan = idsToBan.filter(id => !protectedIds.has(id));

            if (idsToBan.length === 0) {
                return ctx.reply('⚠️ All provided IDs belong to protected users (Server Owner / Bot Developers) and cannot be banned.');
            }

            const initialMsg = await ctx.reply(`⏳ **Processing Auto Pre-Ban on \`${idsToBan.length}\` user(s)...** Initializing rate-limit protected queue.`);

            // Pre-fetch existing bans to avoid redundant requests
            const existingBansSet = new Set();
            try {
                const existingBans = await ctx.guild.bans.fetch({ cache: false }).catch(() => null);
                if (existingBans) {
                    existingBans.forEach(b => existingBansSet.add(b.user.id));
                }
            } catch (e) {}

            let successful = 0;
            let alreadyBanned = 0;
            let failed = 0;
            const failureLogs = [];

            const total = idsToBan.length;
            let lastUpdate = Date.now();

            for (let i = 0; i < total; i++) {
                const targetId = idsToBan[i];

                // Check if already banned
                if (existingBansSet.has(targetId)) {
                    alreadyBanned++;
                    continue;
                }

                let attempts = 0;
                let banned = false;

                while (attempts < 3 && !banned) {
                    attempts++;
                    try {
                        await ctx.guild.bans.create(targetId, { reason });
                        successful++;
                        banned = true;
                        existingBansSet.add(targetId);
                    } catch (banErr) {
                        const errMsg = banErr.message || '';
                        // 1. Rate Limit Handling (HTTP 429) -> Auto-retry with backoff
                        if (banErr.status === 429 || errMsg.includes('rate') || banErr.code === 429) {
                            const retrySec = (banErr.retryAfter || 2.5);
                            await new Promise(r => setTimeout(r, (retrySec * 1000) + 300));
                            continue; // Retry this same user
                        }

                        // 2. Already Banned in Discord
                        if (banErr.code === 10007 || errMsg.includes('already') || errMsg.includes('Already')) {
                            alreadyBanned++;
                            banned = true;
                            break;
                        }

                        // 3. Unknown User / Deleted Account / Invalid ID
                        if (banErr.code === 10013 || errMsg.includes('Unknown User')) {
                            failed++;
                            failureLogs.push(`User ID ${targetId}: Unknown/Deleted Account or Invalid Snowflake`);
                            banned = true;
                            break;
                        }

                        // 4. Missing Permissions / Role Hierarchy
                        if (banErr.code === 50013 || errMsg.includes('Missing Permissions')) {
                            failed++;
                            failureLogs.push(`User ID ${targetId}: Missing Permissions (User has higher role than Bot)`);
                            banned = true;
                            break;
                        }

                        // Other error
                        if (attempts >= 3) {
                            failed++;
                            failureLogs.push(`User ID ${targetId}: ${errMsg}`);
                        } else {
                            await new Promise(r => setTimeout(r, 600));
                        }
                    }
                }

                // Throttle 200ms between ban requests to respect Discord rate limits
                await new Promise(r => setTimeout(r, 200));

                // Live progress updates every 5 seconds
                if (Date.now() - lastUpdate > 5000 && (i + 1) < total) {
                    lastUpdate = Date.now();
                    const percent = Math.floor(((i + 1) / total) * 100);
                    const progressEmbed = new EmbedBuilder()
                        .setColor(config.EMBED_COLORS.PRIMARY)
                        .setTitle('⏳ Auto Pre-Ban In Progress...')
                        .setDescription(
                            `Processing ban list: **${i + 1}/${total}** (${percent}%)\n\n` +
                            `• **✅ Successful:** \`${successful}\`\n` +
                            `• **🔁 Already Banned:** \`${alreadyBanned}\`\n` +
                            `• **❌ Failed / Invalid:** \`${failed}\``
                        )
                        .setFooter({ text: 'Starry Auto Pre-Ban Security Engine' });
                    
                    if (initialMsg && typeof initialMsg.edit === 'function') {
                        await initialMsg.edit({ embeds: [progressEmbed] }).catch(() => {});
                    }
                }
            }

            const resultEmbed = new EmbedBuilder()
                .setColor(successful > 0 ? config.EMBED_COLORS.SUCCESS : config.EMBED_COLORS.WARNING)
                .setTitle('🔨 Auto Pre-Ban File Execution Report')
                .setDescription(
                    `The automated ban importer has finished processing the ban list!\n\n` +
                    `• **Total Target IDs:** \`${total}\`\n` +
                    `• **✅ Successfully Banned:** \`${successful}\`\n` +
                    `• **🔁 Already Banned / Skipped:** \`${alreadyBanned}\`\n` +
                    `• **❌ Failed / Invalid IDs:** \`${failed}\`\n\n` +
                    `**Reason:** \`${reason}\``
                )
                .setFooter({ text: 'Starry Auto Pre-Ban Security Engine' })
                .setTimestamp();

            const files = [];
            if (failureLogs.length > 0) {
                const logContent = `Auto Pre-Ban Failure Log\nTotal Failed: ${failureLogs.length}\n\n` + failureLogs.join('\n');
                files.push(new AttachmentBuilder(Buffer.from(logContent, 'utf-8'), { name: 'failed_bans_log.txt' }));
            }

            if (initialMsg && typeof initialMsg.edit === 'function') {
                return initialMsg.edit({ content: '', embeds: [resultEmbed], files }).catch(() => {
                    return ctx.reply({ embeds: [resultEmbed], files });
                });
            } else {
                return ctx.reply({ embeds: [resultEmbed], files });
            }
        }
    },

    // 35. MODSTATS / STAFFSTATS
    {
        name: 'modstats',
        aliases: ['staffstats', 'modinfo', 'mystats', 'staffinfo'],
        category: 'Moderation',
        description: 'View moderation cases, punishment breakdown, 10-tier rank, and auto-assigned staff roles.',
        usage: ',modstats [@moderator / UserID]',
        async execute(ctx) {
            let targetUser = ctx.user;
            if (ctx.message?.mentions?.users?.size > 0) {
                targetUser = ctx.message.mentions.users.first();
            } else if (ctx.args[0]) {
                const cleanId = ctx.args[0].replace(/[^0-9]/g, '');
                if (cleanId) {
                    targetUser = await ctx.client.users.fetch(cleanId).catch(() => ctx.user);
                }
            }

            const targetMember = await ctx.guild.members.fetch(targetUser.id).catch(() => null);
            const cases = await ModCase.find({ guildId: ctx.guild.id, moderatorId: targetUser.id }).sort({ createdAt: -1 });

            // Fetch live server bans to ensure pre-bans / mass-bans are credited
            const serverBans = await ctx.guild.bans.fetch().catch(() => null);
            const isOwnerOrDev = (targetUser.id === ctx.guild.ownerId) || config.BOT_OWNERS.includes(targetUser.id);
            
            let loggedBans = cases.filter(c => c.action === 'BAN' || c.action === 'PREBAN').length;
            // If user is owner/dev or executed pre-bans, credit all server bans
            if (isOwnerOrDev && serverBans && serverBans.size > loggedBans) {
                loggedBans = serverBans.size;
            }

            const kicks = cases.filter(c => c.action === 'KICK').length;
            const mutes = cases.filter(c => c.action === 'TIMEOUT' || c.action === 'MUTE').length;
            const warns = cases.filter(c => c.action === 'WARN').length;
            const unbans = cases.filter(c => c.action === 'UNBAN').length;
            const total = loggedBans + kicks + mutes + warns + unbans;

            const STAFF_RANKS = [
                { tier: 10, minCases: 1000, title: '👑 Supreme Sovereign Inquisitor', roleName: '👑 Supreme Inquisitor', color: '#FFD700' },
                { tier: 9,  minCases: 750,  title: '💎 Mythic Sentinel of Order',     roleName: '💎 Mythic Sentinel',   color: '#00F0FF' },
                { tier: 8,  minCases: 500,  title: '🔱 Grand Lord Overseer',          roleName: '🔱 Grand Overseer',    color: '#9B59B6' },
                { tier: 7,  minCases: 250,  title: '⚡ Arch-Warden of Justice',        roleName: '⚡ Arch-Warden',       color: '#3498DB' },
                { tier: 6,  minCases: 100,  title: '🏆 Master Inquisitor',            roleName: '🏆 Master Inquisitor', color: '#E67E22' },
                { tier: 5,  minCases: 50,   title: '🛡️ Master Enforcer',              roleName: '🛡️ Master Enforcer',   color: '#2ECC71' },
                { tier: 4,  minCases: 25,   title: '⚖️ Senior Moderator',             roleName: '⚖️ Senior Moderator',  color: '#1ABC9C' },
                { tier: 3,  minCases: 10,   title: '⚔️ Active Moderator',             roleName: '⚔️ Active Moderator',  color: '#5865F2' },
                { tier: 2,  minCases: 3,    title: '🔰 Junior Moderator',             roleName: '🔰 Junior Moderator',  color: '#95A5A6' },
                { tier: 1,  minCases: 1,    title: '🌱 Trial Staff',                  roleName: '🌱 Trial Staff',       color: '#7F8C8D' }
            ];

            let userRank = { tier: 0, title: '🌱 New Staff Member', roleName: null };
            for (const r of STAFF_RANKS) {
                if (total >= r.minCases) {
                    userRank = r;
                    break;
                }
            }

            // Automatic Discord Role Creation & Assignment
            let roleStatusText = '';
            if (targetMember && userRank.roleName && ctx.guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
                try {
                    let rankRole = ctx.guild.roles.cache.find(r => r.name === userRank.roleName);
                    if (!rankRole) {
                        rankRole = await ctx.guild.roles.create({
                            name: userRank.roleName,
                            color: userRank.color,
                            reason: `Auto Staff Rank Role for ${userRank.title}`
                        });
                    }
                    if (rankRole && !targetMember.roles.cache.has(rankRole.id)) {
                        await targetMember.roles.add(rankRole);
                        roleStatusText = `\n🎁 **Auto-Awarded Role:** <@&${rankRole.id}>`;
                    } else if (rankRole && targetMember.roles.cache.has(rankRole.id)) {
                        roleStatusText = `\n✅ **Active Staff Role:** <@&${rankRole.id}>`;
                    }
                } catch (roleErr) {
                    console.warn('Auto-role assignment warning:', roleErr.message);
                }
            }

            const recentCases = cases.slice(0, 3).map(c => {
                return `• **Case #${c.caseId}** [${c.action}] <t:${Math.floor(new Date(c.createdAt).getTime() / 1000)}:R>\n  Target: \`${c.targetTag}\` | Reason: *${c.reason.substring(0, 40)}*`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor(userRank.color || config.EMBED_COLORS.PRIMARY)
                .setTitle(`📊 Staff Moderation Stats: ${targetUser.tag}`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setDescription(
                    `**Staff Rank:** \`${userRank.title}\` (Tier ${userRank.tier || 0})${roleStatusText}\n` +
                    `*Keep moderating to unlock higher tiers and automatic server badges!*`
                )
                .addFields(
                    { name: '📈 Total Actions', value: `\`${total}\` actions`, inline: true },
                    { name: '🔨 Bans Credited', value: `\`${loggedBans}\``, inline: true },
                    { name: '🚪 Kicks Issued', value: `\`${kicks}\``, inline: true },
                    { name: '🔇 Mutes / Timeouts', value: `\`${mutes}\``, inline: true },
                    { name: '⚠️ Warnings Issued', value: `\`${warns}\``, inline: true },
                    { name: '🔓 Unbans Issued', value: `\`${unbans}\``, inline: true },
                    { name: '🕒 Recent Activity', value: recentCases || `• *Total Server Bans: ${loggedBans} recorded*`, inline: false }
                )
                .setFooter({ text: 'Starry Supreme Staff Rank & Auto-Role Engine • Prefix: ,' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 36. MODSYNC (Sync All Server Bans into ModCase)
    {
        name: 'modsync',
        aliases: ['syncbans', 'syncmodcases'],
        category: 'Moderation',
        description: 'Synchronize all existing server bans directly into the moderation case database.',
        usage: ',modsync',
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.BanMembers) && !config.BOT_OWNERS.includes(ctx.user.id) && ctx.user.id !== ctx.guild.ownerId) {
                return ctx.reply('❌ You need **Ban Members** permission to sync moderation records.');
            }

            await ctx.defer(false);

            try {
                const bans = await ctx.guild.bans.fetch();
                if (!bans || bans.size === 0) {
                    return ctx.reply('ℹ️ No bans currently exist in this server to synchronize.');
                }

                const existingCases = await ModCase.find({ guildId: ctx.guild.id });
                const existingBannedIds = new Set(existingCases.map(c => c.targetId));

                const lastCase = await ModCase.findOne({ guildId: ctx.guild.id }).sort({ caseId: -1 });
                let nextCaseId = lastCase ? lastCase.caseId + 1 : 1;

                const toInsert = [];
                for (const [id, ban] of bans) {
                    if (!existingBannedIds.has(id)) {
                        toInsert.push({
                            guildId: ctx.guild.id,
                            caseId: nextCaseId++,
                            action: 'PREBAN',
                            targetId: id,
                            targetTag: `${ban.user.tag || ban.user.username} (${id})`,
                            moderatorId: ctx.user.id,
                            moderatorTag: ctx.user.tag,
                            reason: ban.reason || 'Server Pre-Ban Sync',
                            createdAt: new Date()
                        });
                    }
                }

                if (toInsert.length > 0) {
                    await ModCase.insertMany(toInsert, { ordered: false }).catch(() => {});
                }

                const embed = new EmbedBuilder()
                    .setColor(config.EMBED_COLORS.SUCCESS)
                    .setTitle('🔄 Moderation Database Synchronized')
                    .setDescription(
                        `✅ Successfully synced **${bans.size}** total server bans!\n\n` +
                        `• **New Cases Logged:** \`${toInsert.length}\`\n` +
                        `• **Moderator Credited:** <@${ctx.user.id}>\n` +
                        `• **Total Server Bans:** \`${bans.size}\`\n\n` +
                        `*Use \`,modstats\` to view your upgraded Staff Rank & auto-assigned roles!*`
                    )
                    .setFooter({ text: 'Starry Case Sync Engine' })
                    .setTimestamp();

                return ctx.reply({ embeds: [embed] });
            } catch (err) {
                console.error('ModSync Error:', err);
                return ctx.reply(`❌ Failed to sync bans: \`${err.message}\``);
            }
        }
    },

    // 37. MODCASES / CASES
    {
        name: 'modcases',
        aliases: ['cases', 'modlogs', 'casehistory'],
        category: 'Moderation',
        description: 'List recent moderation cases in the server or filter by @moderator or @user.',
        usage: ',modcases [@user | @moderator]',
        async execute(ctx) {
            const query = { guildId: ctx.guild.id };

            if (ctx.message?.mentions?.users?.size > 0) {
                const target = ctx.message.mentions.users.first();
                query.$or = [{ moderatorId: target.id }, { targetId: target.id }];
            } else if (ctx.args[0]) {
                const cleanId = ctx.args[0].replace(/[^0-9]/g, '');
                if (cleanId) {
                    query.$or = [{ moderatorId: cleanId }, { targetId: cleanId }];
                }
            }

            const cases = await ModCase.find(query).sort({ createdAt: -1 }).limit(10);
            if (!cases || cases.length === 0) {
                return ctx.reply('ℹ️ No moderation cases found in database. Run `,modsync` to import all existing bans!');
            }

            const caseList = cases.map(c => {
                return `**Case #${c.caseId}** • \`[${c.action}]\` • <t:${Math.floor(new Date(c.createdAt).getTime() / 1000)}:R>\n` +
                       `👤 **Target:** ${c.targetTag} (\`${c.targetId}\`)\n` +
                       `🛡️ **Mod:** ${c.moderatorTag} (\`${c.moderatorId}\`)\n` +
                       `📝 **Reason:** *${c.reason}*\n`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle(`📋 Moderation Cases: ${ctx.guild.name}`)
                .setDescription(caseList)
                .setFooter({ text: 'Use ,case <id> to view a single case • Starry Case Engine' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 38. MODLEADERBOARD / TOPMODS
    {
        name: 'modleaderboard',
        aliases: ['modlb', 'stafflb', 'topmods'],
        category: 'Moderation',
        description: 'Display the server staff moderation leaderboard sorted by total cases.',
        usage: ',modleaderboard',
        async execute(ctx) {
            const agg = await ModCase.aggregate([
                { $match: { guildId: ctx.guild.id } },
                { $group: { _id: '$moderatorId', count: { $sum: 1 }, name: { $first: '$moderatorTag' } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);

            if (!agg || agg.length === 0) {
                return ctx.reply('ℹ️ No staff moderation activity recorded in database yet. Run `,modsync` to sync server bans!');
            }

            const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
            const description = agg.map((entry, index) => {
                const medal = medals[index] || '🔹';
                return `${medal} **<@${entry._id}>** — \`${entry.count}\` Actions (*${entry.name}*)`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle(`🏆 Staff Moderation Leaderboard • ${ctx.guild.name}`)
                .setDescription(description)
                .setFooter({ text: 'Starry Staff Analytics Suite' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 39. CASE (View Single Case)
    {
        name: 'case',
        aliases: ['viewcase'],
        category: 'Moderation',
        description: 'View specific details for a moderation case number.',
        usage: ',case <caseNumber>',
        async execute(ctx) {
            const caseNum = parseInt(ctx.args[0], 10);
            if (!caseNum) return ctx.reply('❌ Please specify a valid Case number: `,case 12`');

            const c = await ModCase.findOne({ guildId: ctx.guild.id, caseId: caseNum });
            if (!c) return ctx.reply(`❌ Case **#${caseNum}** was not found in this server.`);

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle(`🛡️ Case #${c.caseId} • [${c.action}]`)
                .addFields(
                    { name: '👤 Target User', value: `${c.targetTag} (\`${c.targetId}\`)`, inline: true },
                    { name: '🛡️ Moderator', value: `${c.moderatorTag} (\`${c.moderatorId}\`)`, inline: true },
                    { name: '🕒 Date Logged', value: `<t:${Math.floor(new Date(c.createdAt).getTime() / 1000)}:F>`, inline: true },
                    { name: '📝 Reason', value: `>>> ${c.reason}`, inline: false }
                )
                .setFooter({ text: 'To update reason: ,editcase <id> <newReason>' })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 40. EDITCASE (Update Case Reason)
    {
        name: 'editcase',
        aliases: ['reason', 'updatecase'],
        category: 'Moderation',
        description: 'Update the reason for an existing moderation case.',
        usage: ',editcase <caseNumber> <new reason>',
        async execute(ctx) {
            if (!ctx.member.permissions.has(PermissionFlagsBits.BanMembers) && !config.BOT_OWNERS.includes(ctx.user.id) && ctx.user.id !== ctx.guild.ownerId) {
                return ctx.reply('❌ You need **Ban Members** permission to edit moderation cases.');
            }

            const caseNum = parseInt(ctx.args[0], 10);
            const newReason = ctx.args.slice(1).join(' ');

            if (!caseNum || !newReason) {
                return ctx.reply('❌ Usage: `,editcase <caseNumber> <new reason>`');
            }

            const c = await ModCase.findOneAndUpdate(
                { guildId: ctx.guild.id, caseId: caseNum },
                { reason: `${newReason} (Edited by ${ctx.user.tag})` },
                { new: true }
            );

            if (!c) return ctx.reply(`❌ Case **#${caseNum}** was not found.`);

            return ctx.reply(`✅ **Case #${caseNum} updated successfully!**\nNew Reason: *${c.reason}*`);
        }
    },

    // 41. AUTOMOD (Channel & Server AutoMod Pro Configuration)
    {
        name: 'automod',
        aliases: ['am', 'automoderation'],
        category: 'Moderation',
        description: 'Configure and toggle AutoMod protection for specific channels (links, emojis, status).',
        usage: ',automod <enable|disable|status|list|reset> [links|emojis|all] [#channel]',
        permissions: [PermissionFlagsBits.Administrator],
        async execute(ctx) {
            if (!ctx.inGuild) return ctx.reply('❌ This command can only be used in a Discord server.');
            if (!automodHelper.canManageAutomod(ctx.member, ctx.user, ctx.guild)) {
                return ctx.reply('❌ You need **Administrator** or **Manage Server** permissions to configure AutoMod settings.');
            }

            const prefix = ctx.client?.prefix || ',';
            const args = ctx.args || [];

            // Case A: No arguments -> Show live status and interactive buttons for current channel
            if (args.length === 0) {
                const settings = await automodHelper.getChannelSettings(ctx.channel.id, ctx.guild.id);
                const isGuildEnabled = automodHelper.getGuildStatus(ctx.guild.id);
                const embed = automodHelper.buildChannelAutomodEmbed(ctx.guild, ctx.channel, settings, isGuildEnabled);
                const buttons = automodHelper.createChannelAutomodButtons(ctx.channel.id, settings);

                return ctx.reply({
                    embeds: [embed],
                    components: [buttons]
                });
            }

            const firstArg = args[0].toLowerCase();

            // Case B: List all channel overrides in the server
            if (firstArg === 'list' || firstArg === 'channels') {
                const overrides = await automodHelper.listGuildOverrides(ctx.guild.id);
                if (overrides.length === 0) {
                    return ctx.reply('ℹ️ **No channel overrides configured.** All channels are currently protected by standard server-wide AutoMod.');
                }

                const listText = overrides.map(o => {
                    const linksStatus = o.links ? '🔴 Links Allowed' : '🟢 Links Blocked';
                    const emojisStatus = o.emojis ? '🔴 Emojis Allowed' : '🟢 Emojis Blocked';
                    return `• <#${o.channelId}> — ${linksStatus} | ${emojisStatus}`;
                }).join('\n');

                const embed = new EmbedBuilder()
                    .setColor(config.EMBED_COLORS?.PRIMARY || '#5865F2')
                    .setTitle(`🛡️ AutoMod Channel Overrides (${overrides.length})`)
                    .setDescription(listText)
                    .setFooter({ text: `Use ${prefix}automod reset #channel to restore default protection` })
                    .setTimestamp();

                return ctx.reply({ embeds: [embed] });
            }

            // Case C: Reset channel overrides
            if (firstArg === 'reset' || firstArg === 'clear') {
                const targetChannel = await automodHelper.resolveChannel(ctx, args.slice(1));
                const updated = await automodHelper.resetChannelSettings(targetChannel.id, ctx.guild.id);
                const isGuildEnabled = automodHelper.getGuildStatus(ctx.guild.id);
                const embed = automodHelper.buildChannelAutomodEmbed(ctx.guild, targetChannel, updated, isGuildEnabled);
                const buttons = automodHelper.createChannelAutomodButtons(targetChannel.id, updated);

                return ctx.reply({
                    content: `✅ Reset AutoMod settings for <#${targetChannel.id}> to **Full Active Protection** (Links & Emojis blocked).`,
                    embeds: [embed],
                    components: [buttons]
                });
            }

            // Case D: Server-wide toggle (,automod toggle enable / disable)
            if (firstArg === 'toggle') {
                const targetStateStr = args[1]?.toLowerCase();
                const shouldEnable = targetStateStr === 'enable' || targetStateStr === 'on' || targetStateStr === 'true';
                await automodHelper.setGuildStatus(ctx.guild.id, shouldEnable);
                return ctx.reply(`${shouldEnable ? '✅' : '🚫'} Server-wide AutoMod is now **${shouldEnable ? 'ENABLED' : 'DISABLED'}**.`);
            }

            // Case E: General Action & Filter Parser
            let action = null;
            let filter = null;

            for (const a of args) {
                const lower = a.toLowerCase();
                if (['enable', 'on', 'activate', 'allowblock', 'true'].includes(lower)) action = 'enable';
                else if (['disable', 'off', 'deactivate', 'ignore', 'false'].includes(lower)) action = 'disable';
                else if (['status', 'info', 'check', 'view'].includes(lower)) action = 'status';
                
                if (['links', 'link', 'url', 'urls'].includes(lower)) filter = 'links';
                else if (['emojis', 'emoji', 'emote', 'emotes'].includes(lower)) filter = 'emojis';
                else if (['all', 'both', 'everything'].includes(lower)) filter = 'all';
            }

            const targetChannel = await automodHelper.resolveChannel(ctx, args);
            action = action || 'status';
            filter = filter || 'all';

            if (action === 'status') {
                const settings = await automodHelper.getChannelSettings(targetChannel.id, ctx.guild.id);
                const isGuildEnabled = automodHelper.getGuildStatus(ctx.guild.id);
                const embed = automodHelper.buildChannelAutomodEmbed(ctx.guild, targetChannel, settings, isGuildEnabled);
                const buttons = automodHelper.createChannelAutomodButtons(targetChannel.id, settings);

                return ctx.reply({
                    embeds: [embed],
                    components: [buttons]
                });
            }

            const shouldEnable = action === 'enable';
            const updated = await automodHelper.setChannelFilter(targetChannel.id, ctx.guild.id, filter, shouldEnable);
            const isGuildEnabled = automodHelper.getGuildStatus(ctx.guild.id);
            const embed = automodHelper.buildChannelAutomodEmbed(ctx.guild, targetChannel, updated, isGuildEnabled);
            const buttons = automodHelper.createChannelAutomodButtons(targetChannel.id, updated);

            const filterName = filter === 'all' ? 'All filters (links & emojis)' : `Filter **${filter}**`;
            return ctx.reply({
                content: `${shouldEnable ? '✅' : '🚫'} ${filterName} is now **${shouldEnable ? 'ENABLED (Protected)' : 'DISABLED (Ignored)'}** in <#${targetChannel.id}>.`,
                embeds: [embed],
                components: [buttons]
            });
        }
    },

    // 42. ANTILINK (Quick Channel Link Filter)
    {
        name: 'antilink',
        aliases: ['anti-link', 'blocklinks', 'linkmod'],
        category: 'Moderation',
        description: 'Enable or disable AutoMod link filtering for a specific channel.',
        usage: ',antilink <enable|disable|status> [#channel]',
        permissions: [PermissionFlagsBits.Administrator],
        async execute(ctx) {
            if (!ctx.inGuild) return ctx.reply('❌ This command can only be used in a Discord server.');
            if (!automodHelper.canManageAutomod(ctx.member, ctx.user, ctx.guild)) {
                return ctx.reply('❌ You need **Administrator** or **Manage Server** permissions to configure AutoMod settings.');
            }

            const targetChannel = await automodHelper.resolveChannel(ctx, ctx.args);
            const rawArgs = (ctx.args || []).map(a => a.toLowerCase());

            let shouldEnable = null;
            if (rawArgs.some(a => ['enable', 'on', 'activate', '1', 'true'].includes(a))) shouldEnable = true;
            else if (rawArgs.some(a => ['disable', 'off', 'deactivate', '0', 'false'].includes(a))) shouldEnable = false;

            if (shouldEnable === null) {
                const settings = await automodHelper.getChannelSettings(targetChannel.id, ctx.guild.id);
                const isGuildEnabled = automodHelper.getGuildStatus(ctx.guild.id);
                const embed = automodHelper.buildChannelAutomodEmbed(ctx.guild, targetChannel, settings, isGuildEnabled);
                const buttons = automodHelper.createChannelAutomodButtons(targetChannel.id, settings);

                return ctx.reply({ embeds: [embed], components: [buttons] });
            }

            const updated = await automodHelper.setChannelFilter(targetChannel.id, ctx.guild.id, 'links', shouldEnable);
            const isGuildEnabled = automodHelper.getGuildStatus(ctx.guild.id);
            const embed = automodHelper.buildChannelAutomodEmbed(ctx.guild, targetChannel, updated, isGuildEnabled);
            const buttons = automodHelper.createChannelAutomodButtons(targetChannel.id, updated);

            return ctx.reply({
                content: `${shouldEnable ? '✅' : '🚫'} Link protection is now **${shouldEnable ? 'ENABLED (Links Blocked)' : 'DISABLED (Links Allowed)'}** in <#${targetChannel.id}>.`,
                embeds: [embed],
                components: [buttons]
            });
        }
    },

    // 43. ANTIEMOJI (Quick Channel Emoji Filter)
    {
        name: 'antiemoji',
        aliases: ['anti-emoji', 'blockemojis', 'emojimod'],
        category: 'Moderation',
        description: 'Enable or disable AutoMod emoji spam filtering for a specific channel.',
        usage: ',antiemoji <enable|disable|status> [#channel]',
        permissions: [PermissionFlagsBits.Administrator],
        async execute(ctx) {
            if (!ctx.inGuild) return ctx.reply('❌ This command can only be used in a Discord server.');
            if (!automodHelper.canManageAutomod(ctx.member, ctx.user, ctx.guild)) {
                return ctx.reply('❌ You need **Administrator** or **Manage Server** permissions to configure AutoMod settings.');
            }

            const targetChannel = await automodHelper.resolveChannel(ctx, ctx.args);
            const rawArgs = (ctx.args || []).map(a => a.toLowerCase());

            let shouldEnable = null;
            if (rawArgs.some(a => ['enable', 'on', 'activate', '1', 'true'].includes(a))) shouldEnable = true;
            else if (rawArgs.some(a => ['disable', 'off', 'deactivate', '0', 'false'].includes(a))) shouldEnable = false;

            if (shouldEnable === null) {
                const settings = await automodHelper.getChannelSettings(targetChannel.id, ctx.guild.id);
                const isGuildEnabled = automodHelper.getGuildStatus(ctx.guild.id);
                const embed = automodHelper.buildChannelAutomodEmbed(ctx.guild, targetChannel, settings, isGuildEnabled);
                const buttons = automodHelper.createChannelAutomodButtons(targetChannel.id, settings);

                return ctx.reply({ embeds: [embed], components: [buttons] });
            }

            const updated = await automodHelper.setChannelFilter(targetChannel.id, ctx.guild.id, 'emojis', shouldEnable);
            const isGuildEnabled = automodHelper.getGuildStatus(ctx.guild.id);
            const embed = automodHelper.buildChannelAutomodEmbed(ctx.guild, targetChannel, updated, isGuildEnabled);
            const buttons = automodHelper.createChannelAutomodButtons(targetChannel.id, updated);

            return ctx.reply({
                content: `${shouldEnable ? '✅' : '🚫'} Emoji spam filter is now **${shouldEnable ? 'ENABLED (5+ Emojis Blocked)' : 'DISABLED (Emojis Allowed)'}** in <#${targetChannel.id}>.`,
                embeds: [embed],
                components: [buttons]
            });
        }
    },

    // 44. IGNORE (Exclude channel from automod links/emojis)
    {
        name: 'ignore',
        aliases: ['amignore', 'modignore'],
        category: 'Moderation',
        description: 'Ignore/allow links or emojis in a channel (disables AutoMod filter).',
        usage: ',ignore <links|emojis|all> [#channel]',
        permissions: [PermissionFlagsBits.Administrator],
        async execute(ctx) {
            if (!ctx.inGuild) return ctx.reply('❌ This command can only be used in a Discord server.');
            if (!automodHelper.canManageAutomod(ctx.member, ctx.user, ctx.guild)) {
                return ctx.reply('❌ You need **Administrator** or **Manage Server** permissions to configure AutoMod settings.');
            }

            const targetChannel = await automodHelper.resolveChannel(ctx, ctx.args);
            const rawArgs = (ctx.args || []).map(a => a.toLowerCase());

            let filter = 'all';
            if (rawArgs.some(a => ['links', 'link', 'url', 'urls'].includes(a))) filter = 'links';
            else if (rawArgs.some(a => ['emojis', 'emoji', 'emote', 'emotes'].includes(a))) filter = 'emojis';

            const updated = await automodHelper.setChannelFilter(targetChannel.id, ctx.guild.id, filter, false);
            const isGuildEnabled = automodHelper.getGuildStatus(ctx.guild.id);
            const embed = automodHelper.buildChannelAutomodEmbed(ctx.guild, targetChannel, updated, isGuildEnabled);
            const buttons = automodHelper.createChannelAutomodButtons(targetChannel.id, updated);

            const filterLabel = filter === 'all' ? 'All AutoMod filters' : `AutoMod **${filter}** filter`;
            return ctx.reply({
                content: `🚫 ${filterLabel} is now **DISABLED / IGNORED** in <#${targetChannel.id}>. Members can now send ${filter} freely.`,
                embeds: [embed],
                components: [buttons]
            });
        }
    },

    // 45. UNIGNORE (Re-enable channel automod links/emojis)
    {
        name: 'unignore',
        aliases: ['amunignore', 'modunignore'],
        category: 'Moderation',
        description: 'Unignore/block links or emojis in a channel (enables AutoMod filter).',
        usage: ',unignore <links|emojis|all> [#channel]',
        permissions: [PermissionFlagsBits.Administrator],
        async execute(ctx) {
            if (!ctx.inGuild) return ctx.reply('❌ This command can only be used in a Discord server.');
            if (!automodHelper.canManageAutomod(ctx.member, ctx.user, ctx.guild)) {
                return ctx.reply('❌ You need **Administrator** or **Manage Server** permissions to configure AutoMod settings.');
            }

            const targetChannel = await automodHelper.resolveChannel(ctx, ctx.args);
            const rawArgs = (ctx.args || []).map(a => a.toLowerCase());

            let filter = 'all';
            if (rawArgs.some(a => ['links', 'link', 'url', 'urls'].includes(a))) filter = 'links';
            else if (rawArgs.some(a => ['emojis', 'emoji', 'emote', 'emotes'].includes(a))) filter = 'emojis';

            const updated = await automodHelper.setChannelFilter(targetChannel.id, ctx.guild.id, filter, true);
            const isGuildEnabled = automodHelper.getGuildStatus(ctx.guild.id);
            const embed = automodHelper.buildChannelAutomodEmbed(ctx.guild, targetChannel, updated, isGuildEnabled);
            const buttons = automodHelper.createChannelAutomodButtons(targetChannel.id, updated);

            const filterLabel = filter === 'all' ? 'All AutoMod filters' : `AutoMod **${filter}** filter`;
            return ctx.reply({
                content: `✅ ${filterLabel} is now **ENABLED / ACTIVE** in <#${targetChannel.id}>. Unauthorized content will be blocked.`,
                embeds: [embed],
                components: [buttons]
            });
        }
    }
];

module.exports = commands;
