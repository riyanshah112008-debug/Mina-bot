const mongoose = require('mongoose');

const starboardConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, default: null },
    starCount: { type: Number, default: 3 },
    emoji: { type: String, default: '⭐' },
    enabled: { type: Boolean, default: false }
}, { timestamps: true });

const starboardMessageSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    originalMessageId: { type: String, required: true },
    channelId: { type: String, required: true },
    starboardMessageId: { type: String, required: true },
    stars: { type: Number, default: 0 }
}, { timestamps: true });

starboardMessageSchema.index({ guildId: 1, originalMessageId: 1 }, { unique: true });

module.exports = {
    StarboardConfig: mongoose.models.StarboardConfig || mongoose.model('StarboardConfig', starboardConfigSchema),
    StarboardMessage: mongoose.models.StarboardMessage || mongoose.model('StarboardMessage', starboardMessageSchema)
};
