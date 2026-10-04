const mongoose = require('mongoose');

const NitroClaimSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    code: { type: String, required: true },
    giftType: { type: String, default: 'Discord Nitro' },
    senderId: { type: String, required: true },
    senderTag: { type: String, default: 'Unknown' },
    claimerId: { type: String, default: 'Unknown' },
    claimerTag: { type: String, default: 'Unknown' },
    claimedAt: { type: Date, default: Date.now },
    speedMs: { type: Number, default: 0 },
    status: { type: String, enum: ['claimed', 'unclaimed', 'expired', 'invalid'], default: 'claimed' }
}, {
    timestamps: true
});

module.exports = mongoose.models.NitroClaim || mongoose.model('NitroClaim', NitroClaimSchema);
