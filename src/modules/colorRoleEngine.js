// ==========================================
// 🎨 STARRY COLOR ROLE & SERVER PROFILE SYNERGY ENGINE
// File Path: src/modules/colorRoleEngine.js
// Dual-Mode Architecture:
// 1) Zero-Role Server Profile Mode (Direct nickname gradient badge & ANSI truecolor gradient without creating ANY roles)
// 2) Shared Role Pool Mode (Discord Native Gradient primary+secondary colors, pooled to eliminate duplicate/unnecessary roles)
// ==========================================
const { 
    Events, 
    PermissionFlagsBits 
} = require('discord.js');
const ColorRole = require('../models/ColorRole');
const ServerSettings = require('../models/ServerSettings');
const colorBlendEngine = require('../utils/colorBlendEngine');

// Fallback anchor role names for optimal hierarchy positioning
const ANCHOR_CANDIDATE_NAMES = [
    '--- Color Roles ---',
    '--- Booster Roles ---',
    '--- Vanity Roles ---'
];

class ColorRoleEngine {
    constructor() {
        this.client = null;
    }

    /**
     * Initialize event handlers to safeguard against role bloat
     * @param {import('discord.js').Client} client 
     */
    init(client) {
        this.client = client;

        // 1. Clean up role when member leaves server to prevent orphan role accumulation
        client.on(Events.GuildMemberRemove, async (member) => {
            try {
                await this.handleMemberRemove(member);
            } catch (err) {
                console.error('[ColorRoleEngine] Error in GuildMemberRemove:', err);
            }
        });

        // 2. Clean up database record if role is manually deleted by staff
        client.on(Events.GuildRoleDelete, async (role) => {
            try {
                await this.handleRoleDelete(role);
            } catch (err) {
                console.error('[ColorRoleEngine] Error in GuildRoleDelete:', err);
            }
        });

        console.log('🎨 [ColorRoleEngine] Discord Gradient & Server Profile Engine successfully initialized!');
    }

    /**
     * Retrieve server configuration with safe defaults
     * @param {string} guildId 
     */
    async getSettings(guildId) {
        let settings = await ServerSettings.findOne({ guildId }).lean();
        if (!settings) {
            settings = {
                colorRoleSystem: {
                    enabled: true,
                    mode: 'shared', // 'shared' (pooled roles), 'profile' (no roles!), 'personal'
                    anchorRoleId: '',
                    allowEveryone: true,
                    allowedRoles: []
                }
            };
        }
        return settings;
    }

    /**
     * Calculate optimal role hierarchy position
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
            for (const name of ANCHOR_CANDIDATE_NAMES) {
                const found = guild.roles.cache.find(r => r.name.toLowerCase() === name.toLowerCase());
                if (found) {
                    anchorRole = found;
                    break;
                }
            }
        }

        if (anchorRole && botMember.roles.highest.position > anchorRole.position) {
            return Math.max(1, anchorRole.position - 1);
        }

        return Math.max(1, botMember.roles.highest.position - 1);
    }

    /**
     * Verify if a member is authorized to use color commands
     * @param {import('discord.js').GuildMember} member 
     * @param {object} settings 
     */
    isAuthorized(member, settings) {
        if (!member || !member.guild) return false;
        if (member.id === member.guild.ownerId) return true;
        if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

        const config = settings?.colorRoleSystem || {};
        if (config.enabled === false) return false;
        if (config.allowEveryone !== false) return true;

        if (Array.isArray(config.allowedRoles) && config.allowedRoles.length > 0) {
            return config.allowedRoles.some(rId => member.roles.cache.has(rId));
        }

        return true;
    }

