// ==========================================
// 🛡️ Starry BOT CONFIGURATION
// ==========================================

module.exports = {
    // Bot Branding & Identity
    BOT_NAME: 'Mina',
    BOT_TAGLINE: 'Intelligent Community, Moderation & Music Suite',
    BOT_VERSION: '2.0.0',

    // Fixed comma prefix by default across the entire bot
    DEFAULT_PREFIX: ',',
    PREFIX: ',',

    // Maximum 32-bit signed integer supported by Node.js event loop (~24.8 days)
    INTERACTION_TIMEOUT: 2147483647,
    ONE_YEAR_MS: 2147483647,

    // Bot owner user IDs for unrestricted administrative access
    get BOT_OWNERS() {
        const defaultOwners = ['1465049039153135639', '1257676837249617971', '1233116813831962737'];
        const set = new Set(defaultOwners);
        if (process.env.OWNER_ID) {
            process.env.OWNER_ID.split(',').map(s => s.trim()).filter(Boolean).forEach(id => set.add(id));
        }
        if (process.env.OWNER_IDS) {
            process.env.OWNER_IDS.split(',').map(s => s.trim()).filter(Boolean).forEach(id => set.add(id));
        }
        if (global.__discordAppOwnerIds && Array.isArray(global.__discordAppOwnerIds)) {
            global.__discordAppOwnerIds.forEach(id => set.add(id));
        }
        return Array.from(set);
    },

    isBotOwner(userId, client = null) {
        if (!userId) return false;
        const uid = String(userId);
        const defaultOwners = ['1465049039153135639', '1257676837249617971', '1233116813831962737'];
        const set = new Set(defaultOwners);
        if (process.env.OWNER_ID) {
            process.env.OWNER_ID.split(',').map(s => s.trim()).filter(Boolean).forEach(id => set.add(id));
        }
        if (process.env.OWNER_IDS) {
            process.env.OWNER_IDS.split(',').map(s => s.trim()).filter(Boolean).forEach(id => set.add(id));
        }
        if (global.__discordAppOwnerIds && Array.isArray(global.__discordAppOwnerIds)) {
            global.__discordAppOwnerIds.forEach(id => set.add(id));
        }
        if (set.has(uid)) return true;

        // Dynamic Discord Application Owner / Team detection
        if (client && client.application?.owner) {
            const appOwner = client.application.owner;
            if (appOwner.id) {
                const ownerId = String(appOwner.id);
                set.add(ownerId);
                if (!global.__discordAppOwnerIds) global.__discordAppOwnerIds = [];
                if (!global.__discordAppOwnerIds.includes(ownerId)) global.__discordAppOwnerIds.push(ownerId);
                if (ownerId === uid) return true;
            }
            if (appOwner.members) {
                if (typeof appOwner.members.has === 'function' && appOwner.members.has(uid)) {
                    if (!global.__discordAppOwnerIds) global.__discordAppOwnerIds = [];
                    if (!global.__discordAppOwnerIds.includes(uid)) global.__discordAppOwnerIds.push(uid);
                    return true;
                }
                if (Array.isArray(appOwner.members)) {
                    for (const m of appOwner.members) {
                        const mId = String(m?.id || m?.userId || m?.user?.id || m);
                        if (!global.__discordAppOwnerIds) global.__discordAppOwnerIds = [];
                        if (!global.__discordAppOwnerIds.includes(mId)) global.__discordAppOwnerIds.push(mId);
                        if (mId === uid) return true;
                    }
                }
            }
        }
        return false;
    },

    // Default Embed Colors
    EMBED_COLORS: {
        PRIMARY: '#5865F2',
        SUCCESS: '#2ECC71',
        WARNING: '#F1C40F',
        DANGER: '#ED4245',
        DARK: '#2B2D31',
        MUSIC: '#1DB954',
        SOCIAL: '#FF79C6',
        ECONOMY: '#F39C12'
    },

    // Multi-bot cluster metadata
    CLUSTER_NAME: 'Starry-Starry-Network',

    // Backward-compatibility getters
    get prefix() {
        if (process.env.BOT_PREFIX) return process.env.BOT_PREFIX;
        if (process.env.PREFIX && !process.env.PREFIX.startsWith('/')) return process.env.PREFIX;
        return '?';
    },
    get theme() {
        return {
            primary: this.EMBED_COLORS.PRIMARY,
            success: this.EMBED_COLORS.SUCCESS,
            warning: this.EMBED_COLORS.WARNING,
            danger: this.EMBED_COLORS.DANGER,
            dark: this.EMBED_COLORS.DARK,
        };
    },
    isOwner(userId, client = null) {
        return this.isBotOwner(userId, client);
    },
    validate() {
        return true;
    },
    sanitizeToken(token) {
        if (!token) return '';
        let t = String(token).trim();
        t = t.replace(/^["']|["']$/g, '');
        t = t.replace(/\r?\n|\r/g, '');
        t = t.replace(/^Bot\s+/i, '');
        t = t.replace(/^["']|["']$/g, '');
        t = t.replace(/\s+/g, '');
        t = t.replace(/[\u200B-\u200D\uFEFF]/g, '');
        return t.trim();
    }
};
