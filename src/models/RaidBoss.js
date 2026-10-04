// ==========================================
// ⚔️ STARRY ASTRAL RAID BOSS MODEL
// File Path: src/models/RaidBoss.js
// MongoDB Schema for Real-Time Co-Op Server World Boss Raids
// ==========================================
const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String, default: 'Hero' },
    damageDealt: { type: Number, default: 0 },
    actionsCount: { type: Number, default: 0 },
    ultimateUsed: { type: Boolean, default: false },
    lastActionAt: { type: Date, default: Date.now }
}, { _id: false });

const raidBossSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    messageId: { type: String, default: null },
    bossName: { type: String, required: true },
    bossTitle: { type: String, default: 'Celestial World Boss' },
    element: { type: String, enum: ['fire', 'void', 'ice', 'lightning', 'celestial'], default: 'void' },
    level: { type: Number, default: 50 },
    maxHp: { type: Number, required: true },
    currentHp: { type: Number, required: true },
    phase: { type: Number, default: 1 }, // 1 = Normal, 2 = Enraged (<50%), 3 = Desperation (<20%)
    active: { type: Boolean, default: true, index: true },
    imageUrl: { type: String, default: null },
    participants: { type: [participantSchema], default: [] },
    combatLog: { type: [String], default: [] },
    expiresAt: { type: Date, required: true },
    totalRaidsWon: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.models.RaidBoss || mongoose.model('RaidBoss', raidBossSchema);
