/**
 * Sentiment Controller — Trending stocks, sentiment history, sector sentiment
 */
const SentimentLog = require('../models/SentimentLog');
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// Default Indian stocks for sentiment tracking
const TRACKED_STOCKS = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'WIPRO', 'SBIN', 'ITC', 'LT', 'BHARTIARTL'];

const SECTOR_MAP = {
    'RELIANCE': 'Energy', 'TCS': 'IT', 'INFY': 'IT', 'HDFCBANK': 'Banking',
    'ICICIBANK': 'Banking', 'WIPRO': 'IT', 'SBIN': 'Banking', 'ITC': 'FMCG',
    'LT': 'Infrastructure', 'BHARTIARTL': 'Telecom',
};

/**
 * Generate mock sentiment data for demo purposes
 */
const generateMockSentiment = (symbol) => {
    const score = Math.round((Math.random() * 2 - 1) * 100) / 100;
    const mockSources = [
        { title: `${symbol} Q3 results beat expectations`, source: 'Economic Times', sentiment: score > 0 ? 'positive' : 'negative', score, publishedAt: new Date() },
        { title: `Analysts upgrade ${symbol} target price`, source: 'Moneycontrol', sentiment: score > 0 ? 'positive' : 'neutral', score: Math.abs(score) * 0.8, publishedAt: new Date() },
        { title: `${symbol} announces expansion plans`, source: 'LiveMint', sentiment: 'positive', score: 0.6, publishedAt: new Date() },
    ];
    return {
        overallScore: score,
        label: score > 0.2 ? 'Bullish' : score < -0.2 ? 'Bearish' : 'Neutral',
        newsCount: 3 + Math.floor(Math.random() * 10),
        sources: mockSources,
        socialMentions: Math.floor(Math.random() * 500) + 50,
    };
};

/**
 * @route   GET /api/sentiment/trending
 * @desc    Get stocks trending by sentiment
 */
const getTrending = async (req, res) => {
    try {
        // Try to get from ML service first
        let sentiments = [];
        try {
            const mlResponse = await axios.get(`${ML_SERVICE_URL}/sentiment/trending`, { timeout: 3000 });
            if (mlResponse.data?.success) sentiments = mlResponse.data.data;
        } catch (e) {
            // ML service not available, use mock
        }

        // If no ML data, generate mock sentiment
        if (sentiments.length === 0) {
            sentiments = TRACKED_STOCKS.map(symbol => {
                const mockData = generateMockSentiment(symbol);
                return {
                    symbol,
                    sector: SECTOR_MAP[symbol] || 'Other',
                    ...mockData,
                };
            });

            // Sort by absolute sentiment score (most strongly opinionated first)
            sentiments.sort((a, b) => Math.abs(b.overallScore) - Math.abs(a.overallScore));
        }

        // Log sentiments to DB for history
        for (const s of sentiments.slice(0, 5)) {
            await SentimentLog.findOneAndUpdate(
                { symbol: s.symbol, date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
                {
                    symbol: s.symbol,
                    overallScore: s.overallScore,
                    label: s.label,
                    newsCount: s.newsCount,
                    sources: s.sources,
                    socialMentions: s.socialMentions,
                },
                { upsert: true }
            );
        }

        res.json({
            success: true,
            data: sentiments,
            source: 'mock',
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   GET /api/sentiment/history/:symbol
 * @desc    Get 30-day sentiment trend for a stock
 */
const getSentimentHistory = async (req, res) => {
    try {
        const { symbol } = req.params;
        const { days = 30 } = req.query;
        const since = new Date();
        since.setDate(since.getDate() - parseInt(days));

        let history = await SentimentLog.find({
            symbol: symbol.toUpperCase(),
            date: { $gte: since },
        }).sort({ date: 1 });

        // Generate mock history if none exists
        if (history.length === 0) {
            const generated = [];
            for (let i = parseInt(days); i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(12, 0, 0, 0);

                // Random walk sentiment
                const score = Math.round((Math.sin(i * 0.3) * 0.5 + (Math.random() - 0.5) * 0.4) * 100) / 100;
                generated.push({
                    symbol: symbol.toUpperCase(),
                    date,
                    overallScore: score,
                    label: score > 0.2 ? 'Bullish' : score < -0.2 ? 'Bearish' : 'Neutral',
                    newsCount: Math.floor(Math.random() * 15) + 1,
                    socialMentions: Math.floor(Math.random() * 300) + 20,
                });
            }
            history = await SentimentLog.insertMany(generated);
        }

        // Calculate summary
        const avgScore = history.reduce((s, h) => s + h.overallScore, 0) / history.length;
        const trend = history.length >= 2
            ? history[history.length - 1].overallScore - history[0].overallScore
            : 0;

        res.json({
            success: true,
            data: {
                symbol: symbol.toUpperCase(),
                history,
                summary: {
                    averageScore: Math.round(avgScore * 100) / 100,
                    trend: trend > 0.1 ? 'Improving' : trend < -0.1 ? 'Declining' : 'Stable',
                    currentLabel: history[history.length - 1]?.label || 'N/A',
                    dataPoints: history.length,
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   GET /api/sentiment/sector
 * @desc    Sector-level sentiment aggregation
 */
const getSectorSentiment = async (req, res) => {
    try {
        // Get latest sentiments for all tracked stocks
        const latestSentiments = [];
        for (const symbol of TRACKED_STOCKS) {
            const latest = await SentimentLog.findOne({ symbol }).sort({ date: -1 });
            if (latest) {
                latestSentiments.push(latest);
            } else {
                // Generate mock
                const mock = generateMockSentiment(symbol);
                latestSentiments.push({ symbol, ...mock });
            }
        }

        // Aggregate by sector
        const sectorData = {};
        for (const s of latestSentiments) {
            const sector = SECTOR_MAP[s.symbol] || 'Other';
            if (!sectorData[sector]) {
                sectorData[sector] = { scores: [], stocks: [] };
            }
            sectorData[sector].scores.push(s.overallScore);
            sectorData[sector].stocks.push({ symbol: s.symbol, score: s.overallScore, label: s.label });
        }

        const sectors = Object.entries(sectorData).map(([name, data]) => ({
            sector: name,
            averageScore: Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 100) / 100,
            label: (data.scores.reduce((a, b) => a + b, 0) / data.scores.length) > 0.2 ? 'Bullish'
                : (data.scores.reduce((a, b) => a + b, 0) / data.scores.length) < -0.2 ? 'Bearish' : 'Neutral',
            stockCount: data.stocks.length,
            stocks: data.stocks,
        }));

        sectors.sort((a, b) => b.averageScore - a.averageScore);

        res.json({ success: true, data: sectors });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getTrending, getSentimentHistory, getSectorSentiment };
