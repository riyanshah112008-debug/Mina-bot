const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    nsfwDmEnabled: { type: Boolean, default: false },
    preferredPrefix: { type: String, default: ',' },
    notifications: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.UserSettings || mongoose.model('UserSettings', userSettingsSchema);
