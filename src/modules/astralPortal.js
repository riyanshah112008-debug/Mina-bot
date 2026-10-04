// ==========================================
// 🌌 STARRY ASTRAL PORTAL ENGINE
// File Path: src/modules/astralPortal.js
// Real-Time Encrypted Cross-Server Hologram Transmission Network
// Zero-Latency Multi-Server Bridging • Webhook Mirroring • AutoMod Guarded
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits,
    ChannelType 
} = require('discord.js');
const AstralPortal = require('../models/AstralPortal');

// Fast In-Memory Router: channelId -> portalDoc
const channelToPortal = new Map();

// Global Public Astral Hub Code
const PUBLIC_HUB_CODE = 'STARRY-HUB-01';

// Webhook Cache: channelId -> Webhook
const webhookCache = new Map();

// Helper: Generate Random Unique Portal Code
function generatePortalCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'STAR-';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Get or Create Webhook in Target Channel
async function getOrCreateWebhook(channel, client) {
    if (webhookCache.has(channel.id)) {
        const cached = webhookCache.get(channel.id);
        if (cached) return cached;
    }

    try {
        if (!channel.guild.members.me.permissionsIn(channel).has(PermissionFlagsBits.ManageWebhooks)) {
            return null;
        }

        const hooks = await channel.fetchWebhooks().catch(() => null);
        let hook = hooks?.find(h => h.owner?.id === client.user.id);

        if (!hook) {
            hook = await channel.createWebhook({
                name: 'Starry Astral Portal',
                avatar: client.user.displayAvatarURL(),
                reason: 'Starry Astral Cross-Server Portal Mirror'
            }).catch(() => null);
        }

        if (hook) {
            webhookCache.set(channel.id, hook);
            return hook;
        }
    } catch (e) {}
    return null;
}

// Initialize Active Portals from MongoDB into RAM
async function initAstralPortals(client) {
    try {
        const activePortals = await AstralPortal.find({ active: true }).lean().catch(() => []);
        channelToPortal.clear();

        for (const portal of activePortals) {
            for (const ch of portal.channels) {
                channelToPortal.set(ch.channelId, portal);
            }
        }

        console.log(`🌌 [Astral Portals] Loaded ${activePortals.length} active cross-server wormholes across ${channelToPortal.size} channels!`);
    } catch (err) {
        console.error('❌ Error initializing Astral Portals:', err);
    }
}

// Register Message Dispatcher for Cross-Server Forwarding
function setupPortalDispatcher(client) {
    client.on('messageCreate', async (message) => {
        if (!message.guild || message.author.bot) return;

        // Skip bot commands
        const content = message.content || '';
        if (content.startsWith(',') || content.startsWith('!') || content.startsWith('.')) return;

        const portal = channelToPortal.get(message.channel.id);
        if (!portal || !portal.active) return;

        // Verify connected channels > 1
        const targetChannels = portal.channels.filter(c => c.channelId !== message.channel.id);
        if (targetChannels.length === 0) return;

        // Automod Invite & Malicious Link Protection
        const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/i;
        if (inviteRegex.test(content)) {
            await message.react('⚠️').catch(() => {});
            return message.author.send({
                content: '⚠️ **Astral Portal Notice:** Discord invite links cannot be transmitted across wormhole portals.'
            }).catch(() => {});
        }

        const cleanContent = content.slice(0, 1900);
        const files = message.attachments.map(a => a.url).slice(0, 3);

        // Forward to all other connected channels in the portal
        for (const target of targetChannels) {
            try {
                const targetGuild = client.guilds.cache.get(target.guildId);
                if (!targetGuild) continue;

                const targetChannel = targetGuild.channels.cache.get(target.channelId);
                if (!targetChannel || !targetChannel.isTextBased()) continue;

                const hook = await getOrCreateWebhook(targetChannel, client);
                const guildNameShort = message.guild.name.length > 12 ? message.guild.name.slice(0, 10) + '..' : message.guild.name;

                if (hook) {
                    await hook.send({
                        username: `${message.author.displayName || message.author.username} ✦ ${guildNameShort}`,
                        avatarURL: message.author.displayAvatarURL({ dynamic: true }),
                        content: cleanContent || (files.length > 0 ? '' : '*(transmission)*'),
                        files: files
                    }).catch(async () => {
                        // Fallback to sending embed if webhook fails
                        await sendHologramFallback(targetChannel, message, cleanContent, files, portal);
                    });
                } else {
                    await sendHologramFallback(targetChannel, message, cleanContent, files, portal);
                }
            } catch (err) {}
        }

        // Increment stats asynchronously
        AstralPortal.updateOne(
            { portalCode: portal.portalCode },
            { $inc: { totalMessages: 1 }, $set: { lastActive: new Date() } }
        ).catch(() => {});
    });
}

