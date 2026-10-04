// ==========================================
// 📦 STARRY NEAT-JSON BACKUP & RESTORE ENGINE
// ==========================================
const { 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    AttachmentBuilder,
    Events
} = require('discord.js');

let ServerBackup;
try { 
    ServerBackup = require('../models/ServerBackup'); 
} catch(e) {
    console.error('⚠️ [BackupEngine] Could not load ServerBackup model:', e.message);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Safely fetch recent channel message history
async function fetchChannelMessageArchive(channel, limit = 50) {
    if (!channel.isTextBased() || channel.isVoiceBased()) return [];
    const botPerms = channel.permissionsFor(channel.guild.members.me);
    if (!botPerms || !botPerms.has(PermissionFlagsBits.ReadMessageHistory) || !botPerms.has(PermissionFlagsBits.ViewChannel)) return [];

    try {
        const fetched = await channel.messages.fetch({ limit }).catch(() => null);
        if (!fetched || fetched.size === 0) return [];

        return fetched.map(m => ({
            time: new Date(m.createdTimestamp).toLocaleString(),
            author: m.author ? m.author.tag : 'Unknown User',
            isBot: m.author ? m.author.bot : false,
            content: m.content || '',
            attachments: m.attachments.map(a => a.url),
            id: m.id
        })).reverse(); // Chronological order
    } catch (err) {
        return [];
    }
}

// Core Backup Execution Routine
async function executeServerFullBackup(guild) {
    const fetchedRoles = await guild.roles.fetch();
    const fetchedChannels = await guild.channels.fetch();

    // 1. Roles sorted by position (Highest to Lowest)
    const rolesData = fetchedRoles
        .filter(r => !r.managed && r.name !== '@everyone' && r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => ({
            position: r.position,
            name: r.name,
            color: r.hexColor,
            hoist: r.hoist,
            permissions: r.permissions ? r.permissions.bitfield.toString() : '0',
            id: r.id
        }));

    const getOverwrites = (channel) => channel.permissionOverwrites.cache.map(ow => ({
        id: ow.id,
        type: ow.type,
        allow: ow.allow ? ow.allow.bitfield.toString() : '0',
        deny: ow.deny ? ow.deny.bitfield.toString() : '0'
    }));

    // 2. Categories Map
    const categoriesMap = new Map();
    const categoriesData = [];

    fetchedChannels
        .filter(c => c && c.type === ChannelType.GuildCategory)
        .forEach(c => {
            categoriesMap.set(c.id, c.name);
            categoriesData.push({
                name: c.name,
                id: c.id,
                overwrites: getOverwrites(c)
            });
        });

    // 3. Channels Organized Category-Wise
    const channelsData = [];
    let totalMessagesArchived = 0;

    const sortedChannels = Array.from(fetchedChannels.values())
        .filter(c => c && c.type !== ChannelType.GuildCategory)
        .sort((a, b) => {
            const catA = a.parentId ? (categoriesMap.get(a.parentId) || 'Uncategorized') : 'Uncategorized';
            const catB = b.parentId ? (categoriesMap.get(b.parentId) || 'Uncategorized') : 'Uncategorized';
            return catA.localeCompare(catB);
        });

    for (const c of sortedChannels) {
        const categoryName = c.parentId ? (categoriesMap.get(c.parentId) || 'Uncategorized') : 'No Category';

        let messageHistory = [];
        if (c.isTextBased()) {
            messageHistory = await fetchChannelMessageArchive(c, 50);
            totalMessagesArchived += messageHistory.length;
            await delay(150); // Throttling for Discord API safety
        }

        channelsData.push({
            category: categoryName,
            name: `#${c.name}`,
            topic: c.topic || 'None',
            type: c.type === 0 ? 'Text Channel' : (c.type === 2 ? 'Voice Channel' : `Type ${c.type}`),
            archivedMessagesCount: messageHistory.length,
            messages: messageHistory,
            // Programmatic keys for .restore
            id: c.id,
            parentId: c.parentId,
            rawType: c.type,
            nsfw: c.nsfw || false,
            rateLimitPerUser: c.rateLimitPerUser || 0,
            userLimit: c.userLimit || 0,
            overwrites: getOverwrites(c)
        });
    }

    const backupPayload = {
        _info: "================ STARRY FULL SERVER ARCHIVE ================",
        serverName: guild.name,
        serverId: guild.id,
        createdAt: new Date().toLocaleString(),
        timestamp: Date.now(),
        summary: {
            totalRoles: rolesData.length,
            totalCategories: categoriesData.length,
            totalChannels: channelsData.length,
            totalArchivedMessages: totalMessagesArchived
        },
        roles: rolesData,
        categories: categoriesData,
        channels: channelsData
    };

    // Save to MongoDB
    if (ServerBackup) {
        await ServerBackup.findOneAndUpdate(
            { guildId: guild.id },
            { 
                guildId: guild.id, 
                timestamp: backupPayload.timestamp, 
                roles: rolesData, 
                categories: categoriesData, 
                channels: channelsData 
            },
            { upsert: true }
        ).catch(e => console.error('MongoDB Backup Error:', e));
    }

    return backupPayload;
}

// Locate Admin Channel for Dispatch
function findAdminChannel(guild) {
    return guild.channels.cache.find(c => 
        c.isTextBased() && 
        c.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages) &&
        (
            c.name.includes('admin') || 
            c.name.includes('log') || 
            c.name.includes('staff') || 
            c.name.includes('backup') ||
            c.name === 'admin-action-requests' ||
            c.name === 'logs-moderate'
        )
    ) || guild.systemChannel;
}

module.exports = (client) => {

    // ==========================================
    // 🕒 AUTOMATED DAILY BACKUP SCHEDULER (24 HOURS)
    // ==========================================
    client.once(Events.ClientReady || 'clientReady', () => {
        console.log('⏰ Autonomous Daily Backup Engine Armed.');

        setInterval(async () => {
            console.log('🔄 Executing Scheduled Daily Server Backups...');

            for (const [, guild] of client.guilds.cache) {
                try {
                    const backupData = await executeServerFullBackup(guild);
                    const adminCh = findAdminChannel(guild);

                    if (adminCh) {
                        const jsonBuffer = Buffer.from(JSON.stringify(backupData, null, 2), 'utf-8');
                        const fileAttachment = new AttachmentBuilder(jsonBuffer, { name: `Server_Backup_${guild.id}.json` });

                        const embed = new EmbedBuilder()
                            .setColor('#2ecc71')
                            .setTitle('🤖 Scheduled Daily Backup Complete')
                            .setDescription(
                                `The daily automated server & message history snapshot has been generated!\n\n` +
                                `• **Roles Saved:** \`${backupData.summary.totalRoles}\`\n` +
                                `• **Categories Saved:** \`${backupData.summary.totalCategories}\`\n` +
                                `• **Channels Saved:** \`${backupData.summary.totalChannels}\`\n` +
                                `• **Messages Archived:** \`${backupData.summary.totalArchivedMessages}\` msgs\n\n` +
                                `*A clean JSON archive file is attached below.*`
                            )
                            .setFooter({ text: 'Starry Autonomous Backup Core' })
                            .setTimestamp();

                        await adminCh.send({ embeds: [embed], files: [fileAttachment] }).catch(() => {});
                    }
                } catch (err) {
                    console.error(`Daily Backup error for guild ${guild.id}:`, err);
                }
            }
        }, 24 * 60 * 60 * 1000);
    });

    // Automated Daily Backup Cron & Periodic Engine
    setInterval(() => {
        // Daily automated backup execution
    }, 86400000);
};

module.exports.executeServerFullBackup = executeServerFullBackup;

