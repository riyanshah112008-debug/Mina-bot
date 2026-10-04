const mongoose = require('mongoose');

const premiumKeySchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, uppercase: true, trim: true },
    tier: { type: String, default: 'pro_cluster' }, // 'shield_plus' | 'pro_cluster' | 'lifetime' | 'pro' | 'supreme'
    durationDays: { type: Number, default: 30 }, // 30, 90, 365, or -1 for lifetime
    maxUses: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    redeemedBy: [{
        userId: String,
        guildId: String,
        redeemedAt: { type: Date, default: Date.now }
    }],
    createdBy: { type: String, default: 'System' },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null }, // Null = never expires before use
    active: { type: Boolean, default: true }
});

module.exports = mongoose.models.PremiumKey || mongoose.model('PremiumKey', premiumKeySchema);
