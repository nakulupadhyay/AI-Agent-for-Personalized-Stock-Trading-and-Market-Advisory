const mongoose = require('mongoose');

/**
 * Prediction Schema - Stores AI market predictions for backtesting
 */
const predictionSchema = new mongoose.Schema({
    symbol: {
        type: String,
        required: true,
        index: true,
    },
    predictedAt: {
        type: Date,
        default: Date.now,
    },
    predictions: {
        day1: {
            direction: { type: String, enum: ['BUY', 'SELL', 'HOLD'] },
            confidence: { type: Number, min: 0, max: 100 },
            targetPrice: Number,
        },
        week1: {
            direction: { type: String, enum: ['BUY', 'SELL', 'HOLD'] },
            confidence: { type: Number, min: 0, max: 100 },
            targetPrice: Number,
        },
        month1: {
            direction: { type: String, enum: ['BUY', 'SELL', 'HOLD'] },
            confidence: { type: Number, min: 0, max: 100 },
            targetPrice: Number,
        },
    },
    actualOutcome: {
        day1: { actualPrice: Number, wasCorrect: Boolean },
        week1: { actualPrice: Number, wasCorrect: Boolean },
        month1: { actualPrice: Number, wasCorrect: Boolean },
    },
    features: {
        priceSignal: Number,
        sentimentScore: Number,
        volumeSignal: Number,
        technicalIndicators: mongoose.Schema.Types.Mixed,
    },
    modelVersion: {
        type: String,
        default: '1.0',
    },
});

predictionSchema.index({ symbol: 1, predictedAt: -1 });

module.exports = mongoose.model('Prediction', predictionSchema);
