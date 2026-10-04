const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    guildName: { type: String, default: 'Unknown Guild' },
    
    // Member Velocity Metrics
    joinsThisHour: { type: Number, default: 0 },
    joinsToday: { type: Number, default: 0 },
    lastHourJoinsRecord: { type: Number, default: 0 },
    
    // Voice & Chat Engagement
    totalVcSeconds: { type: Number, default: 0 },
    messagesTotal: { type: Number, default: 0 },
    
    // Security & Moderation Telemetry
    modStats: {
        warns: { type: Number, default: 0 },
        kicks: { type: Number, default: 0 },
        bans: { type: Number, default: 0 },
        automodTriggers: { type: Number, default: 0 }
    },

    // Automated Scheduled Telemetry Preferences
    autoSchedule: {
        enabled: { type: Boolean, default: false },
        intervalHours: { type: Number, default: 6 }, // 6h by default when enabled
        target: { type: String, enum: ['dm', 'channel'], default: 'dm' },
        channelId: { type: String, default: '' },
        lastSent: { type: Date, default: null }
    },

    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.GuildTelemetry || mongoose.model('GuildTelemetry', telemetrySchema);
