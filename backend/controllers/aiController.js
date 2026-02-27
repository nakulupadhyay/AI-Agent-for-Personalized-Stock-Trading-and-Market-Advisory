/**
 * AI Controller - Integrates with Python ML Model Service
 * Falls back to mock data if the Python service is unavailable
 */
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Check if the Python ML service is running
 */
const isMLServiceAvailable = async () => {
    try {
        const res = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 2000 });
        return res.status === 200;
    } catch {
        return false;
    }
};

/**
 * @route   POST /api/ai/recommendation
 * @desc    Get AI-powered stock recommendation
 * @access  Private
 */
const getRecommendation = async (req, res) => {
    try {
        const { symbol, currentPrice, sentiment } = req.body;

        if (!symbol || !currentPrice) {
            return res.status(400).json({
                success: false,
                message: 'Please provide symbol and current price',
            });
        }

        // Try Python ML service first
        const mlAvailable = await isMLServiceAvailable();

        if (mlAvailable) {
            try {
                const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict/recommendation`, {
                    symbol,
                    currentPrice,
                    sentimentText: `${symbol} stock market analysis. Current sentiment: ${sentiment || 'neutral'}`,
                    model: 'finbert',
                }, { timeout: 10000 });

                if (mlResponse.data.success) {
                    return res.status(200).json({
                        success: true,
                        data: {
                            symbol,
                            recommendation: mlResponse.data.data.recommendation,
                            confidence: mlResponse.data.data.confidence,
                            reasoning: mlResponse.data.data.reasoning,
                            targetPrice: mlResponse.data.data.targetPrice || currentPrice * 1.05,
                            sentimentBreakdown: mlResponse.data.data.sentimentBreakdown,
                            model: mlResponse.data.data.model,
                            source: 'ai_model',
                            timestamp: new Date().toISOString(),
                        },
                    });
                }
            } catch (mlError) {
                console.warn('ML service call failed, falling back to mock:', mlError.message);
            }
        }

        // Fallback: Mock AI logic
        const priceChange = Math.random() * 10 - 5;
        const sentimentScore = sentiment === 'Positive' ? 0.7 : sentiment === 'Negative' ? 0.3 : 0.5;

        let recommendation;
        let confidence;
        let reasoning;

        const combinedScore = (priceChange > 0 ? 0.6 : 0.4) + sentimentScore * 0.4;

        if (combinedScore > 0.65) {
            recommendation = 'BUY';
            confidence = Math.min(75 + Math.random() * 20, 95);
            reasoning = 'Strong upward trend detected with positive market sentiment';
        } else if (combinedScore < 0.45) {
            recommendation = 'SELL';
            confidence = Math.min(70 + Math.random() * 20, 90);
            reasoning = 'Bearish indicators and negative sentiment analysis';
        } else {
            recommendation = 'HOLD';
            confidence = Math.min(60 + Math.random() * 25, 85);
            reasoning = 'Mixed signals suggest maintaining current position';
        }

        res.status(200).json({
            success: true,
            data: {
                symbol,
                recommendation,
                confidence: Math.round(confidence),
                reasoning,
                targetPrice: currentPrice * (recommendation === 'BUY' ? 1.08 : recommendation === 'SELL' ? 0.92 : 1.02),
                source: 'mock',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Get recommendation error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while generating recommendation',
            error: error.message,
        });
    }
};

/**
 * @route   POST /api/ai/sentiment
 * @desc    Analyze news sentiment for a stock
 * @access  Private
 */
const getSentiment = async (req, res) => {
    try {
        const { symbol, text } = req.body;

        if (!symbol) {
            return res.status(400).json({
                success: false,
                message: 'Please provide stock symbol',
            });
        }

        // Try Python ML service first
        const mlAvailable = await isMLServiceAvailable();

        if (mlAvailable) {
            try {
                const analysisText = text || `${symbol} stock market news and analysis`;
                const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict/sentiment`, {
                    text: analysisText,
                    model: 'finbert',
                }, { timeout: 10000 });

                if (mlResponse.data.success) {
                    const sentimentData = mlResponse.data.data;
                    const sentimentMap = {
                        'positive': 'Positive',
                        'negative': 'Negative',
                        'neutral': 'Neutral',
                    };

                    return res.status(200).json({
                        success: true,
                        data: {
                            symbol,
                            overallSentiment: sentimentMap[sentimentData.label.toLowerCase()] || sentimentData.label,
                            sentimentScore: sentimentData.confidence,
                            probabilities: sentimentData.probabilities,
                            model: sentimentData.model,
                            source: 'ai_model',
                            analysisDate: new Date().toISOString(),
                        },
                    });
                }
            } catch (mlError) {
                console.warn('ML service sentiment call failed, using mock:', mlError.message);
            }
        }

        // Fallback: Mock sentiment analysis
        const sentiments = ['Positive', 'Negative', 'Neutral'];
        const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];

        const sentimentScore = randomSentiment === 'Positive' ?
            (0.6 + Math.random() * 0.4) :
            randomSentiment === 'Negative' ?
                (Math.random() * 0.4) :
                (0.4 + Math.random() * 0.2);

        const mockNews = [
            { headline: `${symbol} reports strong quarterly earnings`, source: 'Economic Times', sentiment: 'Positive' },
            { headline: `Analysts bullish on ${symbol} stock`, source: 'Moneycontrol', sentiment: 'Positive' },
            { headline: `Market volatility affects ${symbol} performance`, source: 'Bloomberg', sentiment: 'Neutral' },
        ];

        res.status(200).json({
            success: true,
            data: {
                symbol,
                overallSentiment: randomSentiment,
                sentimentScore: Math.round(sentimentScore * 100),
                newsArticles: mockNews,
                source: 'mock',
                analysisDate: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Get sentiment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while analyzing sentiment',
            error: error.message,
        });
    }
};

