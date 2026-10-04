// ==========================================
// 🎙️ STARRY VOICE CHANNEL MODERATION MODEL
// File Path: src/models/VoiceModerationConfig.js
// MongoDB Schema for Real-Time Voice Moderation & AI Abuse Detection
// ==========================================
const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String, default: 'Unknown' },
    channelId: { type: String, default: '' },
    channelName: { type: String, default: 'Voice Channel' },
    category: { type: String, default: 'verbal_abuse' }, // fighting, verbal_abuse, harassment, threats
    severity: { type: String, default: 'medium' }, // low, medium, high, critical
    transcription: { type: String, default: '' },
    reason: { type: String, default: '' },
    actionTaken: { type: String, default: 'log' },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

const voiceModerationConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true, index: true },
    enabled: { type: Boolean, default: false },
    logChannelId: { type: String, default: null },
    action: { 
        type: String, 
        enum: ['log', 'warn', 'mute', 'disconnect', 'timeout'], 
        default: 'warn' 
    },
    muteDuration: { type: Number, default: 300 }, // in seconds (5 min default)
    timeoutDuration: { type: Number, default: 300 }, // in seconds (5 min default)
    sensitivity: { 
        type: String, 
        enum: ['strict', 'standard', 'severe'], 
        default: 'standard' 
    },
    audioWarning: { type: Boolean, default: true }, // Whether bot speaks a warning in VC
    autoJoinChannels: { type: [String], default: [] },
    ignoredRoles: { type: [String], default: [] },
    totalViolations: { type: Number, default: 0 },
    stats: {
        fighting: { type: Number, default: 0 },
        verbalAbuse: { type: Number, default: 0 },
        harassment: { type: Number, default: 0 },
        threats: { type: Number, default: 0 }
    },
    recentIncidents: { type: [incidentSchema], default: [] }
}, { timestamps: true });

// Prevent model overwrite on reload
module.exports = mongoose.models.VoiceModerationConfig || mongoose.model('VoiceModerationConfig', voiceModerationConfigSchema);
