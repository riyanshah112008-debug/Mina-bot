const mongoose = require('mongoose');

/**
 * ExecutionLock Schema
 * Provides cluster-wide and multi-process distributed atomic deduplication locks.
 * Guarantees that even if multiple bot instances (e.g. Render cloud + Termux PM2, or multiple worker bots)
 * receive the exact same Discord gateway event, only ONE instance acquires the lock and replies.
 */
const ExecutionLockSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Discord Snowflake (message.id or interaction.id)
    instance: { type: String, default: 'primary' },
    createdAt: { type: Date, default: Date.now, expires: 45 } // Auto-cleans in 45 seconds via MongoDB TTL index
});

module.exports = mongoose.models.ExecutionLock || mongoose.model('ExecutionLock', ExecutionLockSchema);
