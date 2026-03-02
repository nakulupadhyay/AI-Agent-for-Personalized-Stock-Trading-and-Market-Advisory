const mongoose = require('mongoose');

/**
 * Sentiment Log Schema - Records daily sentiment analysis results
 */
const sentimentLogSchema = new mongoose.Schema({
    symbol: {
        type: String,
        required: true,
        index: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    overallScore: {
        type: Number,
        min: -1,
        max: 1,
        required: true,
    },
    label: {
        type: String,
        enum: ['Bullish', 'Bearish', 'Neutral'],
        required: true,
    },
    newsCount: {
        type: Number,
        default: 0,
    },
    sources: [
        {
            title: String,
            source: String,
            sentiment: { type: String, enum: ['positive', 'negative', 'neutral'] },
            score: Number,
            url: String,
            publishedAt: Date,
        },
    ],
    socialMentions: {
        type: Number,
        default: 0,
    },
});

sentimentLogSchema.index({ symbol: 1, date: -1 });

module.exports = mongoose.model('SentimentLog', sentimentLogSchema);
