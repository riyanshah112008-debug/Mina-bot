// ==========================================
// 🚀 STARRY BOOSTER ROLE SCHEMA
// File Path: src/models/BoosterRole.js
// Multi-Tenant Shared Custom Booster Role System ("Booster Synergy Engine")
// ==========================================
const mongoose = require('mongoose');

const boosterRoleSchema = new mongoose.Schema({
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
        required: true, 
        unique: true,
        index: true 
    },
    name: { 
        type: String, 
        required: true, 
        trim: true,
        maxlength: 100 
    },
    color: { 
        type: String, 
        default: '#FF73FA',
        trim: true
    },
    icon: { 
        type: String, 
        default: null 
    },
    sharedWith: {
        type: [String],
        default: [],
        validate: [
            function(val) {
                return Array.isArray(val) && val.length <= 15;
            },
            'Shared friend count cannot exceed hard limit of 15.'
        ]
    },
    maxShares: { 
        type: Number, 
        default: 1,
        min: 1,
        max: 15
    },
    active: { 
        type: Boolean, 
        default: true 
    },
    unboostDetectedAt: { 
        type: Date, 
        default: null 
    },
    graceExpiresAt: { 
        type: Date, 
        default: null 
    }
}, { 
    timestamps: true 
});

// Ensure a user can only own one custom booster role per guild
boosterRoleSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.models.BoosterRole || mongoose.model('BoosterRole', boosterRoleSchema);
