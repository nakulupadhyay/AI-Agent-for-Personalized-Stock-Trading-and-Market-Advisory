const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');
const RiskProfile = require('../models/RiskProfile');
const riskEngine = require('../utils/riskEngine');
const axios = require('axios');

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

/**
 * @route   GET /api/risk-analysis
 * @desc    Comprehensive quantitative portfolio risk assessment
 * @access  Private
 */
const getRiskAnalysis = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch all data
        const [portfolio, user, transactions, riskProfile] = await Promise.all([
            Portfolio.findOne({ userId }),
            User.findById(userId),
            Transaction.find({ userId }).sort({ timestamp: 1 }),
            RiskProfile.findOne({ userId }),
        ]);

        // Empty portfolio case
        if (!portfolio || portfolio.holdings.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    riskScore: 0,
                    riskCategory: 'N/A',
                    metrics: {
                        volatility: 0,
                        sharpeRatio: 0,
                        maxDrawdown: 0,
                        currentDrawdown: 0,
                        beta: 0,
                        varDaily: 0,
                        varAmount: 0,
                    },
                    diversification: {
                        hhi: 0,
                        sectorConcentration: 0,
                        diversificationRatio: 0,
                    },
                    scoreBreakdown: {
                        volatilityScore: 0,
                        sharpeScore: 0,
                        drawdownScore: 0,
                        varScore: 0,
                    },
                    explanations: ['📊 Start investing to see your portfolio risk analysis.'],
                    userRiskProfile: riskProfile ? riskProfile.calculatedRiskLevel : null,
                    portfolioValues: [],
                    mlPrediction: null,
                    isEmpty: true,
                },
            });
        }

        // Enrich holdings with sector info
        const enrichedHoldings = portfolio.holdings.map(h => ({
            symbol: h.symbol,
            companyName: h.companyName,
            quantity: h.quantity,
            averagePrice: h.averagePrice,
            currentPrice: h.currentPrice,
            sector: SECTOR_MAP[h.symbol] || 'Other',
        }));

        // Run the full quantitative risk analysis
        const analysis = riskEngine.runFullAnalysis({
            holdings: enrichedHoldings,
            transactions: transactions,
        });

        // Attempt ML prediction from Python service (non-blocking)
        let mlPrediction = null;
        try {
            const mlResponse = await axios.post(
                `${process.env.ML_SERVICE_URL || 'http://localhost:5001'}/predict-risk`,
                {
                    volatility: analysis.metrics.volatility,
                    sharpeRatio: analysis.metrics.sharpeRatio,
                    maxDrawdown: analysis.metrics.maxDrawdown,
                    sectorConcentration: analysis.diversification.sectorConcentration,
                    diversificationRatio: analysis.diversification.diversificationRatio,
                    holdingCount: enrichedHoldings.length,
                },
                { timeout: 3000 }
            );
            if (mlResponse.data && mlResponse.data.success) {
                mlPrediction = mlResponse.data.prediction;
            }
        } catch (mlError) {
            // ML service unavailable — that's fine, we have the rule-based score
            console.log('ML risk prediction unavailable (this is optional):', mlError.message);
        }

        // Combine with user's questionnaire risk profile
        const userRiskProfile = riskProfile ? riskProfile.calculatedRiskLevel : null;

        res.status(200).json({
            success: true,
            data: {
                ...analysis,
                userRiskProfile,
                mlPrediction,
                isEmpty: false,
                portfolioSummary: {
                    totalInvested: enrichedHoldings.reduce((s, h) => s + h.quantity * h.averagePrice, 0),
                    currentValue: enrichedHoldings.reduce((s, h) => s + h.quantity * h.currentPrice, 0),
                    holdingCount: enrichedHoldings.length,
                    sectorCount: new Set(enrichedHoldings.map(h => h.sector)).size,
                },
            },
        });
    } catch (error) {
        console.error('Risk analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during risk analysis',
            error: error.message,
        });
    }
};

module.exports = { getRiskAnalysis };