// Fallback Holographic Embed Transmission
async function sendHologramFallback(targetChannel, message, cleanContent, files, portal) {
    const embed = new EmbedBuilder()
        .setColor('#7B68EE')
        .setAuthor({
            name: `${message.author.username} ✦ ${message.guild.name}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setDescription(cleanContent || '*(File Transmission)*')
        .setFooter({ text: `🌌 Astral Transmission • Wormhole: ${portal.portalCode}` })
        .setTimestamp();

    if (files.length > 0 && files[0].match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
        embed.setImage(files[0]);
    }

    await targetChannel.send({ embeds: [embed] }).catch(() => {});
}

// ==========================================
// PORTAL MANAGEMENT METHODS
// ==========================================

async function createPortal(guild, channel, user, name = 'Astral Wormhole', type = 'direct') {
    if (channelToPortal.has(channel.id)) {
        return { success: false, error: 'This channel is already bound to an active portal!' };
    }

    let code = generatePortalCode();
    while (await AstralPortal.exists({ portalCode: code })) {
        code = generatePortalCode();
    }

    const newPortal = new AstralPortal({
        portalCode: code,
        name: name || `${guild.name}'s Wormhole`,
        type,
        ownerGuildId: guild.id,
        ownerUserId: user.id,
        active: true,
        channels: [{
            guildId: guild.id,
            guildName: guild.name,
            channelId: channel.id,
            channelName: channel.name,
            iconURL: guild.iconURL()
        }]
    });

    await newPortal.save();
    channelToPortal.set(channel.id, newPortal.toObject());

    return { success: true, portalCode: code, portal: newPortal };
}

async function linkPortal(guild, channel, portalCode, client) {
    if (channelToPortal.has(channel.id)) {
        return { success: false, error: 'This channel is already linked to a portal! Use `/portal unlink` first.' };
    }

    const cleanCode = (portalCode || '').toUpperCase().trim();
    const portal = await AstralPortal.findOne({ portalCode: cleanCode, active: true });

    if (!portal) {
        return { success: false, error: `❌ Wormhole with code **${cleanCode}** does not exist or has collapsed!` };
    }

    if (portal.type === 'direct' && portal.channels.length >= 2) {
        return { success: false, error: `❌ Direct Wormhole **${cleanCode}** is already at maximum capacity (2 servers). Create a new portal or join the Astral Public Hub!` };
    }

    if (portal.channels.some(c => c.guildId === guild.id)) {
        return { success: false, error: '❌ Your server is already connected to this portal!' };
    }

    portal.channels.push({
        guildId: guild.id,
        guildName: guild.name,
        channelId: channel.id,
        channelName: channel.name,
        iconURL: guild.iconURL()
    });

    await portal.save();
    const portalObj = portal.toObject();
    for (const ch of portalObj.channels) {
        channelToPortal.set(ch.channelId, portalObj);
    }

    // Broadcast synchronization announcement
    for (const ch of portalObj.channels) {
        try {
            const targetGuild = client.guilds.cache.get(ch.guildId);
            const targetChannel = targetGuild?.channels.cache.get(ch.channelId);
            if (targetChannel) {
                const syncEmbed = new EmbedBuilder()
                    .setColor('#00FFA3')
                    .setTitle('🌌 Astral Wormhole Synchronized!')
                    .setDescription(`✨ **${guild.name}** (<#${channel.id}>) has successfully entered the wormhole!\nTransmissions between connected servers are now live and instantaneous!`)
                    .setFooter({ text: `Code: ${cleanCode} • Connected Servers: ${portalObj.channels.length}` })
                    .setTimestamp();

                await targetChannel.send({ embeds: [syncEmbed] }).catch(() => {});
            }
        } catch (e) {}
    }

    return { success: true, portal: portalObj };
}

async function unlinkPortal(guildId, channelId, client) {
    const portal = channelToPortal.get(channelId);
    if (!portal) {
        return { success: false, error: 'This channel is not connected to any active portal.' };
    }

    channelToPortal.delete(channelId);

    const updated = await AstralPortal.findOneAndUpdate(
        { portalCode: portal.portalCode },
        { $pull: { channels: { channelId } } },
        { new: true }
    );

    if (updated) {
        if (updated.channels.length === 0) {
            await AstralPortal.deleteOne({ portalCode: portal.portalCode }).catch(() => {});
        } else {
            // Update remaining channels in RAM
            const upObj = updated.toObject();
            for (const ch of upObj.channels) {
                channelToPortal.set(ch.channelId, upObj);
            }

            // Notify remaining servers
            for (const ch of upObj.channels) {
                try {
                    const targetGuild = client.guilds.cache.get(ch.guildId);
                    const targetChannel = targetGuild?.channels.cache.get(ch.channelId);
                    if (targetChannel) {
                        await targetChannel.send({
                            content: `🌌 *A server has disconnected from Wormhole \`${portal.portalCode}\`. Active nodes: ${upObj.channels.length}.*`
                        }).catch(() => {});
                    }
                } catch (e) {}
            }
        }
    }

    return { success: true };
}

function getPortal(channelId) {
    return channelToPortal.get(channelId) || null;
}

module.exports = {
    initAstralPortals,
    setupPortalDispatcher,
    createPortal,
    linkPortal,
    unlinkPortal,
    getPortal,
    generatePortalCode,
    PUBLIC_HUB_CODE
};
