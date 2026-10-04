// ==========================================
// 📌 STARRY STICKY MESSAGE MODEL
// File Path: src/models/StickyMessage.js
// Persistent Channel Notice Anchor Schema
// ==========================================
const mongoose = require('mongoose');

const stickyMessageSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    lastMessageId: { type: String, default: null },
    authorId: { type: String, required: true }
}, { timestamps: true });

stickyMessageSchema.index({ guildId: 1, channelId: 1 });

module.exports = mongoose.models.StickyMessage || mongoose.model('StickyMessage', stickyMessageSchema);
