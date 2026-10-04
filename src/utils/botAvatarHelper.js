// ==========================================
// 🎨 STARRY SERVER BOT AVATAR HELPER
// File Path: src/utils/botAvatarHelper.js
// Custom Server Profile Picture (Guild Member Avatar) Engine
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    Routes,
    PermissionFlagsBits 
} = require('discord.js');
const config = require('../config');

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB Discord limit
const ALLOWED_MIME_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif'
]);

/**
 * Resolves an image URL or buffer into a Discord-compliant Base64 Data URI.
 * @param {string|Buffer} urlOrBuffer
 * @param {string} [contentTypeHint]
 * @returns {Promise<string>} data URI string (data:image/...;base64,...)
 */
async function resolveImageToDataUri(urlOrBuffer, contentTypeHint = null) {
    if (!urlOrBuffer) {
        throw new Error('No image was provided. Please provide an image URL or upload a file.');
    }

    // Already a data URI
    if (typeof urlOrBuffer === 'string' && urlOrBuffer.startsWith('data:')) {
        return urlOrBuffer;
    }

    let buffer;
    let mimeType = contentTypeHint;

    if (Buffer.isBuffer(urlOrBuffer)) {
        buffer = urlOrBuffer;
        if (!mimeType) mimeType = 'image/png';
    } else if (typeof urlOrBuffer === 'string') {
        const trimmed = urlOrBuffer.trim();
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
            throw new Error('Invalid image URL. The URL must start with http:// or https://');
        }

        const fetchFn = globalThis.fetch || require('node-fetch');
        const res = await fetchFn(trimmed, {
            headers: { 'User-Agent': 'ManagerBot-ServerProfile/2.0' },
            timeout: 10000
        });

        if (!res.ok) {
            throw new Error(`Failed to download image (HTTP ${res.status}: ${res.statusText || 'Error'})`);
        }

        const headerMime = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (headerMime && ALLOWED_MIME_TYPES.has(headerMime)) {
            mimeType = headerMime;
        } else if (!mimeType) {
            // Infer from file extension in URL
            const urlPath = trimmed.split('?')[0].toLowerCase();
            if (urlPath.endsWith('.png')) mimeType = 'image/png';
            else if (urlPath.endsWith('.jpg') || urlPath.endsWith('.jpeg')) mimeType = 'image/jpeg';
            else if (urlPath.endsWith('.webp')) mimeType = 'image/webp';
            else if (urlPath.endsWith('.gif')) mimeType = 'image/gif';
            else mimeType = 'image/png';
        }

        const arrayBuf = await res.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
    } else {
        throw new Error('Unsupported image format.');
    }

    if (buffer.length > MAX_IMAGE_BYTES) {
        throw new Error(`Image size (${(buffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds the 10MB Discord limit.`);
    }

    if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
        mimeType = 'image/png';
    }

    return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Extracts the image target or action from a command context.
 * Supports: direct attachment, URL argument, replied-to message attachment/embed, reset keywords.
 * @param {import('./contextHelper').CommandContext} ctx
 * @returns {Promise<{ imageUrl: string|null, isReset: boolean, isView: boolean }>}
 */
async function extractImageFromContext(ctx) {
    // 1. Slash command options
    if (ctx.isSlash && ctx.interaction) {
        const actionOpt = ctx.interaction.options?.getString('action');
        if (actionOpt === 'reset') return { imageUrl: null, isReset: true, isView: false };
        if (actionOpt === 'view') return { imageUrl: null, isReset: false, isView: true };

        const attachment = ctx.interaction.options?.getAttachment('image');
        if (attachment && attachment.url) {
            return { imageUrl: attachment.url, isReset: false, isView: false };
        }

        const urlOpt = ctx.interaction.options?.getString('url');
        if (urlOpt) {
            const cleanUrl = urlOpt.trim();
            if (['reset', 'default', 'remove', 'clear'].includes(cleanUrl.toLowerCase())) {
                return { imageUrl: null, isReset: true, isView: false };
            }
            return { imageUrl: cleanUrl, isReset: false, isView: false };
        }
    }

    // 2. Prefix command message attachments
    if (ctx.message && ctx.message.attachments && ctx.message.attachments.size > 0) {
        const att = ctx.message.attachments.first();
        if (att && att.url) {
            return { imageUrl: att.url, isReset: false, isView: false };
        }
    }

    // 3. Replied-to message inspection
    if (ctx.message && ctx.message.reference?.messageId) {
        try {
            const refMsg = await ctx.channel.messages.fetch(ctx.message.reference.messageId).catch(() => null);
            if (refMsg) {
                if (refMsg.attachments?.size > 0) {
                    const refAtt = refMsg.attachments.first();
                    if (refAtt && refAtt.url) return { imageUrl: refAtt.url, isReset: false, isView: false };
                }
                if (refMsg.embeds?.length > 0) {
                    const embedImg = refMsg.embeds[0].image?.url || refMsg.embeds[0].thumbnail?.url;
                    if (embedImg) return { imageUrl: embedImg, isReset: false, isView: false };
                }
            }
        } catch (_) {}
    }

    // 4. Arguments (URL or Keywords)
    const firstArg = ctx.args[0]?.trim();
    if (firstArg) {
        const lower = firstArg.toLowerCase();
        if (['reset', 'default', 'remove', 'clear', 'off'].includes(lower)) {
            return { imageUrl: null, isReset: true, isView: false };
        }
        if (['view', 'show', 'current', 'info'].includes(lower)) {
            return { imageUrl: null, isReset: false, isView: true };
        }
        if (firstArg.startsWith('http://') || firstArg.startsWith('https://')) {
            return { imageUrl: firstArg, isReset: false, isView: false };
        }
    }

    // No input provided -> default to view current profile
    return { imageUrl: null, isReset: false, isView: true };
}

