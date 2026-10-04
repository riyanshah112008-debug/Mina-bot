// ==========================================
// 🌌 STARRY ASTRAL PORTAL MODEL
// File Path: src/models/AstralPortal.js
// MongoDB Schema for Encrypted Inter-Server Holographic Wormholes
// ==========================================
const mongoose = require('mongoose');

const portalChannelSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    guildName: { type: String, default: 'Unknown Server' },
    channelId: { type: String, required: true },
    channelName: { type: String, default: 'portal-room' },
    iconURL: { type: String, default: null },
    webhookId: { type: String, default: null },
    webhookToken: { type: String, default: null },
    joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const astralPortalSchema = new mongoose.Schema({
    portalCode: { type: String, required: true, unique: true, index: true, uppercase: true },
    name: { type: String, default: 'Astral Wormhole' },
    type: { type: String, enum: ['direct', 'hub'], default: 'direct' },
    ownerGuildId: { type: String, required: true },
    ownerUserId: { type: String, required: true },
    active: { type: Boolean, default: true },
    channels: { type: [portalChannelSchema], default: [] },
    totalMessages: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.AstralPortal || mongoose.model('AstralPortal', astralPortalSchema);