    /**
     * Apply or update a color configuration for a member
     * Supports Discord Native Gradient feature (primary + secondary distinct colors)
     * and Zero-Role Server Profile Mode
     * 
     * @param {import('discord.js').Guild} guild 
     * @param {import('discord.js').GuildMember} member 
     * @param {object} options 
     * @param {'blend'|'solid'|'gradient'|'preset'|'random'|'profile'} options.colorType 
     * @param {string} options.primaryColor 
     * @param {string} [options.secondaryColor] 
     * @param {string} [options.tertiaryColor] 
     * @param {number} [options.ratio=50] 
     * @param {string} [options.presetName] 
     * @param {'shared'|'profile'|'personal'} [options.applyMode] 
     */
    async applyColorRole(guild, member, options) {
        const settings = await this.getSettings(guild.id);
        const config = settings?.colorRoleSystem || {};

        if (config.enabled === false) {
            throw new Error('The Name Color system is currently disabled in this server.');
        }

        if (!this.isAuthorized(member, settings)) {
            throw new Error('You do not have permission to use color commands in this server.');
        }

        const primaryHex = colorBlendEngine.parseHex(options.primaryColor);
        if (!primaryHex) {
            throw new Error(`Invalid primary hex color: \`${options.primaryColor}\`. Example: \`#FF0055\``);
        }

        let secondaryHex = null;
        if (options.secondaryColor) {
            secondaryHex = colorBlendEngine.parseHex(options.secondaryColor);
            if (!secondaryHex) {
                throw new Error(`Invalid secondary hex color: \`${options.secondaryColor}\`. Example: \`#00E5FF\``);
            }
        }

        const presetObj = options.presetName ? colorBlendEngine.getPreset(options.presetName) : null;
        const tertiaryHex = options.tertiaryColor ? colorBlendEngine.parseHex(options.tertiaryColor) : (presetObj?.hex3 || null);

        // Calculate blended hex code (for embed swatch & analytics)
        const ratio = typeof options.ratio === 'number' ? Math.max(0, Math.min(100, options.ratio)) : 50;
        const blendedHex = secondaryHex 
            ? colorBlendEngine.blendColors(primaryHex, secondaryHex, ratio)
            : primaryHex;

        // Determine resolution mode: options.applyMode overrides server default config.mode
        let mode = options.applyMode || config.mode || 'shared';
        if (options.colorType === 'profile') mode = 'profile';

        let doc = await ColorRole.findOne({ guildId: guild.id, userId: member.id });

        // Generate ANSI living gradient preview of the user's name
        const memberDisplayName = member.displayName || member.user.username;
        const ansiGradientText = colorBlendEngine.getGradientPreview(memberDisplayName, primaryHex, secondaryHex, tertiaryHex);

        // ==========================================
        // MODE 1: ZERO-ROLE SERVER PROFILE MODE
        // ==========================================
        if (mode === 'profile') {
            // Remove any previous color role the user may have had
            if (doc && doc.roleId) {
                const oldRole = guild.roles.cache.get(doc.roleId);
                if (oldRole) {
                    await member.roles.remove(oldRole).catch(() => {});
                    if (oldRole.name.startsWith('🎨・') && oldRole.members.size === 0) {
                        await oldRole.delete('Starry Color Engine: Purge unused role').catch(() => {});
                    }
                }
            }

            // Strip any existing badge from the member's current display name
            const cleanBase = memberDisplayName.replace(/^[^\w\s\d]+・\s*|^\[[^\s\]]+\]\s*/u, '').trim() || member.user.username;

            // Pick aesthetic dual-gradient badge corresponding to start and end colors
            const gradientBadges = colorBlendEngine.getGradientBadges(primaryHex, secondaryHex, presetObj);

            // Construct new nickname (Max 32 chars Discord limit)
            const targetNickname = `${gradientBadges}・${cleanBase}`.slice(0, 32);
            let nicknameApplied = false;
            let nicknameWarning = null;

            const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);