/**
 * Updates the bot's guild-specific member avatar.
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').Client} client
 * @param {string|Buffer} imageResolvable
 * @param {string} reason
 * @returns {Promise<{ success: boolean, avatarUrl: string }>}
 */
async function updateBotServerAvatar(guild, client, imageResolvable, reason = 'Server avatar update') {
    const dataUri = await resolveImageToDataUri(imageResolvable);

    try {
        if (guild.members && typeof guild.members.editMe === 'function') {
            await guild.members.editMe({ avatar: dataUri, reason });
        } else {
            throw new Error('editMe not available on guild.members');
        }
    } catch (err) {
        // Direct REST API Fallback
        await client.rest.patch(Routes.guildMember(guild.id, '@me'), {
            body: { avatar: dataUri },
            reason
        });
    }

    // Persist to ServerSettings in MongoDB
    try {
        const ServerSettings = require('../models/ServerSettings');
        await ServerSettings.findOneAndUpdate(
            { guildId: guild.id },
            { botAvatar: typeof imageResolvable === 'string' ? imageResolvable : 'custom' },
            { upsert: true }
        );
    } catch (_) {}

    // Fetch refreshed member object to get the newly generated CDN avatar URL
    const me = await guild.members.fetchMe({ force: true }).catch(() => guild.members.me);
    const newAvatarUrl = me?.displayAvatarURL({ dynamic: true, size: 1024 }) || client.user?.displayAvatarURL({ dynamic: true, size: 1024 });

    return { success: true, avatarUrl: newAvatarUrl };
}

/**
 * Resets the bot's server avatar, restoring its global default profile picture.
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').Client} client
 * @param {string} reason
 * @returns {Promise<{ success: boolean, globalAvatarUrl: string }>}
 */
async function resetBotServerAvatar(guild, client, reason = 'Server avatar reset') {
    try {
        if (guild.members && typeof guild.members.editMe === 'function') {
            await guild.members.editMe({ avatar: null, reason });
        } else {
            throw new Error('editMe not available on guild.members');
        }
    } catch (err) {
        // Direct REST API Fallback
        await client.rest.patch(Routes.guildMember(guild.id, '@me'), {
            body: { avatar: null },
            reason
        });
    }

    // Clear from ServerSettings
    try {
        const ServerSettings = require('../models/ServerSettings');
        await ServerSettings.findOneAndUpdate(
            { guildId: guild.id },
            { botAvatar: '' },
            { upsert: true }
        );
    } catch (_) {}

    const me = await guild.members.fetchMe({ force: true }).catch(() => guild.members.me);
    const globalAvatarUrl = client.user?.displayAvatarURL({ dynamic: true, size: 1024 });

    return { success: true, globalAvatarUrl };
}

/**
 * Builds the Success Embed when an avatar is updated.
 */
