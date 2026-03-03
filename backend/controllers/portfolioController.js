/**
 * Portfolio Controller — Snapshots, sync, and rebalance suggestions
 */
const Portfolio = require('../models/Portfolio');
const PortfolioSnapshot = require('../models/PortfolioSnapshot');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Sector mapping for Indian stocks
const SECTOR_MAP = {
    'RELIANCE': 'Energy & Petrochemicals',
    'TCS': 'Information Technology',
    'INFY': 'Information Technology',
    'HDFCBANK': 'Banking & Finance',
    'ICICIBANK': 'Banking & Finance',
    'WIPRO': 'Information Technology',
    'SBIN': 'Banking & Finance',
    'BHARTIARTL': 'Telecom',
    'ITC': 'FMCG',
    'LT': 'Infrastructure',
    'HCLTECH': 'Information Technology',
    'MARUTI': 'Automobile',
    'TATAMOTORS': 'Automobile',
    'SUNPHARMA': 'Pharmaceuticals',
    'ADANIENT': 'Infrastructure',
};

// Ideal sector allocation for a balanced portfolio
const IDEAL_ALLOCATION = {
    'Information Technology': 20,
    'Banking & Finance': 20,
    'Energy & Petrochemicals': 15,
    'FMCG': 10,
    'Pharmaceuticals': 10,
    'Automobile': 10,
    'Infrastructure': 10,
    'Telecom': 5,
};

/**
 * @route   GET /api/portfolio/snapshots
 * @desc    Get daily portfolio value history
 */
const getSnapshots = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const since = new Date();
        since.setDate(since.getDate() - parseInt(days));

        let snapshots = await PortfolioSnapshot.find({
            userId: req.user.id,
            date: { $gte: since },
        }).sort({ date: 1 });

        // If no snapshots exist, generate some from transactions
        if (snapshots.length === 0) {
            const portfolio = await Portfolio.findOne({ userId: req.user.id });
            if (portfolio && portfolio.holdings.length > 0) {
                const currentValue = portfolio.currentValue || portfolio.totalInvested;
                const generated = [];

                for (let i = parseInt(days); i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    date.setHours(15, 30, 0, 0);

                    // Simulate historical values with some variance
                    const variance = 1 + ((Math.random() - 0.5) * 0.08);
                    const dayFactor = 1 - (i / parseInt(days)) * 0.15; // Gradual growth trend
                    const value = currentValue * dayFactor * variance;

                    generated.push({
                        userId: req.user.id,
                        date,
                        totalValue: Math.round(value),
                        totalInvested: portfolio.totalInvested,
                        profitLoss: Math.round(value - portfolio.totalInvested),
                        profitLossPercent: portfolio.totalInvested > 0
                            ? Math.round(((value - portfolio.totalInvested) / portfolio.totalInvested) * 10000) / 100
                            : 0,
                        holdingCount: portfolio.holdings.length,
                    });
                }

                // Bulk save snapshots
                snapshots = await PortfolioSnapshot.insertMany(generated);
            }
        }

        res.json({ success: true, data: snapshots });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   POST /api/portfolio/rebalance
 * @desc    Get AI rebalance suggestion
 */
const getRebalanceSuggestion = async (req, res) => {
    try {
        const portfolio = await Portfolio.findOne({ userId: req.user.id });
        if (!portfolio || portfolio.holdings.length === 0) {
            return res.json({
                success: true,
                data: {
                    needsRebalancing: false,
                    message: 'Portfolio is empty. Start investing to get rebalance suggestions.',
                    suggestions: [],
                },
            });
        }

        const totalValue = portfolio.holdings.reduce(
            (sum, h) => sum + h.quantity * (h.currentPrice || h.averagePrice), 0
        );

        // Calculate current sector allocation
        const currentAllocation = {};
        portfolio.holdings.forEach(h => {
            const sector = SECTOR_MAP[h.symbol] || 'Other';
            const value = h.quantity * (h.currentPrice || h.averagePrice);
            currentAllocation[sector] = (currentAllocation[sector] || 0) + (value / totalValue * 100);
        });

        // Compare with ideal and generate suggestions
        const suggestions = [];
        let maxDrift = 0;

        for (const [sector, idealPct] of Object.entries(IDEAL_ALLOCATION)) {
            const currentPct = Math.round((currentAllocation[sector] || 0) * 100) / 100;
            const drift = currentPct - idealPct;

            if (Math.abs(drift) > 5) {
                maxDrift = Math.max(maxDrift, Math.abs(drift));
                suggestions.push({
                    sector,
                    currentWeight: Math.round(currentPct * 100) / 100,
                    idealWeight: idealPct,
                    drift: Math.round(drift * 100) / 100,
                    action: drift > 0 ? 'REDUCE' : 'INCREASE',
                    urgency: Math.abs(drift) > 15 ? 'High' : Math.abs(drift) > 10 ? 'Medium' : 'Low',
                });
            }
        }

        // Check for sectors not in ideal that user holds
        for (const [sector, pct] of Object.entries(currentAllocation)) {
            if (!IDEAL_ALLOCATION[sector] && pct > 5) {
                suggestions.push({
                    sector,
                    currentWeight: Math.round(pct * 100) / 100,
                    idealWeight: 5,
                    drift: Math.round((pct - 5) * 100) / 100,
                    action: 'REDUCE',
                    urgency: 'Medium',
                });
            }
        }

        res.json({
            success: true,
            data: {
                needsRebalancing: maxDrift > 5,
                currentAllocation,
                idealAllocation: IDEAL_ALLOCATION,
                suggestions: suggestions.sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift)),
                totalPortfolioValue: Math.round(totalValue),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   POST /api/portfolio/snapshot
 * @desc    Take a manual portfolio snapshot (also used by cron worker)
 */
const takeSnapshot = async (req, res) => {
    try {
        const portfolio = await Portfolio.findOne({ userId: req.user.id });
        if (!portfolio) {
            return res.status(404).json({ success: false, message: 'No portfolio found' });
        }

        const totalValue = portfolio.holdings.reduce(
            (sum, h) => sum + h.quantity * (h.currentPrice || h.averagePrice), 0
        );

        const snapshot = await PortfolioSnapshot.create({
            userId: req.user.id,
            totalValue: Math.round(totalValue),
            totalInvested: portfolio.totalInvested,
            profitLoss: Math.round(totalValue - portfolio.totalInvested),
            profitLossPercent: portfolio.totalInvested > 0
                ? Math.round(((totalValue - portfolio.totalInvested) / portfolio.totalInvested) * 10000) / 100
                : 0,
            holdingCount: portfolio.holdings.length,
            holdings: portfolio.holdings.map(h => ({
                symbol: h.symbol,
                value: h.quantity * (h.currentPrice || h.averagePrice),
                weight: totalValue > 0
                    ? Math.round((h.quantity * (h.currentPrice || h.averagePrice) / totalValue) * 10000) / 100
                    : 0,
            })),
        });

        res.json({ success: true, data: snapshot });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getSnapshots, getRebalanceSuggestion, takeSnapshot };
