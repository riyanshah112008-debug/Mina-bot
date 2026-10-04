const mongoose = require('mongoose');

const tempVoiceConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    lobbyChannelId: { type: String, default: null },
    categoryId: { type: String, default: null },
    namingPattern: { type: String, default: '🎧 {user}\'s Orbit' },
    userLimit: { type: Number, default: 0 },
    enabled: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.models.TempVoiceConfig || mongoose.model('TempVoiceConfig', tempVoiceConfigSchema);
