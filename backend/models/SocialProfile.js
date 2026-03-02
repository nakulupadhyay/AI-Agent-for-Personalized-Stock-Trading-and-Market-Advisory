const mongoose = require('mongoose');

/**
 * Social Profile Schema - Public trading profile for leaderboard & social trading
 */
const socialProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    alias: {
        type: String,
        required: true,
        unique: true,
    },
    isPublic: {
        type: Boolean,
        default: false,
    },
    bio: {
        type: String,
        default: '',
        maxlength: 200,
    },
    followers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    following: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    stats: {
        totalTrades: { type: Number, default: 0 },
        winRate: { type: Number, default: 0 },
        roi: { type: Number, default: 0 },
        totalProfitLoss: { type: Number, default: 0 },
        avgHoldingDays: { type: Number, default: 0 },
        bestTrade: { type: Number, default: 0 },
        worstTrade: { type: Number, default: 0 },
    },
    rank: {
        type: Number,
        default: 0,
    },
    badges: [
        {
            name: String,
            icon: String,
            earnedAt: Date,
        },
    ],
    lastCalculated: {
        type: Date,
        default: Date.now,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('SocialProfile', socialProfileSchema);
