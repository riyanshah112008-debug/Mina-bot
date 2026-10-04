// ==========================================
// 🚀 STARRY BOOSTER ROLE SYNERGY ENGINE
// File Path: src/modules/boosterRoleEngine.js
// Multi-Tenant Custom Vanity Roles & Shared Friend Delegation
// Features: Unboost Grace Reconciler, Hierarchy Anchor Guard, Virality Attribution
// ==========================================
const { 
    Events, 
    EmbedBuilder, 
    PermissionFlagsBits, 
    Colors 
} = require('discord.js');
const BoosterRole = require('../models/BoosterRole');
const ServerSettings = require('../models/ServerSettings');

// Fallback anchor role name to search for if no specific role ID is configured
const DEFAULT_ANCHOR_NAME = '--- Booster Roles ---';

class BoosterRoleEngine {
    constructor() {
        this.client = null;
        this.reconcileInterval = null;
    }

    /**
     * Initialize the Booster Role Engine & Gateway Event Observers
     * @param {import('discord.js').Client} client 
     */
    init(client) {
        this.client = client;

        // 1. Observe Boost Status Changes
        client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
            try {
                await this.handleMemberUpdate(oldMember, newMember);
            } catch (err) {
                console.error('[BoosterEngine] Error in GuildMemberUpdate:', err);
            }
        });

        // 2. Observe Member Departures (Booster or Shared Friend left)
        client.on(Events.GuildMemberRemove, async (member) => {
            try {
                await this.handleMemberRemove(member);
            } catch (err) {
                console.error('[BoosterEngine] Error in GuildMemberRemove:', err);
            }
        });

        // 3. Observe Role Deletions (Manual admin deletion cleanup)
        client.on(Events.GuildRoleDelete, async (role) => {
            try {
                await this.handleRoleDelete(role);
            } catch (err) {
                console.error('[BoosterEngine] Error in GuildRoleDelete:', err);
            }
        });

        // 4. Background Grace Reaper (Runs every 10 minutes)
        if (this.reconcileInterval) clearInterval(this.reconcileInterval);
        this.reconcileInterval = setInterval(() => this.reconcileExpiredGraces(), 10 * 60 * 1000);

        console.log('🚀 [BoosterEngine] Booster Synergy Engine successfully initialized!');
    }

    /**
     * Determine if a member is currently an active server booster or server owner
     * @param {import('discord.js').GuildMember} member 
     */
    isBooster(member) {
        if (!member) return false;
        if (member.id === member.guild?.ownerId) return true; // Server owners always have booster privileges
        return Boolean(member.premiumSince);
    }

    /**
     * Get server settings with booster role defaults
     * @param {string} guildId 
     */
    async getSettings(guildId) {
        let settings = await ServerSettings.findOne({ guildId }).lean();
        if (!settings) {
            settings = {
                boosterRoleSystem: {
                    enabled: true,
                    anchorRoleId: '',
                    logChannelId: '',
                    defaultMaxShares: 1,
                    premiumMaxShares: 5,
                    allowIcons: true,
                    gracePeriodDays: 3
                },
                premium: { isPremium: false }
            };
        }
        return settings;
    }

    /**
     * Resolve target role position below the anchor role or bot's highest role
     * @param {import('discord.js').Guild} guild 
     * @param {string} [configuredAnchorId] 
     */
    async calculateSafeRolePosition(guild, configuredAnchorId) {
        const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
        if (!botMember) return 1;

        let anchorRole = null;
        if (configuredAnchorId) {
            anchorRole = guild.roles.cache.get(configuredAnchorId);
        }

        if (!anchorRole) {
            anchorRole = guild.roles.cache.find(r => r.name.toLowerCase() === DEFAULT_ANCHOR_NAME.toLowerCase());
        }

        // If an anchor role exists and is below the bot's highest role, position just below it
        if (anchorRole && botMember.roles.highest.position > anchorRole.position) {
            return Math.max(1, anchorRole.position - 1);
        }

        // Otherwise place 1 level below the bot's highest position
        return Math.max(1, botMember.roles.highest.position - 1);
    }

    /**
     * Create a brand-new custom booster role for an eligible booster
     */
    async createBoosterRole(guild, member, { name, color, icon }) {
        if (!this.isBooster(member)) {
            throw new Error('You must be an active Server Booster to create a custom booster role.');
        }

        const existingRecord = await BoosterRole.findOne({ guildId: guild.id, userId: member.id });
        if (existingRecord) {
            throw new Error('You already have a custom booster role! Use `,boosterrole edit` or `,boosterrole color` to customize it.');
        }

        const settings = await this.getSettings(guild.id);
        const config = settings.boosterRoleSystem || {};
        if (config.enabled === false) {
            throw new Error('The Custom Booster Role System is currently disabled in this server.');
        }

        const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
        if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            throw new Error('Starry lacks the `Manage Roles` permission required to create custom roles.');
        }

        // Validate clean role name
        const cleanName = (name || `${member.user.username}'s VIP`).trim().slice(0, 100);
        const cleanColor = (color || '#FF73FA').trim();

        // Calculate maximum friend shares allowed based on live server or member premium status
        const { isServerOrUserPremium } = require('../utils/premiumHelper');
        const isGuildPremium = await isServerOrUserPremium(guild.id, member.id, guild.client);
        const tier = settings.premium?.tier || 'free';
        let maxShares = config.defaultMaxShares || 1;
        if (isGuildPremium) {
            if (tier === 'lifetime') maxShares = 15;
            else if (tier === 'pro_cluster') maxShares = 10;
            else maxShares = config.premiumMaxShares || 5;
        }

        // Calculate safe position
        const targetPosition = await this.calculateSafeRolePosition(guild, config.anchorRoleId);

        // Create the role in Discord with zero elevated permissions
        const createdRole = await guild.roles.create({
            name: cleanName,
            color: cleanColor,
            permissions: 0n, // Zero elevated permissions to guarantee security
            mentionable: false,
            hoist: false,
            position: targetPosition,
            reason: `Starry Booster Synergy: Custom role for booster ${member.user.tag} (${member.id})`
        });

        // Set role icon if provided and allowed
        if (icon && config.allowIcons && guild.features.includes('ROLE_ICONS')) {
            try {
                await createdRole.setIcon(icon, 'Custom booster role icon');
            } catch (iconErr) {
                console.warn('[BoosterEngine] Could not set role icon:', iconErr.message);
            }
        }

        // Assign role to booster
        await member.roles.add(createdRole, 'Starry Booster Synergy: Assigned custom role to creator');

        // Persist in MongoDB
        const doc = await BoosterRole.create({
            guildId: guild.id,
            userId: member.id,
            roleId: createdRole.id,
            name: cleanName,
            color: cleanColor,
            icon: icon || null,
            maxShares: maxShares,
            sharedWith: [],
            active: true
        });

        // Log to telemetry channel if configured
        if (config.logChannelId) {
            const logChannel = guild.channels.cache.get(config.logChannelId);
            if (logChannel && logChannel.isTextBased()) {
                const logEmbed = new EmbedBuilder()
                    .setColor(createdRole.hexColor)
                    .setTitle('🚀 New Custom Booster Role Created')
                    .setDescription(`**Booster:** <@${member.id}> (\`${member.user.tag}\`)\n**Role:** <@&${createdRole.id}> (\`${cleanName}\`)\n**Color:** \`${cleanColor}\`\n**Max Shared Slots:** \`${maxShares}\``)
                    .setFooter({ text: 'Starry Booster Synergy Engine' })
                    .setTimestamp();
                logChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }
        }

        return { role: createdRole, doc };
    }

    /**
     * Update custom booster role color, name, or icon
     */
    async updateBoosterRole(guild, member, updates = {}) {
        const doc = await BoosterRole.findOne({ guildId: guild.id, userId: member.id });
        if (!doc) {
            throw new Error('You do not have a custom booster role. Use `,boosterrole create` to make one!');
        }

        const role = guild.roles.cache.get(doc.roleId);
        if (!role) {
            await doc.deleteOne();
            throw new Error('Your custom role was deleted from Discord. Please run `,boosterrole create` again.');
        }

        const roleData = {};
        if (updates.name) {
            const cleanName = updates.name.trim().slice(0, 100);
            doc.name = cleanName;
            roleData.name = cleanName;
        }

        if (updates.color) {
            const cleanColor = updates.color.trim();
            doc.color = cleanColor;
            roleData.color = cleanColor;

            if (updates.secondaryColor && guild.features?.includes('ENHANCED_ROLE_COLORS')) {
                try {
                    await role.setColors({ primaryColor: cleanColor, secondaryColor: updates.secondaryColor.trim() });
                    delete roleData.color;
                } catch (e) {
                    // Fallback to roleData.color
                }
            }
        }

        if (updates.icon !== undefined) {
            doc.icon = updates.icon;
            if (guild.features.includes('ROLE_ICONS')) {
                roleData.icon = updates.icon;
            }
        }

        await role.edit(roleData);
        await doc.save();
        return { role, doc };
    }

    /**
     * Share booster role with a friend (Viral delegation)
     */
    async shareBoosterRole(guild, ownerMember, targetMember) {
        if (!this.isBooster(ownerMember)) {
            throw new Error('Your server boost must be active to share your custom role.');
        }

        if (ownerMember.id === targetMember.id) {
            throw new Error('You already own this custom booster role!');
        }

        if (targetMember.user.bot) {
            throw new Error('Custom booster roles cannot be assigned to bots.');
        }

        const doc = await BoosterRole.findOne({ guildId: guild.id, userId: ownerMember.id });
        if (!doc) {
            throw new Error('You do not have a custom booster role yet! Create one with `,boosterrole create`.');
        }

        const role = guild.roles.cache.get(doc.roleId);
        if (!role) {
            throw new Error('Your custom role could not be found in this server.');
        }

        if (doc.sharedWith.includes(targetMember.id)) {
            throw new Error(`<@${targetMember.id}> already has your custom booster role!`);
        }

        // Dynamically evaluate server or member premium status to grant upgraded share slots
        const { isServerOrUserPremium } = require('../utils/premiumHelper');
        const isGuildPremium = await isServerOrUserPremium(guild.id, ownerMember.id, guild.client);
        const settings = await this.getSettings(guild.id);
        const bConfig = settings?.boosterRoleSystem || {};
        const tier = settings?.premium?.tier || 'free';

        let entitledMax = bConfig.defaultMaxShares || 1;
        if (isGuildPremium) {
            if (tier === 'lifetime') entitledMax = 15;
            else if (tier === 'pro_cluster') entitledMax = 10;
            else entitledMax = bConfig.premiumMaxShares || 5;
        }

        // Dynamically auto-scale doc.maxShares if server or owner has active premium privileges
        if (doc.maxShares < entitledMax) {
            doc.maxShares = entitledMax;
            await doc.save();
        }

        if (doc.sharedWith.length >= doc.maxShares) {
            const upgradeTip = isGuildPremium
                ? `Remove an existing friend with \`,boosterrole unshare\`.`
                : `Upgrade server to Starry Premium or remove an existing friend with \`,boosterrole unshare\`.`;
            throw new Error(`You have reached your maximum share limit (${doc.sharedWith.length}/${doc.maxShares}). ${upgradeTip}`);
        }

        // Add role to target member
        await targetMember.roles.add(role, `Shared booster role by ${ownerMember.user.tag}`);
        doc.sharedWith.push(targetMember.id);
        await doc.save();

        return { role, doc, targetMember };
    }

    /**
     * Revoke booster role from a shared friend
     */
    async unshareBoosterRole(guild, ownerMember, targetMember) {
        const doc = await BoosterRole.findOne({ guildId: guild.id, userId: ownerMember.id });
        if (!doc) {
            throw new Error('You do not have a custom booster role.');
        }

        const role = guild.roles.cache.get(doc.roleId);

        if (!doc.sharedWith.includes(targetMember.id)) {
            throw new Error(`<@${targetMember.id}> does not currently have your shared role.`);
        }

        // Remove role if target is still in the server
        if (targetMember && role) {
            await targetMember.roles.remove(role, `Unshared booster role by ${ownerMember.user.tag}`).catch(() => {});
        }

        doc.sharedWith = doc.sharedWith.filter(id => id !== targetMember.id);
        await doc.save();

        return { role, doc };
    }

    /**
     * Delete custom booster role completely
     */
    async deleteBoosterRole(guild, member) {
        const doc = await BoosterRole.findOne({ guildId: guild.id, userId: member.id });
        if (!doc) {
            throw new Error('You do not have an active booster role to delete.');
        }

        const role = guild.roles.cache.get(doc.roleId);
        if (role) {
            await role.delete('Booster requested custom role deletion').catch(() => {});
        }

        await doc.deleteOne();
        return true;
    }

    /**
     * Gateway Observer: Handle Member Update (Detect loss or renewal of boost)
     */
    async handleMemberUpdate(oldMember, newMember) {
        const hadBoost = Boolean(oldMember.premiumSince);
        const hasBoost = Boolean(newMember.premiumSince);

        // Case 1: Member stopped boosting
        if (hadBoost && !hasBoost) {
            const doc = await BoosterRole.findOne({ guildId: newMember.guild.id, userId: newMember.id });
            if (!doc) return;

            const settings = await this.getSettings(newMember.guild.id);
            const graceDays = settings.boosterRoleSystem?.gracePeriodDays || 3;
            const now = new Date();
            const graceExpires = new Date(now.getTime() + (graceDays * 24 * 60 * 60 * 1000));

            doc.unboostDetectedAt = now;
            doc.graceExpiresAt = graceExpires;
            await doc.save();

            // Dispatch warning DM to user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(Colors.Orange)
                    .setTitle('⚠️ Server Boost Ended — Custom Role Grace Period')
                    .setDescription(`We noticed you are no longer boosting **${newMember.guild.name}**.\n\nYour custom role **${doc.name}** and your shared friend slots will remain active for a **${graceDays}-day grace period**.\n\nIf you re-boost before <t:${Math.floor(graceExpires.getTime() / 1000)}:R>, your custom role will be permanently preserved!`)
                    .setFooter({ text: 'Starry Booster Synergy Engine' });
                await newMember.send({ embeds: [dmEmbed] }).catch(() => {});
            } catch (dmErr) {}

            console.log(`⏳ [BoosterEngine] User ${newMember.user.tag} stopped boosting ${newMember.guild.name}. Grace period set to ${graceExpires.toISOString()}`);
        }

        // Case 2: Member renewed or resumed boost
        if (!hadBoost && hasBoost) {
            const doc = await BoosterRole.findOne({ guildId: newMember.guild.id, userId: newMember.id });
            if (doc && doc.unboostDetectedAt) {
                doc.unboostDetectedAt = null;
                doc.graceExpiresAt = null;
                doc.active = true;
                await doc.save();
                console.log(`✨ [BoosterEngine] User ${newMember.user.tag} resumed boosting ${newMember.guild.name}. Grace period cleared!`);
            }
        }
    }

    /**
     * Gateway Observer: Member Departure
     */
    async handleMemberRemove(member) {
        // If the booster who owned the role left the server
        const ownerDoc = await BoosterRole.findOne({ guildId: member.guild.id, userId: member.id });
        if (ownerDoc) {
            const role = member.guild.roles.cache.get(ownerDoc.roleId);
            if (role) {
                await role.delete('Booster departed from server').catch(() => {});
            }
            await ownerDoc.deleteOne();
            console.log(`🗑️ [BoosterEngine] Deleted custom booster role ${ownerDoc.name} because owner ${member.id} left the server.`);
            return;
        }

        // If a shared friend left the server, remove them from the owner's document
        await BoosterRole.updateMany(
            { guildId: member.guild.id, sharedWith: member.id },
            { $pull: { sharedWith: member.id } }
        );
    }

    /**
     * Gateway Observer: Role Delete
     */
    async handleRoleDelete(role) {
        await BoosterRole.deleteOne({ guildId: role.guild.id, roleId: role.id });
    }

    /**
     * Background Worker: Clean up roles where grace period expired
     */
    async reconcileExpiredGraces() {
        try {
            const now = new Date();
            const expiredDocs = await BoosterRole.find({
                graceExpiresAt: { $ne: null, $lte: now }
            });

            for (const doc of expiredDocs) {
                const guild = this.client.guilds.cache.get(doc.guildId);
                if (guild) {
                    const role = guild.roles.cache.get(doc.roleId);
                    if (role) {
                        await role.delete('Booster grace period expired without re-boosting').catch(() => {});
                    }
                }
                await doc.deleteOne();
                console.log(`🧹 [BoosterEngine] Reaped expired booster role [${doc.name}] in guild [${doc.guildId}]`);
            }
        } catch (reapErr) {
            console.error('[BoosterEngine] Error reconciling expired booster roles:', reapErr);
        }
    }
}

const boosterRoleEngine = new BoosterRoleEngine();

module.exports = (client, app) => {
    boosterRoleEngine.init(client);
    return boosterRoleEngine;
};

module.exports.engine = boosterRoleEngine;
