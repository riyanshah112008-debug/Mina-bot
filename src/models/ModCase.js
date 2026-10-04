const mongoose = require('mongoose');

const modCaseSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    caseId: { type: Number, required: true },
    action: { type: String, required: true, uppercase: true }, // BAN, KICK, MUTE, TIMEOUT, WARN, UNBAN, PREBAN
    targetId: { type: String, required: true, index: true },
    targetTag: { type: String, default: 'Unknown User' },
    moderatorId: { type: String, required: true, index: true },
    moderatorTag: { type: String, default: 'Unknown Moderator' },
    reason: { type: String, default: 'No reason provided' },
    duration: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, index: true }
});

modCaseSchema.index({ guildId: 1, caseId: 1 }, { unique: true });
modCaseSchema.index({ guildId: 1, moderatorId: 1 });

// Helper to log a mod case and automatically increment caseId per guild
modCaseSchema.statics.logCase = async function(data) {
    try {
        const lastCase = await this.findOne({ guildId: data.guildId }).sort({ caseId: -1 });
        const nextCaseId = lastCase ? lastCase.caseId + 1 : 1;
        const newCase = await this.create({
            ...data,
            caseId: nextCaseId
        });
        return newCase;
    } catch (err) {
        console.error('Failed to log ModCase:', err.message);
        return null;
    }
};

module.exports = mongoose.models.ModCase || mongoose.model('ModCase', modCaseSchema);
