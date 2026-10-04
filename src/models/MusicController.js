// ==========================================
// 🎵 MUSIC CONTROLLER CONFIG SCHEMA
// File Path: src/models/MusicController.js
// Stores persistent music request channel and message configurations per guild
// ==========================================
const mongoose = require('mongoose');

const musicControllerSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true, index: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    bannerUrl: { type: String, default: '' },
    likedTracks: [{
        title: String,
        author: String,
        url: String,
        addedBy: String,
        addedAt: { type: Date, default: Date.now }
    }],
    blockedTracks: [{
        query: String,
        blockedBy: String,
        blockedAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.models.MusicController || mongoose.model('MusicController', musicControllerSchema);
