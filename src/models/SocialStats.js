// ==========================================
// 📊 STARRY SOCIAL STATS SCHEMA & DATABASE ENGINE
// File Path: src/models/SocialStats.js
// Tracks hugs, pats, kisses, slaps, highfives shared together
// ==========================================
const mongoose = require('mongoose');

const socialStatsSchema = new mongoose.Schema({
    pairKey: { type: String, required: true }, // sorted userA:userB or userA:solo
    user1: { type: String, required: true },
    user2: { type: String, default: null },
    action: { type: String, required: true },
    count: { type: Number, default: 0 },
    lastUsed: { type: Date, default: Date.now }
});

socialStatsSchema.index({ pairKey: 1, action: 1 }, { unique: true });
socialStatsSchema.index({ user1: 1, user2: 1 });

const SocialStats = mongoose.models.SocialStats || mongoose.model('SocialStats', socialStatsSchema);

const inMemorySocialStats = new Map();

async function incrementSocialCount(userAId, userBId, action) {
    const isPair = !!userBId && userBId !== userAId;
    const pairKey = isPair ? [String(userAId), String(userBId)].sort().join(':') : `${userAId}:solo`;
    const memKey = `${pairKey}_${action}`;
    const nextCount = (inMemorySocialStats.get(memKey) || 0) + 1;
    inMemorySocialStats.set(memKey, nextCount);

    if (mongoose.connection && mongoose.connection.readyState === 1) {
        try {
            const doc = await SocialStats.findOneAndUpdate(
                { pairKey, action },
                { 
                    $inc: { count: 1 },
                    $set: { 
                        user1: String(userAId), 
                        user2: isPair ? String(userBId) : null,
                        lastUsed: new Date() 
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            return doc ? doc.count : nextCount;
        } catch (e) {
            return nextCount;
        }
    }
    return nextCount;
}

async function getSocialCount(userAId, userBId, action) {
    const isPair = !!userBId && userBId !== userAId;
    const pairKey = isPair ? [String(userAId), String(userBId)].sort().join(':') : `${userAId}:solo`;
    const memKey = `${pairKey}_${action}`;

    if (mongoose.connection && mongoose.connection.readyState === 1) {
        try {
            const doc = await SocialStats.findOne({ pairKey, action });
            return doc ? doc.count : (inMemorySocialStats.get(memKey) || 0);
        } catch (e) {
            return inMemorySocialStats.get(memKey) || 0;
        }
    }
    return inMemorySocialStats.get(memKey) || 0;
}

module.exports = {
    SocialStats,
    incrementSocialCount,
    getSocialCount
};
