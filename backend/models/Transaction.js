const mongoose = require('mongoose');

/**
 * Transaction Schema - Records all buy/sell trades including pending orders
 */
const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type: {
        type: String,
        enum: ['BUY', 'SELL'],
        required: true,
    },
    orderType: {
        type: String,
        enum: ['MARKET', 'LIMIT', 'STOP_LOSS'],
        default: 'MARKET',
    },
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
    },
    price: {
        type: Number,
        required: true,
    },
    limitPrice: {
        type: Number,
    },
    stopLossPrice: {
        type: Number,
    },
    totalAmount: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['EXECUTED', 'PENDING', 'CANCELLED', 'EXPIRED'],
        default: 'EXECUTED',
    },
    executedAt: {
        type: Date,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

transactionSchema.index({ userId: 1, timestamp: -1 });
transactionSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);

