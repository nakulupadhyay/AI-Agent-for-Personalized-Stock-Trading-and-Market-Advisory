const mongoose = require('mongoose');

/**
 * Stock Cache Schema - Caches market data to reduce API calls
 */
const stockCacheSchema = new mongoose.Schema({
    symbol: {
        type: String,
        required: true,
        index: true,
    },
    dataType: {
        type: String,
        enum: ['quote', 'daily', 'weekly', 'search'],
        required: true,
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    fetchedAt: {
        type: Date,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 },
    },
});

// Compound index for efficient lookups
stockCacheSchema.index({ symbol: 1, dataType: 1 }, { unique: true });

module.exports = mongoose.model('StockCache', stockCacheSchema);
