const mongoose = require('mongoose');

const paymentOrderSchema = new mongoose.Schema({
    orderId: { 
        type: String, 
        required: true, 
        unique: true, 
        uppercase: true, 
        trim: true, 
        index: true 
    },
    userId: { type: String, default: null },
    userTag: { type: String, default: 'Web Guest' },
    guildId: { type: String, default: null },
    guildName: { type: String, default: '' },
    tier: { 
        type: String, 
        required: true, 
        enum: ['shield_plus', 'pro_cluster', 'lifetime'] 
    },
    tierName: { type: String, default: '' },
    amountInr: { type: Number, required: true },
    amountUsd: { type: Number, required: true },
    durationDays: { type: Number, default: 30 },
    method: { 
        type: String, 
        required: true, 
        default: 'crypto',
        enum: ['crypto', 'paypal', 'upi', 'card']
    },
    cryptoCoin: { type: String, default: 'usdt_trc20' }, // 'usdt_trc20', 'sol', 'btc', 'eth', 'usdt_bep20', 'ltc'
    status: { 
        type: String, 
        enum: ['pending', 'verifying', 'completed', 'rejected', 'cancelled'], 
        default: 'pending',
        index: true 
    },
    utr: { 
        type: String, 
        default: null, 
        trim: true, 
        uppercase: true,
        sparse: true 
    },
    notes: { type: String, default: '' },
    licenseKey: { type: String, default: null },
    paymentDetails: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    verifiedBy: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.models.PaymentOrder || mongoose.model('PaymentOrder', paymentOrderSchema);
