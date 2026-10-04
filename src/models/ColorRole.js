// ==========================================
// 🎨 STARRY HEX BLEND & NAME COLOR SCHEMA
// File Path: src/models/ColorRole.js
// Multi-Tenant Custom Vanity Color Model
// Supports: No-Role Server Profile Mode, Shared Role Pool, Hex Blends, Presets
// ==========================================
const mongoose = require('mongoose');

const colorRoleSchema = new mongoose.Schema({
    guildId: { 
        type: String, 
        required: true, 
        index: true 
    },
    userId: { 
        type: String, 
        required: true, 
        index: true 
    },
    roleId: { 
        type: String, 
        default: null,
        index: true 
    },
    applyMode: {
        type: String,
        enum: ['shared', 'profile', 'personal'],
        default: 'shared'
    },
    colorType: {
        type: String,
        enum: ['blend', 'solid', 'gradient', 'preset', 'random', 'profile', 'no_role'],
        default: 'blend'
    },
    primaryColor: { 
        type: String, 
        required: true,
        trim: true
    },
    secondaryColor: { 
        type: String, 
        default: null,
        trim: true
    },
    blendedColor: { 
        type: String, 
        required: true,
        trim: true
    },
    ratio: {
        type: Number,
        default: 50,
        min: 0,
        max: 100
    },
    presetName: {
        type: String,
        default: null,
        trim: true
    },
    originalNickname: {
        type: String,
        default: null
    },
    isNativeGradient: {
        type: Boolean,
        default: false
    },
    active: { 
        type: Boolean, 
        default: true 
    }
}, { 
    timestamps: true 
});

// Compound unique index: each user has at most one active color configuration per guild
colorRoleSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.models.ColorRole || mongoose.model('ColorRole', colorRoleSchema);
