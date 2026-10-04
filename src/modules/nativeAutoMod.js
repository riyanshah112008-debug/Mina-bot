// ==========================================
// 🛡️ STARRY NATIVE DISCORD AUTOMOD ENGINE
// File Path: src/modules/nativeAutoMod.js
// Native Discord AutoMod Rule Management & "Uses AutoMod" Profile Badge Automation
// ==========================================
const { 
    AutoModerationRuleTriggerType, 
    AutoModerationRuleEventType, 
    AutoModerationActionType, 
    PermissionFlagsBits,
    Events 
} = require('discord.js');

const TARGET_BADGE_RULES = 100;

// Discord Standard AutoMod Rule Definitions
const RULE_TEMPLATES = [
    {
        key: 'invite',
        name: 'Starry Guard — Anti-Phishing & Invites',
        eventType: AutoModerationRuleEventType.MessageSend,
        triggerType: AutoModerationRuleTriggerType.Keyword,
        triggerMetadata: {
            keywordFilter: ['*discord.gg/*', '*discord.com/invite/*', '*bit.ly/*', '*grabify.link/*']
        },
        actions: [{
            type: AutoModerationActionType.BlockMessage,
            metadata: { customMessage: '🛡️ Unauthorized server invite blocked by Starry AutoMod.' }
        }],
        enabled: true
    },
    {
        key: 'nitro',
        name: 'Starry Guard — Anti-Scam & Fake Nitro',
        eventType: AutoModerationRuleEventType.MessageSend,
        triggerType: AutoModerationRuleTriggerType.Keyword,
        triggerMetadata: {
            keywordFilter: ['*free nitro*', '*steam nitro*', '*discord gift*free*', '*discrod*', '*dlscord*']
        },
        actions: [{
            type: AutoModerationActionType.BlockMessage,
            metadata: { customMessage: '🛡️ Suspected scam link blocked by Starry AutoMod.' }
        }],
        enabled: true
    },
    {
        key: 'social',
        name: 'Starry Guard — Anti-External Redirects',
        eventType: AutoModerationRuleEventType.MessageSend,
        triggerType: AutoModerationRuleTriggerType.Keyword,
        triggerMetadata: {
            keywordFilter: ['*t.me/*', '*telegram.me/*', '*wa.me/*']
        },
        actions: [{
            type: AutoModerationActionType.BlockMessage,
            metadata: { customMessage: '🛡️ External redirect link blocked by Starry AutoMod.' }
        }],
        enabled: true
    },
    {
        key: 'mention',
        name: 'Starry Guard — Mass Mention Protection',
        eventType: AutoModerationRuleEventType.MessageSend,
        triggerType: AutoModerationRuleTriggerType.MentionSpam,
        triggerMetadata: {
            mentionTotalLimit: 5,
            mentionRaidProtectionEnabled: true
        },
        actions: [{
            type: AutoModerationActionType.BlockMessage,
            metadata: { customMessage: '🛡️ Mass mention spam blocked by Starry AutoMod.' }
        }],
        enabled: true
    },
    {
        key: 'spam',
        name: 'Starry Guard — Suspected Spam Shield',
        eventType: AutoModerationRuleEventType.MessageSend,
        triggerType: AutoModerationRuleTriggerType.Spam,
        triggerMetadata: {},
        actions: [{
            type: AutoModerationActionType.BlockMessage,
            metadata: { customMessage: '🛡️ Spam message blocked by Starry AutoMod.' }
        }],
        enabled: true
    }
];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Counts how many native AutoMod rules Starry Bot has created across all guilds.
 */
async function getBadgeProgress(client) {
    if (!client || !client.user) return { totalStarryRules: 0, totalGuilds: 0, target: TARGET_BADGE_RULES };

    const botId = client.user.id;
    let totalStarryRules = 0;
    let totalGuildRules = 0;
    let totalSlotsAvailable = 0;
    let eligibleGuilds = 0;

    const guilds = Array.from(client.guilds.cache.values());

    for (const guild of guilds) {
        try {
            const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
            if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageGuild)) {
                continue;
            }

            eligibleGuilds++;
            const rules = await guild.autoModerationRules.fetch().catch(() => null);
            if (rules) {
                const starryRules = rules.filter(r => r.creatorId === botId);
                totalStarryRules += starryRules.size;
                totalGuildRules += rules.size;
                totalSlotsAvailable += Math.max(0, 6 - rules.size);
            }
        } catch (e) {}
    }

    const percentage = Math.min(100, Math.round((totalStarryRules / TARGET_BADGE_RULES) * 100));
    const remaining = Math.max(0, TARGET_BADGE_RULES - totalStarryRules);
    const estimatedGuildsNeeded = Math.ceil(remaining / 5);

    return {
        totalStarryRules,
        totalGuildRules,
        totalSlotsAvailable,
        eligibleGuilds,
        totalGuilds: guilds.length,
        target: TARGET_BADGE_RULES,
        percentage,
        remaining,
        estimatedGuildsNeeded,
        hasBadge: totalStarryRules >= TARGET_BADGE_RULES
    };
}