/**
 * @route   POST /api/ai/chat
 * @desc    AI Chat Advisor - Answer stock market queries
 * @access  Private
 */
const chatAdvisor = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a message',
            });
        }

        // Try Python ML service for sentiment-informed response
        const mlAvailable = await isMLServiceAvailable();

        if (mlAvailable) {
            try {
                const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict/sentiment`, {
                    text: message,
                    model: 'finbert',
                }, { timeout: 10000 });

                if (mlResponse.data.success) {
                    const sentiment = mlResponse.data.data;

                    // Generate context-aware response based on sentiment
                    let aiResponse;
                    const label = sentiment.label.toLowerCase();

                    if (label === 'positive') {
                        aiResponse = `Based on my analysis, the sentiment in your query is positive (${sentiment.confidence}% confidence). The market indicators you're referring to show promising trends. However, always consider diversifying your portfolio and setting stop-loss orders to manage risk. Consider the current market cycle and your investment horizon before making decisions.`;
                    } else if (label === 'negative') {
                        aiResponse = `I detect a cautious tone in your query (${sentiment.confidence}% confidence). Market conditions can be challenging, but it's important not to make emotional decisions. Consider reviewing your risk tolerance, and if you're concerned about specific holdings, evaluate their fundamentals rather than short-term price movements. Dollar-cost averaging can help during volatile periods.`;
                    } else {
                        aiResponse = `Your question touches on balanced market dynamics (${sentiment.confidence}% confidence neutral). In such conditions, maintain your investment strategy and focus on fundamentals. Review your portfolio allocation to ensure it aligns with your goals, and consider opportunities in sectors showing relative strength.`;
                    }

                    return res.status(200).json({
                        success: true,
                        data: {
                            userMessage: message,
                            aiResponse,
                            sentimentAnalysis: {
                                label: sentiment.label,
                                confidence: sentiment.confidence,
                            },
                            source: 'ai_model',
                            timestamp: new Date().toISOString(),
                        },
                    });
                }
            } catch (mlError) {
                console.warn('ML chat service failed, using mock:', mlError.message);
            }
        }

        // Fallback: Mock responses
        const responses = [
            "Based on current market trends, diversification is key to managing risk. Consider spreading your investments across different sectors.",
            "The stock you mentioned shows strong fundamentals. However, always conduct thorough research before making investment decisions.",
            "Market volatility is normal. Focus on your long-term investment goals and avoid making emotional decisions during short-term fluctuations.",
            "Technical analysis suggests a bullish trend, but consider the overall market conditions and your risk profile before investing.",
            "For beginners, starting with index funds or blue-chip stocks can be a safer approach while learning the market dynamics.",
        ];

        const randomResponse = responses[Math.floor(Math.random() * responses.length)];

        res.status(200).json({
            success: true,
            data: {
                userMessage: message,
                aiResponse: randomResponse,
                source: 'mock',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Chat advisor error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in chat advisor',
            error: error.message,
        });
    }
};

/**
 * @route   GET /api/ai/ml-status
 * @desc    Check if Python ML service is running
 * @access  Private
 */
const getMLStatus = async (req, res) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 3000 });
        res.status(200).json({
            success: true,
            data: {
                available: true,
                ...response.data,
            },
        });
    } catch (error) {
        res.status(200).json({
            success: true,
            data: {
                available: false,
                message: 'Python ML service is not running. Using mock predictions.',
            },
        });
    }
};

module.exports = { getRecommendation, getSentiment, chatAdvisor, getMLStatus };
