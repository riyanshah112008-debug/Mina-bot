const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    content: { type: String, required: true },
    authorId: { type: String, required: true },
    uses: { type: Number, default: 0 }
}, { timestamps: true });

tagSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = mongoose.models.Tag || mongoose.model('Tag', tagSchema);
