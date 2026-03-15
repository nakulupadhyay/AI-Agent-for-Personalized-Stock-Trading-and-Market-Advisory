const mongoose = require('mongoose');

/**
 * Portfolio Schema - Tracks user's stock holdings
 */
const portfolioSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    holdings: [
        {
            symbol: {
                type: String,
                required: true,
            },
            companyName: {
                type: String,
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                min: 0,
            },
            averagePrice: {
                type: Number,
                required: true,
            },
            currentPrice: {
                type: Number,
                default: 0,
            },
        },
    ],
    totalInvested: {
        type: Number,
        default: 0,
    },
    currentValue: {
        type: Number,
        default: 0,
    },
    profitLoss: {
        type: Number,
        default: 0,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

portfolioSchema.index({ userId: 1 });

module.exports = mongoose.model('Portfolio', portfolioSchema);