            if (member.id === guild.ownerId) {
                nicknameWarning = "Discord's API prevents bots from editing the Server Owner's nickname. Your profile gradient theme is active in Starry!";
            } else if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageNicknames)) {
                nicknameWarning = "Starry lacks `Manage Nicknames` permission to update your server profile nickname.";
            } else if (botMember.roles.highest.position <= member.roles.highest.position) {
                nicknameWarning = "Your highest role is higher than or equal to Starry's role, so Starry cannot edit your nickname.";
            } else {
                try {
                    await member.setNickname(targetNickname, 'Starry Color Engine: Applied zero-role gradient server profile');
                    nicknameApplied = true;
                } catch (nickErr) {
                    nicknameWarning = `Could not update server nickname: ${nickErr.message}`;
                }
            }

            // Persist or update database record
            if (doc) {
                doc.applyMode = 'profile';
                doc.roleId = null;
                doc.colorType = options.colorType || 'profile';
                doc.primaryColor = primaryHex;
                doc.secondaryColor = secondaryHex;
                doc.blendedColor = blendedHex;
                doc.ratio = ratio;
                doc.presetName = options.presetName || null;
                if (!doc.originalNickname) doc.originalNickname = cleanBase;
                doc.active = true;
                await doc.save();
            } else {
                doc = await ColorRole.create({
                    guildId: guild.id,
                    userId: member.id,
                    roleId: null,
                    applyMode: 'profile',
                    colorType: options.colorType || 'profile',
                    primaryColor: primaryHex,
                    secondaryColor: secondaryHex,
                    blendedColor: blendedHex,
                    ratio: ratio,
                    presetName: options.presetName || null,
                    originalNickname: cleanBase,
                    active: true
                });
            }

            return {
                mode: 'profile',
                primaryHex,
                secondaryHex,
                tertiaryHex,
                blendedHex,
                ratio,
                gradientBadges,
                ansiGradientText,
                newNickname: targetNickname,
                nicknameApplied,
                nicknameWarning,
                doc,
                readability: colorBlendEngine.analyzeDiscordReadability(primaryHex)
            };
        }

        // ==========================================
        // MODE 2: SHARED ROLE POOL MODE (DISCORD NATIVE GRADIENT)
        // ==========================================
        const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
        if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            throw new Error('Starry requires the `Manage Roles` permission to manage gradient roles.');
        }

        const sharedRoleName = presetObj 
            ? `🎨・${presetObj.name}` 
            : (secondaryHex ? `🎨・${primaryHex}➔${secondaryHex}` : `🎨・${primaryHex}`);

        // Look for an existing shared role with this exact name
        let targetRole = guild.roles.cache.find(r => r.name === sharedRoleName);

        let createdNewRole = false;
        let appliedNativeGradient = false;

        if (!targetRole) {
            // Guard against Discord 250 guild roles limit
            if (guild.roles.cache.size >= 249) {
                throw new Error('This Discord server has reached its maximum role limit (250 roles). Please use `,color profile` for zero-role mode!');
            }

            const targetPosition = await this.calculateSafeRolePosition(guild, config.anchorRoleId);

            const rolePayload = {
                name: sharedRoleName,
                permissions: 0n,
                hoist: false,
                mentionable: false,
                position: targetPosition,
                reason: `Starry Gradient Role: ${sharedRoleName}`
            };

            // Apply Discord Native Gradient structure (primaryColor + secondaryColor)
            if (secondaryHex) {
                rolePayload.colors = {
                    primaryColor: primaryHex,
                    secondaryColor: secondaryHex,
                    tertiaryColor: tertiaryHex || null
                };
            } else {
                rolePayload.colors = {
                    primaryColor: primaryHex,
                    secondaryColor: null,
                    tertiaryColor: null
                };
            }

            try {
                targetRole = await guild.roles.create(rolePayload);
                if (secondaryHex) appliedNativeGradient = true;
            } catch (roleErr) {
                // If API rejected secondary_color because guild lacks Enhanced Role Colors perk (3 boosts),
                // fall back to Discord's official fallback: primaryColor as the base solid role color
                if (rolePayload.colors && rolePayload.colors.secondaryColor) {
                    rolePayload.colors.secondaryColor = null;
                    rolePayload.colors.tertiaryColor = null;
                    targetRole = await guild.roles.create(rolePayload);
                    appliedNativeGradient = false;
                } else {
                    throw roleErr;
                }
            }

            if (targetRole.position < targetPosition) {
                await targetRole.setPosition(targetPosition).catch(() => {});
            }

            createdNewRole = true;
        }

        // Remove user's previous color role if different
        if (doc && doc.roleId && doc.roleId !== targetRole.id) {
            const oldRole = guild.roles.cache.get(doc.roleId);
            if (oldRole) {
                await member.roles.remove(oldRole).catch(() => {});
                // Auto-cleanup: If old role now has zero members, delete it to keep server spotless
                if (oldRole.name.startsWith('🎨・') && oldRole.members.size === 0) {
                    await oldRole.delete('Starry Color Engine: Purge unused shared role').catch(() => {});
                }
            }
        }

        // Assign target shared role to member
        if (!member.roles.cache.has(targetRole.id)) {
            await member.roles.add(targetRole, 'Starry Color Engine: Assigned gradient role');
        }

        // Update database doc
        if (doc) {
            doc.applyMode = 'shared';
            doc.roleId = targetRole.id;
            doc.colorType = options.colorType || (secondaryHex ? 'gradient' : 'solid');
            doc.primaryColor = primaryHex;
            doc.secondaryColor = secondaryHex;
            doc.blendedColor = blendedHex;
            doc.ratio = ratio;
            doc.presetName = options.presetName || null;
            doc.isNativeGradient = appliedNativeGradient;
            doc.active = true;
            await doc.save();
        } else {
            doc = await ColorRole.create({
                guildId: guild.id,
                userId: member.id,
                roleId: targetRole.id,
                applyMode: 'shared',
                colorType: options.colorType || (secondaryHex ? 'gradient' : 'solid'),
                primaryColor: primaryHex,
                secondaryColor: secondaryHex,
                blendedColor: blendedHex,
                ratio: ratio,
                presetName: options.presetName || null,
                isNativeGradient: appliedNativeGradient,
                active: true
            });
        }

        return {
            mode: 'shared',
            role: targetRole,
            doc,
            primaryHex,
            secondaryHex,
            tertiaryHex,
            blendedHex,
            ratio,
            ansiGradientText,
            createdNewRole,
            sharedMembersCount: targetRole.members.size,
            appliedNativeGradient,
            readability: colorBlendEngine.analyzeDiscordReadability(primaryHex)
        };
    }

    /**
     * Remove custom color from a member (supports both Profile and Role modes)
     * @param {import('discord.js').Guild} guild 
     * @param {import('discord.js').GuildMember} member 
     */
    async removeColorRole(guild, member) {
        const doc = await ColorRole.findOne({ guildId: guild.id, userId: member.id });

        if (!doc) {
            const untrackedRole = member.roles.cache.find(r => r.name.startsWith('🎨・'));
            if (untrackedRole) {
                await member.roles.remove(untrackedRole).catch(() => {});
                if (untrackedRole.members.size === 0) {
                    await untrackedRole.delete('Starry Color Engine: Cleanup untracked role').catch(() => {});
                }
                return { success: true, mode: 'role', message: 'Removed color role from your profile.' };
            }
            return { success: false, message: 'You do not currently have an active custom color configured.' };
        }

        // If in Profile mode: restore nickname
        if (doc.applyMode === 'profile') {
            if (doc.originalNickname && member.displayName !== doc.originalNickname) {
                await member.setNickname(doc.originalNickname, 'Starry Color Engine: Restored original nickname').catch(() => {});
            } else {
                const cleaned = (member.displayName || '').replace(/^[^\w\s\d]+・\s*|^\[[^\s\]]+\]\s*/u, '').trim();
                await member.setNickname(cleaned || null, 'Starry Color Engine: Restored clean nickname').catch(() => {});
            }
            await doc.deleteOne();
            return { success: true, mode: 'profile', message: 'Removed gradient badge from your Server Profile.' };
        }

        // If in Role/Shared mode: remove role
        if (doc.roleId) {
            const role = guild.roles.cache.get(doc.roleId);
            if (role) {
                await member.roles.remove(role).catch(() => {});
                if (role.name.startsWith('🎨・') && role.members.size === 0) {
                    await role.delete('Starry Color Engine: Purge unused shared role').catch(() => {});
                }
            }
        }

        await doc.deleteOne();
        return { success: true, mode: 'shared', message: 'Removed your custom gradient role.' };
    }

    /**
     * Get member's current color status
     * @param {import('discord.js').Guild} guild 
     * @param {string} userId 
     */
    async getColorRoleStatus(guild, userId) {
        const doc = await ColorRole.findOne({ guildId: guild.id, userId }).lean();
        if (!doc) return null;

        let role = null;
        if (doc.roleId) {
            role = guild.roles.cache.get(doc.roleId) || null;
        }

        return {
            doc,
            role,
            readability: colorBlendEngine.analyzeDiscordReadability(doc.primaryColor || doc.blendedColor)
        };
    }

    /**
     * Handle member departure: automatically unassign/cleanup shared role
     */
    async handleMemberRemove(member) {
        if (!member || !member.guild) return;
        const doc = await ColorRole.findOne({ guildId: member.guild.id, userId: member.id });
        if (!doc) return;

        if (doc.roleId) {
            const role = member.guild.roles.cache.get(doc.roleId);
            if (role && role.name.startsWith('🎨・') && role.members.size === 0) {
                await role.delete('Starry Color Engine: Member departed from server').catch(() => {});
            }
        }
        await doc.deleteOne().catch(() => {});
    }

    /**
     * Handle external role deletion by staff
     */
    async handleRoleDelete(role) {
        if (!role || !role.guild) return;
        await ColorRole.deleteMany({ guildId: role.guild.id, roleId: role.id }).catch(() => {});
    }
}

const colorRoleEngine = new ColorRoleEngine();

const initExport = (client, app) => {
    colorRoleEngine.init(client);
    return colorRoleEngine;
};

for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(colorRoleEngine))) {
    if (key !== 'constructor' && typeof colorRoleEngine[key] === 'function') {
        initExport[key] = colorRoleEngine[key].bind(colorRoleEngine);
    }
}
initExport.engine = colorRoleEngine;
initExport.init = colorRoleEngine.init.bind(colorRoleEngine);

module.exports = initExport;