/**
 * Deploys Starry native AutoMod rules to a specific guild.
 */
async function deployGuildRules(guild, client) {
    if (!guild || !client || !client.user) return { success: false, reason: 'Invalid parameters' };

    const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return { success: false, reason: 'Missing "Manage Server" permission in this server.' };
    }

    try {
        const existingRules = await guild.autoModerationRules.fetch().catch(() => null);
        if (!existingRules) return { success: false, reason: 'Failed to fetch existing AutoMod rules.' };

        const currentCount = existingRules.size;
        const availableSlots = 6 - currentCount;
        if (availableSlots <= 0) {
            return { success: false, reason: 'Server has already reached Discord\'s limit of 6 AutoMod rules.' };
        }

        let createdCount = 0;
        const existingNames = new Set(existingRules.map(r => r.name.toLowerCase()));
        const existingTriggerTypes = new Set(existingRules.map(r => r.triggerType));

        for (const tmpl of RULE_TEMPLATES) {
            if (currentCount + createdCount >= 6) break;

            // Skip duplicate names
            if (existingNames.has(tmpl.name.toLowerCase())) continue;

            // MentionSpam & Spam allow only 1 rule per guild
            if (tmpl.triggerType === AutoModerationRuleTriggerType.MentionSpam && existingTriggerTypes.has(AutoModerationRuleTriggerType.MentionSpam)) {
                continue;
            }
            if (tmpl.triggerType === AutoModerationRuleTriggerType.Spam && existingTriggerTypes.has(AutoModerationRuleTriggerType.Spam)) {
                continue;
            }

            try {
                await guild.autoModerationRules.create({
                    name: tmpl.name,
                    eventType: tmpl.eventType,
                    triggerType: tmpl.triggerType,
                    triggerMetadata: tmpl.triggerMetadata,
                    actions: tmpl.actions,
                    enabled: tmpl.enabled,
                    reason: 'Starry Supreme AutoMod Engine - Automated Server Protection'
                });
                createdCount++;
                existingTriggerTypes.add(tmpl.triggerType);
                await sleep(400); // Respect rate limits
            } catch (createErr) {
                // If specific trigger type limit reached or permission issue, continue to next
            }
        }

        return { success: true, createdCount, totalRules: currentCount + createdCount };
    } catch (err) {
        return { success: false, reason: err.message };
    }
}

/**
 * Deploys Starry native AutoMod rules to all accessible guilds.
 */
async function deployAllGuilds(client) {
    if (!client || !client.user) return { totalCreated: 0, errors: [] };

    const guilds = Array.from(client.guilds.cache.values());
    let totalCreated = 0;
    let guildsUpdated = 0;
    const errors = [];

    for (const guild of guilds) {
        try {
            const res = await deployGuildRules(guild, client);
            if (res.success && res.createdCount > 0) {
                totalCreated += res.createdCount;
                guildsUpdated++;
            }
            await sleep(500);
        } catch (e) {
            errors.push(`${guild.name}: ${e.message}`);
        }
    }

    const progress = await getBadgeProgress(client);
    return {
        totalCreated,
        guildsUpdated,
        totalStarryRules: progress.totalStarryRules,
        progress,
        errors
    };
}

module.exports = (client) => {
    // Automatically set up native rules on new server joins
    client.on(Events.GuildCreate || 'guildCreate', async (guild) => {
        try {
            await sleep(3000); // Grace period for role assignment
            const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
            if (botMember && botMember.permissions.has(PermissionFlagsBits.ManageGuild)) {
                const res = await deployGuildRules(guild, client);
                if (res.success && res.createdCount > 0) {
                    console.log(`🛡️ [AutoMod Engine] Automatically deployed ${res.createdCount} native AutoMod rules to new server: "${guild.name}"`);
                }
            }
        } catch (e) {}
    });

    console.log('🛡️ Native AutoMod & Badge Automation Module Loaded');
    return {
        getBadgeProgress,
        deployGuildRules,
        deployAllGuilds
    };
};

module.exports.getBadgeProgress = getBadgeProgress;
module.exports.deployGuildRules = deployGuildRules;
module.exports.deployAllGuilds = deployAllGuilds;
