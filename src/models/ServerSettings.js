const mongoose = require('mongoose');

const serverSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: ',' },
    triggerWord: { type: String, default: 'Starry' },
    language: { type: String, default: 'en' },
    
    // 🛡️ Starry Anti-Nuke & Security Guard Shield
    antinuke: {
        enabled: { type: Boolean, default: true },
        maxChannelDeletions: { type: Number, default: 3 },
        maxRoleDeletions: { type: Number, default: 3 },
        maxBans: { type: Number, default: 3 },
        maxKicks: { type: Number, default: 3 },
        blockUnapprovedBots: { type: Boolean, default: true },
        blockWebhookCreation: { type: Boolean, default: true },
        quarantineRoleId: { type: String, default: '' },
        action: { type: String, default: 'quarantine' }, // 'quarantine' | 'timeout' | 'kick' | 'ban'
        whitelistedUsers: { type: [String], default: [] },
        whitelistedRoles: { type: [String], default: [] },
        panicLockdown: { type: Boolean, default: false }
    },

    // 🤖 Starry AutoMod Pro
    automod: {
        enabled: { type: Boolean, default: true },
        antiSpam: { type: Boolean, default: true },
        spamThreshold: { type: Number, default: 5 }, // max messages per 5s
        antiMassPing: { type: Boolean, default: true },
        pingLimit: { type: Number, default: 5 },
        antiInvite: { type: Boolean, default: true },
        antiLink: { type: Boolean, default: false },
        antiScam: { type: Boolean, default: true },
        antiCaps: { type: Boolean, default: false },
        capsThreshold: { type: Number, default: 70 }, // % caps
        antiEmojiSpam: { type: Boolean, default: false },
        emojiLimit: { type: Number, default: 6 },
        ghostPingDetector: { type: Boolean, default: true },
        ignoredChannels: { type: [String], default: [] },
        ignoredRoles: { type: [String], default: [] },
        punishment: { type: String, default: 'timeout' } // 'timeout' | 'delete' | 'warn' | 'kick' | 'ban'
    },

    // 👑 Starry Verification & Gatekeeper Gateway
    verification: {
        enabled: { type: Boolean, default: false },
        roleId: { type: String, default: '' },
        unverifiedRoleId: { type: String, default: '' },
        captchaType: { type: String, default: 'web' }, // 'web' | 'button' | 'math'
        channelId: { type: String, default: '' },
        minAccountAgeDays: { type: Number, default: 3 },
        requireAvatar: { type: Boolean, default: false },
        autoKickUnverifiedMinutes: { type: Number, default: 0 } // 0 = disabled
    },

    // 🏷️ Starry AutoRoles & Sticky Roles
    autorole: {
        memberRoles: { type: [String], default: [] },
        botRoles: { type: [String], default: [] },
        stickyRoles: { type: Boolean, default: true }
    },

    // 📜 Starry Audit & Security Telemetry Logging
    logging: {
        modLogChannel: { type: String, default: '' },
        messageLogChannel: { type: String, default: '' },
        voiceLogChannel: { type: String, default: '' },
        memberLogChannel: { type: String, default: '' },
        serverLogChannel: { type: String, default: '' }
    },

    // 🎵 Starry Studio & 24/7 Music Settings
    music: {
        defaultVolume: { type: Number, default: 100 },
        is247: { type: Boolean, default: false },
        voiceChannelId: { type: String, default: '' },
        djRoleId: { type: String, default: '' },
        defaultFilter: { type: String, default: 'clear' }
    },

    // 🎫 Starry Support Tickets
    tickets: {
        enabled: { type: Boolean, default: false },
        categoryId: { type: String, default: '' },
        supportRoleId: { type: String, default: '' },
        transcriptsChannel: { type: String, default: '' },
        panelChannelId: { type: String, default: '' }
    },

    // 🔞 NSFW / Mature Anime Module Settings (Default OFF for all servers and DMs)
    nsfw: {
        enabled: { type: Boolean, default: false },
        allowedChannels: { type: [String], default: [] },
        allowInDMs: { type: Boolean, default: false }
    },

    // 💎 Starry Premium Tier
    premium: {
        isPremium: { type: Boolean, default: false },
        tier: { type: String, default: 'none' }, // 'none' | 'shield_plus' | 'pro_cluster' | 'lifetime'
        expiresAt: { type: Date, default: null },
        activatedBy: { type: String, default: null },
        customBotToken: { type: String, default: null }
    },

    // 🎨 Embed Visuality & Theme Settings
    embedTheme: {
        color: { type: String, default: '#5865F2' },
        footer: { type: String, default: '' },
        footerIcon: { type: String, default: '' },
        authorName: { type: String, default: '' },
        authorIcon: { type: String, default: '' }
    },

    // 🚀 Starry Shared Booster Role Engine ("Booster Synergy")
    boosterRoleSystem: {
        enabled: { type: Boolean, default: true },
        anchorRoleId: { type: String, default: '' },      // Upper boundary role in hierarchy
        logChannelId: { type: String, default: '' },      // Log channel for booster role events
        defaultMaxShares: { type: Number, default: 1 },   // Free tier max friends per booster
        premiumMaxShares: { type: Number, default: 5 },   // Premium server max friends per booster
        allowIcons: { type: Boolean, default: true },      // Allow role icons
        gracePeriodDays: { type: Number, default: 3 }     // Grace days when boost is cancelled
    },

    // 🎨 Custom Hex Blend & Name Color System (No boosts required)
    colorRoleSystem: {
        enabled: { type: Boolean, default: true },
        mode: { type: String, default: 'shared' },        // 'shared' (pooled roles), 'profile' (no roles!), 'personal'
        anchorRoleId: { type: String, default: '' },      // Upper boundary role in hierarchy
        allowEveryone: { type: Boolean, default: true },   // Whether all members can use without booster status
        allowedRoles: { type: [String], default: [] }      // Specific roles allowed if allowEveryone is false
    }
}, { timestamps: true });

module.exports = mongoose.models.ServerSettings || mongoose.model('ServerSettings', serverSettingsSchema);
