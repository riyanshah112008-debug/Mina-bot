const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, default: null },
    channelId: { type: String, required: true },
    remindAt: { type: Date, required: true },
    message: { type: String, required: true },
    isDM: { type: Boolean, default: false },
    completed: { type: Boolean, default: false }
}, { timestamps: true });

reminderSchema.index({ remindAt: 1, completed: 1 });

module.exports = mongoose.models.Reminder || mongoose.model('Reminder', reminderSchema);
