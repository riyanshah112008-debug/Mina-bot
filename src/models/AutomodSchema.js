const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: true }
});

const channelSchema = new mongoose.Schema({
    channelId: { type: String, required: true, unique: true },
    guildId: { type: String, index: true },
    links: { type: Boolean, default: false },   // true = ignore/allow links (filter disabled)
    emojis: { type: Boolean, default: false },  // true = ignore/allow emojis (filter disabled)
    updatedAt: { type: Date, default: Date.now }
});

module.exports = {
    // This makes sure Mongoose doesn't crash if it tries to load the model twice
    AutomodGuild: mongoose.models.AutomodGuild || mongoose.model('AutomodGuild', guildSchema),
    AutomodChannel: mongoose.models.AutomodChannel || mongoose.model('AutomodChannel', channelSchema)
};
