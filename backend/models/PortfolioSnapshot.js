const mongoose = require('mongoose');

/**
 * Portfolio Snapshot Schema - Daily portfolio value snapshots for charting
 */
const snapshotSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    totalValue: {
        type: Number,
        default: 0,
    },
    totalInvested: {
        type: Number,
        default: 0,
    },
    profitLoss: {
        type: Number,
        default: 0,
    },
    profitLossPercent: {
        type: Number,
        default: 0,
    },
    holdingCount: {
        type: Number,
        default: 0,
    },
    riskScore: {
        type: Number,
        default: 0,
    },
    holdings: [
        {
            symbol: String,
            value: Number,
            weight: Number,
        },
    ],
});

snapshotSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('PortfolioSnapshot', snapshotSchema);
