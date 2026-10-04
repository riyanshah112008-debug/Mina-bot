// ==========================================
// 🔍 WHOIS USER LOOKUP & INVITE TRACKER MODULE
// File Path: modules/whois.js
// ==========================================
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

// 🗄️ MONGODB INVITE TRACKING SCHEMA
const InviteDataSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    inviterId: { type: String, required: true },
    inviteCode: { type: String, default: null },
    joinedAt: { type: Date, default: Date.now }
});
InviteDataSchema.index({ userId: 1, guildId: 1 }, { unique: true });
const InviteData = mongoose.models.InviteData || mongoose.model('InviteData', InviteDataSchema);

// In-Memory Invite Cache: guildId -> Map(inviteCode -> uses)
const guildInvitesCache = new Map();

// Helper: Cache all invites for a guild
async function cacheGuildInvites(guild) {
    if (!guild || !guild.invites) return;
    try {
        const invites = await guild.invites.fetch();
        const codeMap = new Map();
        invites.forEach(inv => codeMap.set(inv.code, inv.uses || 0));
        guildInvitesCache.set(guild.id, codeMap);
    } catch (err) {
        // Missing Manage Server / Manage Guild permissions to fetch invites
    }
}

module.exports = (client) => {
    const { Events } = require('discord.js');
    client.on(Events.ClientReady || 'clientReady', async () => {
        client.guilds.cache.forEach(guild => cacheGuildInvites(guild));
    });

    client.on('guildCreate', async (guild) => {
        cacheGuildInvites(guild);
    });

    client.on('inviteCreate', async (invite) => {
        if (!invite.guild) return;
        const codeMap = guildInvitesCache.get(invite.guild.id) || new Map();
        codeMap.set(invite.code, invite.uses || 0);
        guildInvitesCache.set(invite.guild.id, codeMap);
    });

    client.on('inviteDelete', async (invite) => {
        if (!invite.guild) return;
        const codeMap = guildInvitesCache.get(invite.guild.id);
        if (codeMap) codeMap.delete(invite.code);
    });

    // 2. AUTOMATIC INVITER DETECTION ON MEMBER JOIN
    client.on('guildMemberAdd', async (member) => {
        if (member.user.bot) return;

        const guild = member.guild;
        const cachedCodes = guildInvitesCache.get(guild.id);

        try {
            const currentInvites = await guild.invites.fetch().catch(() => null);
            if (!currentInvites) return;

            let usedInvite = null;

            if (cachedCodes) {
                // Find which invite code incremented its uses
                usedInvite = currentInvites.find(inv => {
                    const prevUses = cachedCodes.get(inv.code) || 0;
                    return inv.uses > prevUses;
                });
            }

            // Update in-memory cache with new invite counts
            const newCodeMap = new Map();
            currentInvites.forEach(inv => newCodeMap.set(inv.code, inv.uses || 0));
            guildInvitesCache.set(guild.id, newCodeMap);

            // Save inviter relationship to MongoDB
            if (usedInvite && usedInvite.inviter) {
                await InviteData.findOneAndUpdate(
                    { userId: member.id, guildId: guild.id },
                    { 
                        inviterId: usedInvite.inviter.id, 
                        inviteCode: usedInvite.code,
                        joinedAt: new Date()
                    },
                    { upsert: true }
                ).catch(() => {});
            }
        } catch (err) {
            console.error('Invite Tracking Error:', err.message);
        }
    });

    // 3. /WHOIS SLASH COMMAND INTERACTION
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand() || interaction.commandName !== 'whois') return;

        const user = interaction.options.getUser('target') || interaction.user;
        
        let member = null;
        if (interaction.guild) {
            member = await interaction.guild.members.fetch(user.id).catch(() => null);
        }

        const embed = new EmbedBuilder()
            .setColor(member?.displayHexColor && member.displayHexColor !== '#000000' ? member.displayHexColor : '#5865F2')
            .setAuthor({ name: `${user.tag} (${user.id})`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👤 Username', value: `\`${user.username}\``, inline: true },
                { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
                { name: '🤖 Is Bot?', value: user.bot ? '`Yes 🤖`' : '`No 👤`', inline: true },
                { name: '📆 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R> (<t:${Math.floor(user.createdTimestamp / 1000)}:D>)`, inline: false }
            )
            .setTimestamp();

        if (member && interaction.guild) {
            // Fetch saved inviter from MongoDB
            let inviterDisplay = '`Unknown / Pre-tracking`';
            const savedInvite = await InviteData.findOne({ userId: user.id, guildId: interaction.guild.id }).catch(() => null);

            if (savedInvite && savedInvite.inviterId) {
                const inviterUser = await client.users.fetch(savedInvite.inviterId).catch(() => null);
                if (inviterUser) {
                    inviterDisplay = `<@${inviterUser.id}> (\`${inviterUser.username}\`)`;
                } else {
                    inviterDisplay = `<@${savedInvite.inviterId}>`;
                }
                if (savedInvite.inviteCode) {
                    inviterDisplay += `\n↳ Code: \`${savedInvite.inviteCode}\``;
                }
            } else if (user.id === interaction.guild.ownerId) {
                inviterDisplay = '`Server Owner 👑`';
            } else if (user.bot) {
                inviterDisplay = '`Added via OAuth2 App`';
            }

            // Filter roles excluding @everyone
            const roles = member.roles.cache.filter(r => r.id !== interaction.guild.id).sort((a, b) => b.position - a.position);
            const roleList = roles.map(r => `<@&${r.id}>`).join(', ') || 'None';

            const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

            embed.addFields(
                { name: '📥 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '✉️ Invited By', value: inviterDisplay, inline: true },
                { name: '🛡️ Highest Role', value: member.roles.highest.toString(), inline: true },
                { name: '⚠️ Administrator?', value: isAdmin ? '`Yes ✅`' : '`No ❌`', inline: true },
                { name: `🏷️ Roles [${roles.size}]`, value: roleList.length > 1024 ? `${roles.size} roles (List too long to display)` : roleList, inline: false }
            );
        } else {
            embed.setFooter({ 
                text: interaction.guild ? 'User is not in this server.' : '🌐 Executed in External Channel / User App Mode' 
            });
        }

        await interaction.reply({ embeds: [embed] }).catch(() => {});
    });
};
