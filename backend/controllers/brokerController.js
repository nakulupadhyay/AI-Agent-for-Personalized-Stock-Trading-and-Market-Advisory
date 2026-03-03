/**
 * Broker Integration Controller — Simulated OAuth broker connections
 */
const BrokerConnection = require('../models/BrokerConnection');
const Portfolio = require('../models/Portfolio');
const crypto = require('crypto');

// Mock broker data for simulation
const BROKER_INFO = {
    zerodha: {
        name: 'Zerodha',
        logo: '🟢',
        description: 'India\'s largest stock broker',
        mockHoldings: [
            { symbol: 'RELIANCE', companyName: 'Reliance Industries Ltd', quantity: 10, averagePrice: 2400 },
            { symbol: 'TCS', companyName: 'Tata Consultancy Services', quantity: 5, averagePrice: 3500 },
            { symbol: 'INFY', companyName: 'Infosys Ltd', quantity: 15, averagePrice: 1450 },
        ],
    },
    groww: {
        name: 'Groww',
        logo: '🟡',
        description: 'Commission-free investing',
        mockHoldings: [
            { symbol: 'HDFCBANK', companyName: 'HDFC Bank Limited', quantity: 8, averagePrice: 1600 },
            { symbol: 'ICICIBANK', companyName: 'ICICI Bank Limited', quantity: 12, averagePrice: 950 },
        ],
    },
    upstox: {
        name: 'Upstox',
        logo: '🟣',
        description: 'Trade at flat fees',
        mockHoldings: [
            { symbol: 'WIPRO', companyName: 'Wipro Limited', quantity: 20, averagePrice: 420 },
            { symbol: 'SBIN', companyName: 'State Bank of India', quantity: 15, averagePrice: 580 },
        ],
    },
    angelone: {
        name: 'Angel One',
        logo: '🔵',
        description: 'Smart investment platform',
        mockHoldings: [
            { symbol: 'ITC', companyName: 'ITC Limited', quantity: 25, averagePrice: 440 },
            { symbol: 'BHARTIARTL', companyName: 'Bharti Airtel Ltd', quantity: 8, averagePrice: 850 },
        ],
    },
};

/**
 * @route   GET /api/broker/available
 * @desc    Get list of available brokers
 */
const getAvailableBrokers = async (req, res) => {
    try {
        const userId = req.user.id;
        const connections = await BrokerConnection.find({ userId });

        const brokers = Object.entries(BROKER_INFO).map(([key, info]) => {
            const connection = connections.find(c => c.broker === key);
            return {
                id: key,
                name: info.name,
                logo: info.logo,
                description: info.description,
                status: connection ? connection.status : 'disconnected',
                connectedAt: connection ? connection.connectedAt : null,
                lastSyncAt: connection ? connection.lastSyncAt : null,
            };
        });

        res.json({ success: true, data: brokers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   POST /api/broker/connect
 * @desc    Simulate OAuth connection to a broker
 */
const connectBroker = async (req, res) => {
    try {
        const userId = req.user.id;
        const { broker } = req.body;

        if (!BROKER_INFO[broker]) {
            return res.status(400).json({ success: false, message: 'Invalid broker' });
        }

        // Generate simulated OAuth token
        const fakeToken = crypto.randomBytes(32).toString('hex');

        const connection = await BrokerConnection.findOneAndUpdate(
            { userId, broker },
            {
                status: 'connected',
                accessToken: fakeToken,
                brokerUserId: `SIM_${broker.toUpperCase()}_${Date.now()}`,
                connectedAt: new Date(),
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            message: `Successfully connected to ${BROKER_INFO[broker].name} (Simulated)`,
            data: {
                broker: connection.broker,
                status: connection.status,
                connectedAt: connection.connectedAt,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   GET /api/broker/status
 * @desc    Get all broker connection statuses
 */
const getConnectionStatus = async (req, res) => {
    try {
        const connections = await BrokerConnection.find({ userId: req.user.id }).select('-accessToken');
        res.json({ success: true, data: connections });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   POST /api/broker/sync
 * @desc    Simulate portfolio import from connected broker
 */
const syncPortfolio = async (req, res) => {
    try {
        const userId = req.user.id;
        const { broker } = req.body;

        const connection = await BrokerConnection.findOne({ userId, broker });
        if (!connection || connection.status !== 'connected') {
            return res.status(400).json({ success: false, message: 'Broker not connected' });
        }

        // Update connection with mock holdings
        const mockHoldings = BROKER_INFO[broker].mockHoldings;
        connection.syncedHoldings = mockHoldings;
        connection.lastSyncAt = new Date();
        connection.status = 'connected';
        await connection.save();

        // Merge mock holdings into user's portfolio
        let portfolio = await Portfolio.findOne({ userId });
        if (!portfolio) {
            portfolio = new Portfolio({ userId, holdings: [] });
        }

        for (const holding of mockHoldings) {
            const existing = portfolio.holdings.find(h => h.symbol === holding.symbol);
            if (existing) {
                // Average up/down
                const totalQty = existing.quantity + holding.quantity;
                existing.averagePrice = ((existing.averagePrice * existing.quantity) + (holding.averagePrice * holding.quantity)) / totalQty;
                existing.quantity = totalQty;
            } else {
                portfolio.holdings.push({
                    symbol: holding.symbol,
                    companyName: holding.companyName,
                    quantity: holding.quantity,
                    averagePrice: holding.averagePrice,
                    currentPrice: holding.averagePrice * (1 + (Math.random() * 0.1 - 0.05)),
                });
            }
        }

        portfolio.totalInvested = portfolio.holdings.reduce((sum, h) => sum + (h.quantity * h.averagePrice), 0);
        portfolio.currentValue = portfolio.holdings.reduce((sum, h) => sum + (h.quantity * (h.currentPrice || h.averagePrice)), 0);
        portfolio.profitLoss = portfolio.currentValue - portfolio.totalInvested;
        portfolio.updatedAt = new Date();
        await portfolio.save();

        res.json({
            success: true,
            message: `Synced ${mockHoldings.length} holdings from ${BROKER_INFO[broker].name}`,
            data: {
                syncedHoldings: mockHoldings,
                portfolioTotal: portfolio.holdings.length,
                lastSyncAt: connection.lastSyncAt,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   DELETE /api/broker/disconnect
 * @desc    Disconnect a broker
 */
const disconnectBroker = async (req, res) => {
    try {
        const { broker } = req.body;
        await BrokerConnection.findOneAndUpdate(
            { userId: req.user.id, broker },
            { status: 'disconnected', accessToken: '', syncedHoldings: [] }
        );
        res.json({ success: true, message: `Disconnected from ${broker}` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getAvailableBrokers, connectBroker, getConnectionStatus, syncPortfolio, disconnectBroker };
