// ==========================================
// 📸 PIC & GIF PERMISSIONS REWARD ENGINE
// File Path: src/modules/mediaPermsEngine.js
// Rewards Discord Server Boosters and Members with Server Invite in their Status
// Automatically assigns/revokes Pic & GIF Perms (AttachFiles & EmbedLinks)
// ==========================================

const { 
    Events, 
    EmbedBuilder, 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const ServerSettings = require('../models/ServerSettings');
const db = require('../utils/database');
const config = require('../config');

// In-Memory Debouncing & Invite Cache
const memberReconcileDebounce = new Map();
const guildInviteCache = new Map(); // guildId -> { codes: Set<string>, vanity: string|null, timestamp: number }
const opportunisticCheckDebounce = new Map();

class MediaPermsEngine {
    constructor() {
        this.client = null;
        this.app = null;
        this.cache = new Map(); // guildId -> mediaPerms settings
    }

    /**
     * Initialize Engine with Discord Gateway Observers
     * @param {import('discord.js').Client} client 
     * @param {import('express').Application} app 
     */
    init(client, app) {
        this.client = client;
        this.app = app;

        // 1. Observe Presence Updates (Custom Status changes, Online/Offline switches)
        client.on(Events.PresenceUpdate, async (oldPresence, newPresence) => {
            try {
                if (!newPresence || !newPresence.guild) return;
                const member = newPresence.member || 
                    newPresence.guild.members.cache.get(newPresence.userId) || 
                    await newPresence.guild.members.fetch(newPresence.userId).catch(() => null);

                if (!member || member.user?.bot) return;
                await this.reconcileMember(member, newPresence);
            } catch (err) {
                // Silently swallow transient gateway errors
            }
        });

        // 2. Observe Guild Member Updates (Server Boosts added/removed, manual role modifications)
        client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
            try {
                if (!newMember || newMember.user?.bot || !newMember.guild) return;
                const boostChanged = Boolean(oldMember.premiumSince) !== Boolean(newMember.premiumSince);
                if (boostChanged) {
                    await this.reconcileMember(newMember, newMember.presence);
                }
            } catch (err) {}
        });

        // 3. Opportunistic Check on Message Activity (Ensures zero lag even if presence was delayed)
        client.on(Events.MessageCreate, async (message) => {
            try {
                if (!message || message.author?.bot || !message.guild) return;
                const key = `${message.guild.id}-${message.author.id}`;
                const now = Date.now();
                const lastCheck = opportunisticCheckDebounce.get(key) || 0;
                if (now - lastCheck < 60000) return; // 1-minute throttle per user
                opportunisticCheckDebounce.set(key, now);

                if (message.member) {
                    await this.reconcileMember(message.member, message.member.presence);
                }
            } catch (err) {}
        });

        // 4. Initial Reconciler Sweep on Bot Ready
        client.on(Events.ClientReady, async () => {
            setTimeout(async () => {
                try {
                    for (const guild of client.guilds.cache.values()) {
                        await this.refreshGuildInvites(guild).catch(() => {});
                    }
                } catch (e) {}
            }, 10000);
        });

        // 5. Register REST Endpoints for Web Dashboard
        if (this.app) {
            this.registerApiRoutes(this.app);
        }
    }

    /**
     * Retrieve or load cached Media Perms settings for a guild
     * @param {string} guildId 
     * @returns {Promise<Object>}
     */
    async getGuildSettings(guildId) {
        if (!guildId) return { enabled: false };
        if (this.cache.has(guildId)) return this.cache.get(guildId);

        let settings = null;
        try {
            const mongoose = require('mongoose');
            if (mongoose.connection && mongoose.connection.readyState === 1) {
                const doc = await ServerSettings.findOne({ guildId }).select('mediaPerms').lean();
                if (doc && doc.mediaPerms) {
                    settings = doc.mediaPerms;
                }
            }
        } catch (e) {}

        if (!settings) {
            const local = db.getGuildSettings(guildId);
            if (local && local.media_perms) {
                settings = local.media_perms;
            }
        }

        const resolved = {
            enabled: settings?.enabled !== false,
            roleId: settings?.roleId || '',
            inviteUrl: settings?.inviteUrl || '',
            requireOnline: settings?.requireOnline !== false,
            allowIdleDnd: Boolean(settings?.allowIdleDnd),
            boosterPerk: settings?.boosterPerk !== false,
            logChannelId: settings?.logChannelId || ''
        };

        this.cache.set(guildId, resolved);
        return resolved;
    }

    /**
     * Update and persist Media Perms settings for a guild
     * @param {string} guildId 
     * @param {Object} update 
     */
    async updateGuildSettings(guildId, update) {
        if (!guildId) return;
        const current = await this.getGuildSettings(guildId);
        const merged = { ...current, ...update };
        this.cache.set(guildId, merged);

        // Sync local store
        try {
            if (db && typeof db.updateGuildSettings === 'function') {
                db.updateGuildSettings(guildId, { media_perms: merged });
            }
        } catch (e) {}

        // Sync MongoDB
        try {
            const mongoose = require('mongoose');
            if (mongoose.connection && mongoose.connection.readyState === 1) {
                await ServerSettings.findOneAndUpdate(
                    { guildId },
                    { $set: { mediaPerms: merged } },
                    { upsert: true }
                ).catch(() => {});
            }
        } catch (e) {}

        return merged;
    }

    /**
     * Refresh and cache guild active invite codes and vanity URL
     * @param {import('discord.js').Guild} guild 
     */
    async refreshGuildInvites(guild) {
        if (!guild) return null;
        const now = Date.now();
        const cached = guildInviteCache.get(guild.id);
        if (cached && now - cached.timestamp < 3600000) { // 1-hour cache
            return cached;
        }

        const codes = new Set();
        let vanity = guild.vanityURLCode || null;

        try {
            if (guild.members?.me?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
                const invites = await guild.invites.fetch().catch(() => null);
                if (invites) {
                    for (const inv of invites.values()) {
                        if (inv.code) codes.add(inv.code.toLowerCase());
                    }
                }
            }
        } catch (e) {}

        if (vanity) codes.add(vanity.toLowerCase());

        const data = { codes, vanity, timestamp: now };
        guildInviteCache.set(guild.id, data);
        return data;
    }

    /**
     * Check if a member's presence custom status contains a valid invite link for this guild
     * @param {import('discord.js').Guild} guild 
     * @param {import('discord.js').Presence} presence 
     * @param {Object} settings 
     * @returns {boolean}
     */
    hasInviteInStatus(guild, presence, settings) {
        if (!presence || !presence.activities || presence.activities.length === 0) return false;

        const custom = presence.activities.find(a => a.type === 4 || a.name === 'Custom Status' || a.id === 'custom');
        if (!custom) return false;

        const statusText = [custom.state, custom.details].filter(Boolean).join(' ').toLowerCase();
        if (!statusText) return false;

        // 1. Check custom configured invite / text
        if (settings.inviteUrl && settings.inviteUrl.trim().length > 0) {
            const target = settings.inviteUrl.trim().toLowerCase();
            const cleanTarget = target.replace(/^https?:\/\//, '').replace(/^discord\.(gg|com\/invite)\//, '');
            if (statusText.includes(target) || (cleanTarget && statusText.includes(cleanTarget))) {
                return true;
            }
        }

        // 2. Check guild vanity URL
        if (guild.vanityURLCode) {
            const v = guild.vanityURLCode.toLowerCase();
            if (statusText.includes(`discord.gg/${v}`) || 
                statusText.includes(`.gg/${v}`) || 
                statusText.includes(`/${v}`)) {
                return true;
            }
        }

        // 3. Check active invites cached for the guild
        const cached = guildInviteCache.get(guild.id);
        if (cached && cached.codes) {
            for (const code of cached.codes) {
                if (statusText.includes(`discord.gg/${code}`) || 
                    statusText.includes(`.gg/${code}`) || 
                    statusText.includes(`/${code}`)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Evaluate eligibility details for a member
     * @param {import('discord.js').GuildMember} member 
     * @param {import('discord.js').Presence} [presence] 
     * @returns {Promise<{ eligible: boolean, isBooster: boolean, isOnline: boolean, hasInvite: boolean, status: string, statusText: string }>}
     */
    async checkMemberEligibility(member, presence = null) {
        if (!member || !member.guild) {
            return { eligible: false, isBooster: false, isOnline: false, hasInvite: false, status: 'offline', statusText: '' };
        }

        const settings = await this.getGuildSettings(member.guild.id);
        if (!settings.enabled) {
            return { eligible: false, isBooster: false, isOnline: false, hasInvite: false, status: 'disabled', statusText: '' };
        }

        const isBooster = Boolean(member.premiumSince) || Boolean(
            member.roles?.cache && (
                typeof member.roles.cache.some === 'function' 
                    ? member.roles.cache.some(r => r.name?.toLowerCase().includes('server booster')) 
                    : Array.from(member.roles.cache.values()).some(r => r.name?.toLowerCase().includes('server booster'))
            )
        );
        if (settings.boosterPerk && isBooster) {
            return { eligible: true, isBooster: true, isOnline: true, hasInvite: false, status: 'booster', statusText: 'Server Booster' };
        }

        const pres = presence || member.presence;
        const currentStatus = pres?.status || 'offline';

        let isOnline = false;
        if (settings.requireOnline) {
            if (settings.allowIdleDnd) {
                isOnline = ['online', 'idle', 'dnd'].includes(currentStatus);
            } else {
                isOnline = currentStatus === 'online';
            }
        } else {
            isOnline = currentStatus !== 'offline';
        }

        const custom = pres?.activities?.find(a => a.type === 4 || a.name === 'Custom Status' || a.id === 'custom');
        const statusText = [custom?.state, custom?.details].filter(Boolean).join(' ');

        let hasInvite = false;
        if (isOnline) {
            hasInvite = this.hasInviteInStatus(member.guild, pres, settings);
        }

        const eligible = isOnline && hasInvite;
        return {
            eligible,
            isBooster,
            isOnline,
            hasInvite,
            status: currentStatus,
            statusText
        };
    }

    /**
     * Resolve or auto-create the Pic & GIF Perms role for a guild
     * @param {import('discord.js').Guild} guild 
     * @param {Object} settings 
     * @returns {Promise<import('discord.js').Role|null>}
     */
    async resolveOrCreatePermsRole(guild, settings) {
        if (!guild) return null;

        // 1. Check if configured roleId exists
        if (settings.roleId) {
            const existing = guild.roles.cache.get(settings.roleId);
            if (existing) return existing;
        }

        // 2. Look for role with matching common names
        const candidate = guild.roles.cache.find(r => {
            const n = r.name.toLowerCase();
            return n === 'pic perms' || 
                   n === 'pic & gif perms' || 
                   n === 'media perms' || 
                   n === 'image perms' ||
                   n === 'pics & gifs';
        });

        if (candidate) {
            await this.updateGuildSettings(guild.id, { roleId: candidate.id });
            return candidate;
        }

        // 3. Auto-create role if bot has ManageRoles permission
        const me = guild.members.me;
        if (me && me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            try {
                const newRole = await guild.roles.create({
                    name: 'Pic & GIF Perms',
                    color: '#A29BFE',
                    permissions: [
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks
                    ],
                    reason: 'Mina/Starry Automatic Pic & GIF Perms Reward Role'
                });

                await this.updateGuildSettings(guild.id, { roleId: newRole.id });
                return newRole;
            } catch (err) {
                console.error(`[MediaPerms] Could not auto-create role in ${guild.name}:`, err.message);
            }
        }

        return null;
    }

    /**
     * Reconcile role assignment for a single member
     * @param {import('discord.js').GuildMember} member 
     * @param {import('discord.js').Presence} [presence] 
     */
    async reconcileMember(member, presence = null) {
        if (!member || member.user?.bot || !member.guild) return;

        const debounceKey = `${member.guild.id}-${member.id}`;
        const now = Date.now();
        if (memberReconcileDebounce.has(debounceKey) && now - memberReconcileDebounce.get(debounceKey) < 3000) {
            return;
        }
        memberReconcileDebounce.set(debounceKey, now);

        const settings = await this.getGuildSettings(member.guild.id);
        if (!settings.enabled) return;

        const role = await this.resolveOrCreatePermsRole(member.guild, settings);
        if (!role) return;

        const me = member.guild.members.me;
        if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) return;
        if (me.roles.highest.position <= role.position) return; // Cannot manage higher or equal role

        const { eligible, isBooster } = await this.checkMemberEligibility(member, presence);
        const hasRole = member.roles.cache.has(role.id);

        if (eligible && !hasRole) {
            try {
                await member.roles.add(role.id, isBooster ? 'Pic & GIF Perms (Server Booster)' : 'Pic & GIF Perms (Invite in Status)');
                this.sendLogNotification(member.guild, settings, member, 'granted', isBooster ? 'Server Booster' : 'Status Supporter');
            } catch (err) {}
        } else if (!eligible && hasRole) {
            try {
                await member.roles.remove(role.id, 'Pic & GIF Perms revoked (Status changed or offline)');
                this.sendLogNotification(member.guild, settings, member, 'revoked', 'Status removed or offline');
            } catch (err) {}
        }
    }

    /**
     * Synchronize all cached members in a guild
     * @param {import('discord.js').Guild} guild 
     * @returns {Promise<{ total: number, granted: number, revoked: number }>}
     */
    async syncGuild(guild) {
        if (!guild) return { total: 0, granted: 0, revoked: 0 };
        const settings = await this.getGuildSettings(guild.id);
        if (!settings.enabled) return { total: 0, granted: 0, revoked: 0 };

        const role = await this.resolveOrCreatePermsRole(guild, settings);
        if (!role) return { total: 0, granted: 0, revoked: 0 };

        await this.refreshGuildInvites(guild);

        let granted = 0;
        let revoked = 0;
        let total = 0;

        const members = Array.from(guild.members.cache.values()).filter(m => !m.user.bot);
        total = members.length;

        for (const member of members) {
            try {
                const { eligible } = await this.checkMemberEligibility(member, member.presence);
                const hasRole = member.roles.cache.has(role.id);

                if (eligible && !hasRole) {
                    await member.roles.add(role.id, 'Pic & GIF Perms Sync');
                    granted++;
                } else if (!eligible && hasRole) {
                    await member.roles.remove(role.id, 'Pic & GIF Perms Sync');
                    revoked++;
                }
            } catch (e) {}
        }

        return { total, granted, revoked };
    }

    /**
     * Send log notification to designated channel
     */
    async sendLogNotification(guild, settings, member, action, reason) {
        if (!settings.logChannelId) return;
        try {
            const channel = guild.channels.cache.get(settings.logChannelId);
            if (!channel || !channel.isTextBased()) return;

            const isGrant = action === 'granted';
            const embed = new EmbedBuilder()
                .setColor(isGrant ? '#2ECC71' : '#E74C3C')
                .setTitle(isGrant ? '📸 Pic & GIF Perms Granted' : '📸 Pic & GIF Perms Revoked')
                .setDescription(
                    isGrant 
                        ? `Congratulations <@${member.id}>! You have been granted **Pic & GIF Perms** (\`${reason}\`).`
                        : `<@${member.id}>'s **Pic & GIF Perms** were removed (\`${reason}\`).`
                )
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Media Perms Engine • Mina & Starry' })
                .setTimestamp();

            await channel.send({ embeds: [embed] }).catch(() => {});
        } catch (e) {}
    }

    /**
     * Register Dashboard API endpoints
     * @param {import('express').Application} app 
     */
    registerApiRoutes(app) {
        app.get('/api/guilds/:guildId/media-perms', async (req, res) => {
            try {
                const { guildId } = req.params;
                const settings = await this.getGuildSettings(guildId);
                const guild = this.client?.guilds?.cache?.get(guildId);
                let roleName = 'None';
                if (guild && settings.roleId) {
                    roleName = guild.roles.cache.get(settings.roleId)?.name || 'Invalid Role';
                }
                res.json({ success: true, settings, roleName });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        app.post('/api/guilds/:guildId/media-perms', async (req, res) => {
            try {
                const { guildId } = req.params;
                const updated = await this.updateGuildSettings(guildId, req.body);
                res.json({ success: true, settings: updated });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        app.post('/api/guilds/:guildId/media-perms/sync', async (req, res) => {
            try {
                const { guildId } = req.params;
                const guild = this.client?.guilds?.cache?.get(guildId);
                if (!guild) return res.status(404).json({ error: 'Guild not found' });
                const stats = await this.syncGuild(guild);
                res.json({ success: true, stats });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    }
}

const mediaPermsEngine = new MediaPermsEngine();

module.exports = function (client, app) {
    mediaPermsEngine.init(client, app);
    return mediaPermsEngine;
};

module.exports.engine = mediaPermsEngine;
module.exports.MediaPermsEngine = MediaPermsEngine;