function buildAvatarSuccessEmbed(guild, client, avatarUrl, user) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ 
            name: `${client.user?.username || 'Bot'} • Server Profile Customization`, 
            iconURL: client.user?.displayAvatarURL({ dynamic: true }) 
        })
        .setTitle('✨ Bot Server Avatar Updated!')
        .setDescription(
            `Successfully updated the bot's profile picture for **${guild.name}**!\n\n` +
            `👤 **Updated By:** <@${user.id}> (\`${user.tag || user.username}\`)\n` +
            `🌐 **Scope:** \`Per-Server Only\` (Does not affect other Discord servers)\n` +
            `🔄 **Reset Command:** Type \`,botavatar reset\` anytime to restore the default global avatar.`
        )
        .setImage(avatarUrl)
        .setFooter({ text: `Guild ID: ${guild.id} • Prefix: ,` })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Open in Browser')
            .setStyle(ButtonStyle.Link)
            .setURL(avatarUrl),
        new ButtonBuilder()
            .setCustomId('botavatar_btn_reset')
            .setLabel('Reset to Default')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row] };
}

/**
 * Builds the Reset Embed when an avatar is restored.
 */
function buildAvatarResetEmbed(guild, client, globalAvatarUrl, user) {
    const embed = new EmbedBuilder()
        .setColor('#2ECC71')
        .setAuthor({ 
            name: `${client.user?.username || 'Bot'} • Server Profile Customization`, 
            iconURL: globalAvatarUrl 
        })
        .setTitle('🔄 Bot Server Avatar Reset!')
        .setDescription(
            `The custom server avatar for **${guild.name}** has been removed.\n\n` +
            `👤 **Reset By:** <@${user.id}>\n` +
            `✨ The bot is now displaying its **original global profile picture** in this server.`
        )
        .setImage(globalAvatarUrl)
        .setFooter({ text: `Guild ID: ${guild.id} • Prefix: ,` })
        .setTimestamp();

    return { embeds: [embed], components: [] };
}

/**
 * Builds the View Embed showing current server avatar status.
 */
function buildCurrentAvatarEmbed(guild, client, user) {
    const me = guild.members.me;
    const hasServerAvatar = Boolean(me?.avatar);
    const currentAvatarUrl = me?.displayAvatarURL({ dynamic: true, size: 1024 }) || client.user?.displayAvatarURL({ dynamic: true, size: 1024 });
    const globalAvatarUrl = client.user?.displayAvatarURL({ dynamic: true, size: 1024 });

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ 
            name: `${client.user?.username || 'Bot'} • Server Avatar Status`, 
            iconURL: client.user?.displayAvatarURL({ dynamic: true }) 
        })
        .setTitle(`🖼️ Bot Avatar in ${guild.name}`)
        .setDescription(
            `**Status:** ${hasServerAvatar ? '🎨 `Custom Server Avatar Active`' : '🌐 `Default Global Avatar Active`'}\n\n` +
            `### ⚙️ How to Change or Customize:\n` +
            `• **Upload an Image:** Type \`,botavatar\` and attach your image file.\n` +
            `• **Use a Direct Link:** \`,botavatar <image URL>\`\n` +
            `• **Reply to a Message:** Reply to any image message and type \`,botavatar\`.\n` +
            `• **Reset to Default:** Click the button below or type \`,botavatar reset\`.\n` +
            `• **Slash Command:** Use \`/botavatar\` with the \`image\` or \`url\` option.\n\n` +
            `*Note: Requires **Manage Server** or **Administrator** permission.*`
        )
        .setImage(currentAvatarUrl)
        .setFooter({ text: `Server: ${guild.name} • Prefix: ,` })
        .setTimestamp();

    const buttons = [
        new ButtonBuilder()
            .setLabel('Open Current Image')
            .setStyle(ButtonStyle.Link)
            .setURL(currentAvatarUrl)
    ];

    if (hasServerAvatar) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId('botavatar_btn_reset')
                .setLabel('Reset to Default Avatar')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Danger)
        );
    }

    const row = new ActionRowBuilder().addComponents(buttons);
    return { embeds: [embed], components: [row] };
}

/**
 * Checks if a member has permission to manage the bot's server avatar.
 */
function canManageBotAvatar(member, user, guild) {
    if (config.BOT_OWNERS && config.BOT_OWNERS.includes(user.id)) return true;
    if (guild.ownerId === user.id) return true;
    if (!member) return false;
    return member.permissions.has(PermissionFlagsBits.ManageGuild) || member.permissions.has(PermissionFlagsBits.Administrator);
}

module.exports = {
    resolveImageToDataUri,
    extractImageFromContext,
    updateBotServerAvatar,
    resetBotServerAvatar,
    buildAvatarSuccessEmbed,
    buildAvatarResetEmbed,
    buildCurrentAvatarEmbed,
    canManageBotAvatar,
    ALLOWED_MIME_TYPES,
    MAX_IMAGE_BYTES
};
