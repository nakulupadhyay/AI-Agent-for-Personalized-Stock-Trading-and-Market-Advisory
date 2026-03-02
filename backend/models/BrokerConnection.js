const mongoose = require('mongoose');

/**
 * Broker Connection Schema - Simulated broker integrations
 */
const brokerConnectionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    broker: {
        type: String,
        enum: ['zerodha', 'groww', 'upstox', 'angelone'],
        required: true,
    },
    status: {
        type: String,
        enum: ['connected', 'disconnected', 'expired', 'syncing'],
        default: 'disconnected',
    },
    accessToken: {
        type: String,
        default: '',
    },
    brokerUserId: {
        type: String,
        default: '',
    },
    connectedAt: {
        type: Date,
    },
    lastSyncAt: {
        type: Date,
    },
    syncedHoldings: [
        {
            symbol: String,
            companyName: String,
            quantity: Number,
            averagePrice: Number,
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

brokerConnectionSchema.index({ userId: 1, broker: 1 }, { unique: true });

module.exports = mongoose.model('BrokerConnection', brokerConnectionSchema);
